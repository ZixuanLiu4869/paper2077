import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateSharedArchive, sharedGenerationState } from '../lib/shared-generation.mjs';
import { archiveFingerprint } from '../lib/privacy.mjs';

function database(fault = () => false) {
  const sqlite = new DatabaseSync(':memory:');
  for (const name of readdirSync(new URL('../drizzle/', import.meta.url)).filter(n => n.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + name, import.meta.url), 'utf8'));
  const prepare = (sql, args = []) => ({
    bind: (...values) => prepare(sql, values),
    async first() { if (fault(sql)) throw new Error('Simulated database failure'); return sqlite.prepare(sql).get(...args) ?? null; },
    async run() { if (fault(sql)) throw new Error('Simulated database failure'); return sqlite.prepare(sql).run(...args); }
  });
  return { prepare, sqlite };
}
const raw = { paperId: 'testPaper1', lookupQuery: 'A test title' };
const paper = { id: raw.paperId, title: 'A test title', abstract: 'A public research abstract.', url: 'https://openreview.net/forum?id=' + raw.paperId };
const story = { format: 'newspaper', headline: 'A possible future', deck: 'An imagined world.', sections: [1, 2, 3].map(i => ({ heading: 'Scene ' + i, text: 'Fiction.' })), quote: 'A future.', timeline: [2028, 2040, 2077].map(year => ({ year, event: 'A fictional milestone.' })) };
const fingerprint = await archiveFingerprint(raw.paperId);

// Simultaneous visitors share a cross-request SQL claim, not an in-memory lock.
const db = database(); let calls = 0; let lookups = 0; let release; let entered;
const held = new Promise(resolve => { release = resolve; });
const starting = new Promise(resolve => { entered = resolve; });
const dependencies = { lookup: async () => { lookups++; return { papers: [paper] }; }, generate: async () => { calls++; entered(); await held; return { story }; } };
const requests = Array.from({ length: 12 }, () => generateSharedArchive(db, raw, 'test-placeholder', dependencies));
await starting; assert.equal(calls, 1); release();
const outcomes = await Promise.all(requests); assert.equal(calls, 1);
assert.ok(outcomes.every(r => r.status === 200 || r.status === 202));
const saved = await sharedGenerationState(db, fingerprint); assert.equal(saved.status, 200);
assert.equal(db.sqlite.prepare("SELECT COUNT(*) AS n FROM generation_jobs WHERE token LIKE 'v2:%'").get().n, 1);
assert.equal(db.sqlite.prepare('SELECT COUNT(*) AS n FROM archives').get().n, 1);
const lookupsBefore = lookups;
for (let i = 0; i < 4; i++) assert.deepEqual(await generateSharedArchive(db, { ...raw, lookupQuery: 'Edited query' }, undefined, dependencies), saved);
assert.equal(lookups, lookupsBefore); assert.equal(calls, 1);
db.sqlite.close();

// A failed/ambiguous paid request cannot be retried by another click or visitor.
const failed = database(); let failures = 0;
const failureDependencies = { lookup: async () => ({ papers: [paper] }), generate: async () => { failures++; throw new Error('Timeout after a possible charge'); } };
assert.equal((await generateSharedArchive(failed, raw, 'test-placeholder', failureDependencies)).status, 502);
assert.equal((await generateSharedArchive(failed, raw, 'test-placeholder', failureDependencies)).status, 409);
assert.equal(failures, 1); failed.sqlite.close();

// Even if saving the response fails, there must not be a second paid request.
const broken = database(sql => sql.startsWith('INSERT INTO archives')); let generated = 0;
const brokenDependencies = { lookup: async () => ({ papers: [paper] }), generate: async () => { generated++; return { story }; } };
assert.equal((await generateSharedArchive(broken, raw, 'test-placeholder', brokenDependencies)).status, 502);
assert.equal((await generateSharedArchive(broken, raw, 'test-placeholder', brokenDependencies)).status, 409);
assert.equal(generated, 1); broken.sqlite.close();

// Stale locks are not reclaimed automatically: upstream may have billed already.
const stale = database(); stale.sqlite.prepare('INSERT INTO generation_jobs VALUES (?, ?, ?, ?)').run(fingerprint, 'old', 'running', '2020-01-01T00:00:00Z');
assert.equal((await generateSharedArchive(stale, raw, 'test-placeholder', { lookup: () => { throw new Error('Must not look up'); }, generate: () => { throw new Error('Must not pay'); } })).status, 409); stale.sqlite.close();

// Budget exhaustion occurs before the API and releases an unpaid reservation.
for (const scope of ['lifetime', new Date().toISOString().slice(0, 10)]) {
  const capped = database(); capped.sqlite.prepare('INSERT INTO generation_budget VALUES (?, ?)').run(scope, scope === 'lifetime' ? 1000 : 100);
  const outcome = await generateSharedArchive(capped, raw, 'test-placeholder', { lookup: async () => ({ papers: [paper] }), generate: () => { throw new Error('Budget must block API'); } });
  assert.equal(outcome.status, 429); assert.equal(capped.sqlite.prepare('SELECT COUNT(*) AS n FROM generation_jobs').get().n, 0); capped.sqlite.close();
}
console.log('12 concurrent visitors: one model call. Cache before lookup/key, shared status, failed-save/timeout lockout, stale locks and budget safeguards passed. No live API requests.');

// Different papers racing for the last monthly slot cannot overrun the cap.
const monthly = database();
const previousDay = new Date(); previousDay.setUTCDate(Math.max(1, previousDay.getUTCDate() - 1)); previousDay.setUTCHours(0, 0, 0, 0);
for (let i = 0; i < 499; i++) monthly.sqlite.prepare('INSERT INTO generation_jobs VALUES (?, ?, ?, ?)').run('existing-' + i, 'legacy-old-' + i, 'complete', previousDay.toISOString());
// Use a past month-local timestamp even when the test runs on the first day.
const seededDate = new Date().toISOString().slice(0, 7) + '-01T00:00:00.000Z';
monthly.sqlite.prepare('UPDATE generation_jobs SET started_at = ?').run(seededDate);
let monthlyCalls = 0;
const independent = {
  lookup: async query => ({ papers: [{ ...paper, id: query }] }),
  generate: async () => { monthlyCalls++; return { story }; },
};
const race = await Promise.all(Array.from({ length: 20 }, (_, i) => generateSharedArchive(monthly, { paperId: 'paper' + i, lookupQuery: 'paper' + i }, 'placeholder', independent)));
assert.equal(monthlyCalls, 1); assert.equal(race.filter(r => r.status === 200).length, 1);
assert.equal(monthly.sqlite.prepare('SELECT COUNT(*) AS n FROM generation_jobs').get().n, 500);
const cachedMonthly = race.find(r => r.status === 200).body.id;
assert.ok(cachedMonthly); monthly.sqlite.close();

// A full daily allowance cannot burn lifetime or monthly reservations.
const blocked = database(); blocked.sqlite.prepare('INSERT INTO generation_budget VALUES (?, ?)').run(new Date().toISOString().slice(0, 10), 100);
for (let i = 0; i < 20; i++) assert.equal((await generateSharedArchive(blocked, raw, 'placeholder', { ...independent, lookup: async () => ({ papers: [paper] }) })).status, 429);
assert.equal(blocked.sqlite.prepare('SELECT COUNT(*) AS n FROM generation_jobs').get().n, 0);
assert.equal(blocked.sqlite.prepare("SELECT COUNT(*) AS n FROM generation_budget WHERE scope='lifetime'").get().n, 0); blocked.sqlite.close();

// Global burst and concurrency limits work across different paper IDs.
const burst = database(); let burstCalls = 0;
for (let i = 0; i < 11; i++) {
  const item = await generateSharedArchive(burst, { paperId: 'burst' + i, lookupQuery: 'burst' + i }, 'placeholder', { ...independent, generate: async () => { burstCalls++; return { story }; } });
  assert.equal(item.status, i < 10 ? 200 : 429);
}
assert.equal(burstCalls, 10); burst.sqlite.close();
const concurrent = database(); let concurrentCalls = 0; let finish;
const waiting = new Promise(resolve => { finish = resolve; });
let rejected = 0; let allDenied; const denied = new Promise(resolve => { allDenied = resolve; });
const crowd = Array.from({ length: 20 }, (_, i) => generateSharedArchive(concurrent, { paperId: 'crowd' + i, lookupQuery: 'crowd' + i }, 'placeholder', { ...independent, generate: async () => { concurrentCalls++; await waiting; return { story }; } }).then(r => { if (r.status === 429 && ++rejected === 17) allDenied(); return r; }));
// Hold the three admitted calls until every competing claim has been rejected.
await denied; assert.equal(concurrentCalls, 3); finish();
const crowdResults = await Promise.all(crowd); assert.equal(crowdResults.filter(r => r.status === 200).length, 3);
concurrent.sqlite.close();
console.log('Atomic final monthly slot, rejected-request budget conservation, 10/minute burst and 3 concurrent-generation limits passed.');

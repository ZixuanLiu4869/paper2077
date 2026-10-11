import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { takeAllowance, protectRequest, clientBucket } from '../lib/request-guard.mjs';
import { cachedPaperSearch, SEARCH_TTL_MS } from '../lib/search-cache.mjs';
import { PaperLookupError } from '../lib/openreview.mjs';
function database() {
  const sqlite = new DatabaseSync(':memory:');
  for (const file of readdirSync(new URL('../drizzle', import.meta.url)).filter(n => n.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
  const prepare = (sql, args = []) => ({ sql, args, bind: (...values) => prepare(sql, values),
    async first() { return sqlite.prepare(sql).get(...args) ?? null; }, async run() { return sqlite.prepare(sql).run(...args); } });
  return { sqlite, prepare, async batch(statements) {
    sqlite.exec('BEGIN'); try { const results = statements.map(s => ({ results: sqlite.prepare(s.sql).all(...s.args) })); sqlite.exec('COMMIT'); return results; }
    catch (error) { sqlite.exec('ROLLBACK'); throw error; }
  } };
}
const now = Date.parse('2026-10-11T12:00:00Z');
const budget = database();
const admitted = await Promise.all(Array.from({ length: 80 }, (_, i) => takeAllowance(budget, { clientScope: 'client:' + i, clientLimit: 2, globalScope: 'global:search', globalLimit: 10 }, now)));
assert.equal(admitted.filter(Boolean).length, 10); assert.equal(budget.sqlite.prepare("SELECT attempts FROM request_limits WHERE scope='global:search'").get().attempts, 10);
assert.equal(budget.sqlite.prepare('SELECT COUNT(*) AS n FROM request_limits').get().n, 11);
assert.equal(await takeAllowance(budget, { clientScope: 'client:new', clientLimit: 2, globalScope: 'global:search', globalLimit: 10 }, now + 60_000), true);
budget.sqlite.close();
const single = database();
for (let i = 0; i < 8; i++) assert.equal(await takeAllowance(single, { clientScope: 'client:one', clientLimit: 2, globalScope: 'global:one', globalLimit: 100 }, now), i < 2);
assert.equal(single.sqlite.prepare("SELECT attempts FROM request_limits WHERE scope='global:one'").get().attempts, 2);
single.sqlite.close();
const request = new Request('https://paper.example/api/papers?q=A+paper', { headers: { 'x-forwarded-for': 'fake-ip', 'cf-connecting-ip': 'fake-ip' } });
const identity = await clientBucket(request, 'test-secret', now);
assert.equal(identity, await clientBucket(new Request(request.url), 'test-secret', now));
assert.notEqual(identity, await clientBucket(request, 'test-secret', now + 86_400_000));
const edgeRequest = new Request(request.url, { headers: { 'cf-connecting-ip': '192.0.2.1' } }); Object.defineProperty(edgeRequest, 'cf', { value: { colo: 'TEST' } });
assert.notEqual(identity, await clientBucket(edgeRequest, 'test-secret', now));
assert.equal((await protectRequest(request, {}, 'search', now)).status, 503);
const guarded = database();
for (let i = 0; i < 21; i++) { const rejected = await protectRequest(edgeRequest, { DB: guarded, ABUSE_GUARD_SECRET: 'test-secret' }, 'search', now); assert.equal(rejected?.status ?? 200, i < 20 ? 200 : 429); }
assert.equal((await protectRequest(edgeRequest, { DB: guarded, ABUSE_GUARD_SECRET: 'test-secret' }, 'search', now)).headers.get('Retry-After'), '60');
assert.ok(!JSON.stringify(guarded.sqlite.prepare('SELECT * FROM request_limits').all()).includes('192.0.2.1'));
guarded.sqlite.close();
const cache = database(); let calls = 0;
const paper = { id: 'testPaper1', title: 'A paper title', abstract: 'A public research abstract', url: 'https://openreview.net/forum?id=testPaper1' };
const lookup = async () => { calls++; return { papers: [paper], more: false }; };
assert.equal((await cachedPaperSearch(cache, 'A paper title', { lookup, now })).status, 200);
assert.equal((await cachedPaperSearch(cache, 'a   paper title', { lookup, now: now + 1 })).status, 200); assert.equal(calls, 1);
assert.equal((await cachedPaperSearch(cache, 'A paper title', { lookup, now: now + SEARCH_TTL_MS })).status, 200); assert.equal(calls, 2);
assert.equal(cache.sqlite.prepare('SELECT COUNT(*) AS n FROM paper_search_cache').get().n, 1);
cache.sqlite.close();
const concurrent = database(); let release; let entered; let concurrentCalls = 0;
const waiting = new Promise(resolve => { release = resolve; }); const started = new Promise(resolve => { entered = resolve; });
const slow = async () => { concurrentCalls++; entered(); await waiting; return { papers: [paper] }; };
const first = cachedPaperSearch(concurrent, 'A paper title', { lookup: slow, now }); await started;
const competing = await Promise.all(Array.from({ length: 12 }, () => cachedPaperSearch(concurrent, 'A paper title', { lookup: slow, now })));
assert.equal(concurrentCalls, 1); assert.ok(competing.every(r => r.status === 503)); release(); await first;
assert.equal((await cachedPaperSearch(concurrent, 'A paper title', { lookup: slow, now })).status, 200); assert.equal(concurrentCalls, 1); concurrent.sqlite.close();
const absent = database(); let misses = 0;
const missing = async () => { misses++; throw new PaperLookupError('No paper found', 404); };
for (let i = 0; i < 5; i++) assert.equal((await cachedPaperSearch(absent, 'Missing paper', { lookup: missing, now })).status, 404);
assert.equal(misses, 1); absent.sqlite.close();
const throttled = database(); let upstreamCalls = 0;
const limited = async () => { upstreamCalls++; throw new PaperLookupError('Upstream busy', 429); };
assert.equal((await cachedPaperSearch(throttled, 'A paper title', { lookup: limited, now })).status, 429);
assert.equal((await cachedPaperSearch(throttled, 'A different paper', { lookup: limited, now })).status, 429); assert.equal(upstreamCalls, 1);
assert.equal((await cachedPaperSearch(throttled, 'A different paper', { lookup: limited, now })).retryAfter, 60);
throttled.sqlite.close();
const flooded = database(); let outbound = 0;
for (let i = 0; i < 70; i++) {
  const result = await cachedPaperSearch(flooded, 'Research paper ' + i, { lookup: async () => { outbound++; return { papers: [paper] }; }, now });
  assert.equal(result.status, i < 60 ? 200 : 429);
}
assert.equal(outbound, 60);
// Cached results still open when the upstream allowance is exhausted.
assert.equal((await cachedPaperSearch(flooded, 'Research paper 0', { lookup: () => { throw new Error('Must reuse cache'); }, now })).status, 200);
flooded.sqlite.close();
console.log('Cross-client/global atomic caps, daily pseudonyms, spoofed-header rejection, fail-closed protection, cache reuse/expiry, concurrent search coalescing, negative caching, upstream backoff and outbound cap passed. No live API requests.');

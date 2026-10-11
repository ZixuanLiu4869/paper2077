import { archiveFingerprint } from './privacy.mjs';
import { validateInput } from './generation.mjs';

const result = (status, body) => ({ status, body });
export async function sharedGenerationState(db, fingerprint) {
  const cached = await db.prepare('SELECT id FROM archives WHERE fingerprint = ?').bind(fingerprint).first();
  if (cached) return result(200, { id: cached.id, cached: true });
  const job = await db.prepare('SELECT status, started_at FROM generation_jobs WHERE fingerprint = ?').bind(fingerprint).first();
  if (!job) return null;
  if (job.status === 'running' && Date.now() - Date.parse(job.started_at) < 300_000) return result(202, { pending: true });
  return result(409, { error: 'This generation attempt did not finish. A new paid request is blocked to prevent duplicate charges. Please contact the site owner.' });
}

// One durable claim per paper, across visitors and Worker instances. A failed or
// uncertain paid attempt stays blocked until the owner explicitly investigates.
export async function generateSharedArchive(db, raw, key, { lookup, generate }) {
  const fingerprint = await archiveFingerprint(raw.paperId);
  const existing = await sharedGenerationState(db, fingerprint);
  if (existing) return existing;
  if (!key) return result(503, { error: 'Live generation is not connected yet. Saved shared archives remain available.' });
  const found = await lookup(raw.lookupQuery);
  const paper = found.papers.find(p => p.id === raw.paperId);
  if (!paper) return result(400, { error: 'This paper is no longer in the search results. Please find it again.' });
  const input = validateInput({ title: paper.title, abstract: 'Submitted to ICLR 2027. ' + paper.abstract.slice(0, 5950), format: 'auto' });
  const token = crypto.randomUUID();
  const claimed = await db.prepare('INSERT INTO generation_jobs (fingerprint, token, status, started_at) VALUES (?, ?, ?, ?) ON CONFLICT(fingerprint) DO NOTHING RETURNING token')
    .bind(fingerprint, token, 'running', new Date().toISOString()).first();
  if (!claimed) return await sharedGenerationState(db, fingerprint) ?? result(202, { pending: true });
  const release = () => db.prepare('DELETE FROM generation_jobs WHERE fingerprint = ? AND token = ?').bind(fingerprint, token).run();
  try {
    // Covers a result saved by a previous deployment during the lookup/claim.
    const cached = await db.prepare('SELECT id FROM archives WHERE fingerprint = ?').bind(fingerprint).first();
    if (cached) return result(200, { id: cached.id, cached: true });
    const lifetime = await db.prepare("INSERT INTO generation_budget (scope, attempts) VALUES ('lifetime', 1) ON CONFLICT(scope) DO UPDATE SET attempts = attempts + 1 WHERE attempts < 1000 RETURNING attempts").first();
    if (!lifetime) { await release(); return result(429, { error: 'This trial has reached its generation limit. Saved archives are still available.' }); }
    const today = new Date().toISOString().slice(0, 10);
    const daily = await db.prepare('INSERT INTO generation_budget (scope, attempts) VALUES (?, 1) ON CONFLICT(scope) DO UPDATE SET attempts = attempts + 1 WHERE attempts < 100 RETURNING attempts').bind(today).first();
    if (!daily) { await release(); return result(429, { error: 'Today’s time-travel slots are full. Saved archives still open.' }); }
    const { story } = await generate(input, key);
    const id = crypto.randomUUID();
    await db.prepare('INSERT INTO archives (id, fingerprint, title, format, story, created_at) VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(fingerprint) DO NOTHING')
      .bind(id, fingerprint, input.title, story.format, JSON.stringify({ ...story, sourceURL: paper.url, sourceYear: 2027 }), new Date().toISOString()).run();
    const saved = await db.prepare('SELECT id FROM archives WHERE fingerprint = ?').bind(fingerprint).first();
    if (!saved) throw new Error('Archive persistence failed.');
    // A saved archive takes precedence over job state; an update failure cannot
    // cause a repeat API call, even if the client loses this response.
    try { await db.prepare('UPDATE generation_jobs SET status = ? WHERE fingerprint = ? AND token = ?').bind('complete', fingerprint, token).run(); } catch {}
    return result(200, { id: saved.id, cached: false });
  } catch {
    try { await db.prepare('UPDATE generation_jobs SET status = ? WHERE fingerprint = ? AND token = ?').bind('failed', fingerprint, token).run(); } catch {}
    return result(502, { error: 'This generation attempt did not finish. Automatic retries are disabled to avoid duplicate charges. Please contact the site owner.' });
  }
}

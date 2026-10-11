import { archiveFingerprint } from './privacy.mjs';
import { validateInput } from './generation.mjs';

const result = (status, body) => ({ status, body });
// Reserve $0.02 per attempt, without refunding failures, for a conservative $10
// monthly application allowance. This is not an OpenAI billing meter; configure
// the dedicated project's actual hard spend limit separately. Recheck pricing
// before increasing these limits or changing the model/input/output bounds.
export const MONTHLY_ALLOWANCE_USD = 10;
export const RESERVED_ATTEMPT_USD = 0.02;
export const MONTHLY_ATTEMPTS = Math.floor(MONTHLY_ALLOWANCE_USD / RESERVED_ATTEMPT_USD);
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
  const now = new Date().toISOString(); const today = now.slice(0, 10); const month = now.slice(0, 7);
  const token = 'v2:' + crypto.randomUUID();
  // One SQL statement atomically reserves every allowance across Workers. Old
  // generation_budget counters remain in force, without counting old jobs twice.
  // Rejected requests cannot consume a different allowance or burn lifetime slots.
  const claimed = await db.prepare(`INSERT INTO generation_jobs (fingerprint, token, status, started_at)
    SELECT ?, ?, 'running', ? WHERE
      (SELECT COUNT(*) FROM generation_jobs WHERE token LIKE 'v2:%') + COALESCE((SELECT attempts FROM generation_budget WHERE scope = 'lifetime'), 0) < 1000
      AND (SELECT COUNT(*) FROM generation_jobs WHERE token LIKE 'v2:%' AND started_at >= ?) + COALESCE((SELECT attempts FROM generation_budget WHERE scope = ?), 0) < 100
      AND (SELECT COUNT(*) FROM generation_jobs WHERE started_at >= ?) < ?
      AND (SELECT COUNT(*) FROM generation_jobs WHERE started_at >= ?) < 10
      AND (SELECT COUNT(*) FROM generation_jobs WHERE status = 'running' AND started_at >= ?) < 3
    ON CONFLICT(fingerprint) DO NOTHING RETURNING token`)
    .bind(fingerprint, token, now, today, today, month, MONTHLY_ATTEMPTS, new Date(Date.now() - 60_000).toISOString(), new Date(Date.now() - 300_000).toISOString()).first();
  if (!claimed) return await sharedGenerationState(db, fingerprint) ?? result(429, { error: 'The time machine has reached its current capacity or allowance. Saved futures still open; please try again later.' });
  try {
    // Covers a result saved by a previous deployment during the lookup/claim.
    const cached = await db.prepare('SELECT id FROM archives WHERE fingerprint = ?').bind(fingerprint).first();
    if (cached) return result(200, { id: cached.id, cached: true });
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

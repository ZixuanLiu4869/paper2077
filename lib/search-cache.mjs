import { parsePaperQuery, lookupPapers, PaperLookupError } from './openreview.mjs';
import { takeAllowance } from './request-guard.mjs';
export const SEARCH_TTL_MS = 600_000;
const cachedResponse = row => row?.payload ? { status: row.status, body: JSON.parse(row.payload), retryAfter: row.status === 429 ? 60 : undefined } : null;
export async function cachedPaperSearch(db, raw, { lookup = lookupPapers, now = Date.now() } = {}) {
  const query = parsePaperQuery(raw).value.replace(/\s+/g, ' ').normalize('NFC');
  // Query keys are hashes; raw searches and visitor identities are not stored.
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ICLR2027/title/v1/' + query.toLowerCase()));
  const key = Array.from(new Uint8Array(bytes), v => v.toString(16).padStart(2, '0')).join('');
  const read = () => db.prepare('SELECT payload, status, expires_at FROM paper_search_cache WHERE key = ?').bind(key).first();
  const cached = await read(); if (cached?.expires_at > now) return cachedResponse(cached);
  const token = crypto.randomUUID();
  // Durable lease prevents simultaneous title searches from multiplying API calls.
  const lease = await db.prepare(`INSERT INTO paper_search_cache (key, expires_at, lease_until, lease_token)
    SELECT ?, 0, ?, ? WHERE EXISTS (SELECT 1 FROM paper_search_cache WHERE key = ?) OR (SELECT COUNT(*) FROM paper_search_cache) < 4096
    ON CONFLICT(key) DO UPDATE SET lease_until = excluded.lease_until, lease_token = excluded.lease_token
    WHERE paper_search_cache.expires_at <= ? AND paper_search_cache.lease_until <= ? RETURNING key`)
    .bind(key, now + 30_000, token, key, now, now).first();
  if (!lease) {
    const ready = await read(); if (ready?.expires_at > now) return cachedResponse(ready);
    await db.prepare('DELETE FROM paper_search_cache WHERE key IN (SELECT key FROM paper_search_cache WHERE expires_at <= ? AND lease_until <= ? LIMIT 100)').bind(now, now).run();
    return { status: 503, body: { error: 'This search is busy. Please wait a moment and try again.' }, retryAfter: 3 };
  }
  let outcome;
  try {
    const backoff = await db.prepare('SELECT expires_at FROM request_limits WHERE scope = ?').bind('openreview:backoff').first();
    if (backoff?.expires_at > now || !await takeAllowance(db, { clientScope: 'openreview:minute', clientLimit: 60, globalScope: 'openreview:day', globalLimit: 3000, globalWindow: 86_400_000 }, now)) {
      outcome = { status: 429, body: { error: 'Paper search is busy. Please wait a minute and try again.' }, retryAfter: 60 };
    } else outcome = { status: 200, body: await lookup(query) };
  } catch (error) {
    if (!(error instanceof PaperLookupError)) throw error;
    outcome = { status: error.status, body: { error: error.message }, retryAfter: error.status === 429 ? 60 : undefined };
    if (error.status === 429 || error.status === 502) await db.prepare(`INSERT INTO request_limits (scope, attempts, expires_at, token) VALUES (?, 1, ?, ?)
      ON CONFLICT(scope) DO UPDATE SET expires_at = excluded.expires_at`).bind('openreview:backoff', now + 30_000, token).run();
  }
  const ttl = outcome.status === 200 ? SEARCH_TTL_MS : outcome.status === 404 ? 60_000 : 30_000;
  await db.prepare('UPDATE paper_search_cache SET payload = ?, status = ?, expires_at = ?, lease_until = 0, lease_token = NULL WHERE key = ? AND lease_token = ?')
    .bind(JSON.stringify(outcome.body), outcome.status, now + ttl, key, token).run();
  if (Math.random() < .05) await db.prepare('DELETE FROM paper_search_cache WHERE key IN (SELECT key FROM paper_search_cache WHERE expires_at <= ? AND lease_until <= ? LIMIT 100)').bind(now, now).run();
  return outcome;
}
export async function lookupCachedPapers(db, raw) {
  const outcome = await cachedPaperSearch(db, raw);
  if (outcome.status !== 200) throw new PaperLookupError(outcome.body.error, outcome.status);
  return outcome.body;
}

// Durable counters supplement hosting traffic protection; these are not a CAPTCHA.
export const REQUEST_LIMITS = {
  search: { client: 20, global: 240 }, generate: { client: 6, global: 60 },
  status: { client: 120, global: 1200 }, archive: { client: 120, global: 1200 },
};
const encoder = new TextEncoder();
export async function clientBucket(request, secret, now = Date.now()) {
  if (!secret) throw new Error('Request protection is unavailable.');
  // Only Cloudflare edge metadata, never X-Forwarded-For or browser identifiers.
  const ip = request.cf ? request.headers.get('cf-connecting-ip') : null;
  const source = ip && ip.length <= 64 ? ip : 'unknown-edge-client';
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(new Date(now).toISOString().slice(0, 10) + '/' + source));
  return Array.from(new Uint8Array(signature), v => v.toString(16).padStart(2, '0')).join('');
}
export async function takeAllowance(db, { clientScope, clientLimit, globalScope, globalLimit, clientWindow = 60_000, globalWindow = 60_000 }, now = Date.now()) {
  const token = crypto.randomUUID();
  // D1 batch is a transaction. Client rejection cannot advance the global counter;
  // racing clients cannot exceed its cap. Pseudonymous rows are bounded to 4096.
  const client = db.prepare(`INSERT INTO request_limits (scope, attempts, expires_at, token)
    SELECT ?, 1, ?, ? WHERE
      NOT EXISTS (SELECT 1 FROM request_limits WHERE scope = ? AND expires_at > ? AND attempts >= ?)
      AND (EXISTS (SELECT 1 FROM request_limits WHERE scope = ?) OR (SELECT COUNT(*) FROM request_limits) < 4096)
    ON CONFLICT(scope) DO UPDATE SET
      attempts = CASE WHEN request_limits.expires_at <= ? THEN 1 ELSE request_limits.attempts + 1 END,
      expires_at = CASE WHEN request_limits.expires_at <= ? THEN excluded.expires_at ELSE request_limits.expires_at END,
      token = excluded.token
    WHERE request_limits.expires_at <= ? OR request_limits.attempts < ? RETURNING token`)
    .bind(clientScope, now + clientWindow, token, globalScope, now, globalLimit, clientScope, now, now, now, clientLimit);
  const global = db.prepare(`INSERT INTO request_limits (scope, attempts, expires_at, token)
    SELECT ?, 1, ?, ? WHERE EXISTS (SELECT 1 FROM request_limits WHERE scope = ? AND token = ?)
    ON CONFLICT(scope) DO UPDATE SET
      attempts = CASE WHEN request_limits.expires_at <= ? THEN 1 ELSE request_limits.attempts + 1 END,
      expires_at = CASE WHEN request_limits.expires_at <= ? THEN excluded.expires_at ELSE request_limits.expires_at END,
      token = excluded.token
    WHERE request_limits.expires_at <= ? OR request_limits.attempts < ? RETURNING token`)
    .bind(globalScope, now + globalWindow, token, clientScope, token, now, now, now, globalLimit);
  const result = await db.batch([client, global]);
  return result.every(item => item.results?.[0]?.token === token);
}
const deniedUntil = new Map();
export async function protectRequest(request, settings, kind, now = Date.now()) {
  const unavailable = () => Response.json({ error: 'The time machine is temporarily unavailable. Please try again later.' }, { status: 503, headers: { 'Cache-Control': 'no-store', 'Retry-After': '30' } });
  if (!settings.DB || !settings.ABUSE_GUARD_SECRET) return unavailable();
  try {
    const scope = 'client:' + kind + ':' + await clientBucket(request, settings.ABUSE_GUARD_SECRET, now);
    const busy = () => Response.json({ error: 'Too many requests. Please wait a minute and try again.' }, { status: 429, headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' } });
    // Process-local cooldown saves work; durable SQL enforces all real limits.
    if ((deniedUntil.get(scope) ?? 0) > now || (deniedUntil.get('global:' + kind) ?? 0) > now) return busy();
    const limits = REQUEST_LIMITS[kind]; if (!limits) throw new Error('Unknown request category.');
    const admitted = await takeAllowance(settings.DB, { clientScope: scope, clientLimit: limits.client, globalScope: 'global:' + kind, globalLimit: limits.global }, now);
    if (!admitted) {
      if (deniedUntil.size >= 4096) deniedUntil.clear();
      deniedUntil.set(scope, now + 15_000);
      const global = await settings.DB.prepare('SELECT attempts, expires_at FROM request_limits WHERE scope = ?').bind('global:' + kind).first();
      if (global?.expires_at > now && global.attempts >= limits.global) deniedUntil.set('global:' + kind, Math.min(global.expires_at, now + 15_000));
      await settings.DB.prepare('DELETE FROM request_limits WHERE scope IN (SELECT scope FROM request_limits WHERE expires_at <= ? LIMIT 100)').bind(now).run();
      return busy();
    }
    if (Math.random() < .02) await settings.DB.prepare('DELETE FROM request_limits WHERE scope IN (SELECT scope FROM request_limits WHERE expires_at <= ? LIMIT 100)').bind(now).run();
    return null;
  } catch { return unavailable(); }
}

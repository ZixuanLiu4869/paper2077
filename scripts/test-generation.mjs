import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { generateStory, expandStory, validateInput, validateStory, MODEL, MAX_OUTPUT_TOKENS } from '../lib/generation.mjs';
const sample = { format: 'museum', headline: 'The robot that knew when to ask', deck: 'An imagined exhibit.', sections: [1, 2, 3].map(i => ({ heading: 'Chapter ' + i, text: 'A possible future.' })), quote: 'A question changed everything.', timeline: [2030, 2050, 2077].map(year => ({ year, event: 'A fictional milestone.' })) };
const input = validateInput({ title: 'A research paper', format: 'museum' }); assert.equal(input.abstract, '');
for (const invalid of [null, [], { title: 'x' }, { title: 'x'.repeat(301) }, { title: 'A valid title', abstract: 'x'.repeat(6001) }, { title: 'A valid title', format: 'unknown' }]) assert.throws(() => validateInput(invalid));
assert.equal(validateStory(sample), sample); assert.throws(() => validateStory({ ...sample, sections: [] }));
assert.throws(() => validateStory({ ...sample, timeline: [{ year: 2077, event: 'Future' }, { year: 2040, event: 'Earlier' }, { year: 2080, event: 'Too late' }] }));
const completed = { status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify(sample) }] }], usage: { input_tokens: 1, output_tokens: 1 } };
const result = await generateStory(input, 'unit-test-placeholder', async (url, options) => {
  assert.equal(url, 'https://api.openai.com/v1/responses'); const body = JSON.parse(options.body); assert.equal(body.model, MODEL); assert.equal(body.reasoning.effort, 'none'); assert.equal(body.max_output_tokens, MAX_OUTPUT_TOKENS); assert.equal(body.store, false); assert.equal(body.text.format.strict, true); return Response.json(completed);
}); assert.deepEqual(result.story, sample);
const expanded = await expandStory({ ...input, format: 'auto' }, sample, 'unit-test-placeholder', async (_url, options) => {
  const body = JSON.parse(options.body); const supplied = JSON.parse(body.input);
  assert.deepEqual(supplied.approvedDraft, sample); assert.equal(supplied.format, sample.format);
  assert.equal(body.model, MODEL); assert.equal(body.store, false);
  return Response.json(completed);
}); assert.deepEqual(expanded.story, sample);
await assert.rejects(expandStory(input, { ...sample, sections: [] }, 'unit-test-placeholder', async () => { throw new Error('Invalid draft must not be sent.'); }), /incomplete/);
for (const bad of [{ status: 'incomplete', output: [] }, { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] }, { status: 'completed', output: [{ content: [{ type: 'output_text', text: '<script>invalid</script>' }] }] }]) await assert.rejects(generateStory(input, 'unit-test-placeholder', async () => Response.json(bad)));
await assert.rejects(generateStory(input, 'unit-test-placeholder', async () => Response.json({ secret: 'not disclosed' }, { status: 429 })), /busy/);
await assert.rejects(generateStory(input, 'unit-test-placeholder', async () => Response.json({ ...completed, output: [{ content: [{ type: 'output_text', text: JSON.stringify({ ...sample, format: 'newspaper' }) }] }] })), /requested format/);
const db = new DatabaseSync(':memory:'); db.exec(readFileSync(new URL('../drizzle/0000_ancient_tana_nile.sql', import.meta.url), 'utf8'));
const reserve = db.prepare("INSERT INTO generation_budget(scope, attempts) VALUES ('test', 1) ON CONFLICT(scope) DO UPDATE SET attempts = attempts + 1 WHERE attempts < 3 RETURNING attempts");
assert.equal(reserve.get().attempts, 1); assert.equal(reserve.get().attempts, 2); assert.equal(reserve.get().attempts, 3); assert.equal(reserve.get(), undefined);
const insert = db.prepare('INSERT INTO archives VALUES (?, ?, ?, ?, ?, ?) ON CONFLICT(fingerprint) DO NOTHING'); insert.run('first', 'same-input', 'Title', 'museum', JSON.stringify(sample), '2026-10-10'); insert.run('second', 'same-input', 'Title', 'museum', JSON.stringify(sample), '2026-10-10');
assert.equal(db.prepare('SELECT COUNT(*) AS n FROM archives').get().n, 1); assert.equal(db.prepare('SELECT id FROM archives WHERE fingerprint = ?').get('same-input').id, 'first'); db.close();
console.log('Generation validation, error handling, model/token settings, durable budget cap, and duplicate archive storage passed. No live API requests.');

import assert from 'node:assert/strict';
import { lookupPapers, parsePaperQuery, publicPaper, VENUE } from '../lib/openreview.mjs';
const note = { id: 'VHG99kduPQ', forum: 'VHG99kduPQ', number: 55161, readers: ['everyone'], invitations: [VENUE + '/-/Submission'], content: { title: { value: 'A public paper title' }, abstract: { value: 'The actual abstract from OpenReview.' }, venueid: { value: VENUE + '/Submission' } } };
assert.equal(parsePaperQuery('Robust Optimization').kind, 'title');
for (const query of ['', 'AI', 'x'.repeat(301), 'https://evil.test/forum?id=VHG99kduPQ', 'https://openreview.net/forum?id=VHG99kduPQ', 'Paper #55161', '55161']) assert.throws(() => parsePaperQuery(query));
assert.equal(publicPaper(note).abstract, note.content.abstract.value);
for (const other of [{ ...note, invitations: ['ICLR.cc/2026/Conference/-/Submission'] }, { ...note, content: { ...note.content, venueid: { value: 'ICLR.cc/2027/Workshop/Test' } } }, { ...note, readers: ['private-group'] }, { ...note, forum: 'anotherPaper' }, { ...note, content: { ...note.content, abstract: { value: '' } } }, { ...note, ddate: 1 }]) assert.equal(publicPaper(other), null);
const found = await lookupPapers('A public paper title', async url => {
  const request = new URL(url); assert.equal(request.origin, 'https://api2.openreview.net'); assert.equal(request.pathname, '/notes/search');
  assert.equal(request.searchParams.get('invitation'), VENUE + '/-/Submission'); assert.equal(request.searchParams.get('source'), 'forum'); assert.equal(request.searchParams.get('limit'), '8');
  return Response.json({ notes: [note, { ...note, readers: ['private-group'] }], count: 20 });
}); assert.equal(found.papers.length, 1); assert.equal(found.more, true);
await assert.rejects(lookupPapers('Robust Optimization', async () => Response.json({ notes: [{ ...note, invitations: ['ICLR.cc/2026/Conference/-/Submission'] }] })), /No public ICLR 2027/);
await assert.rejects(lookupPapers('Robust Optimization', async () => Response.json({ name: 'ChallengeRequiredError' }, { status: 403 })), /verification/);
await assert.rejects(lookupPapers('Robust Optimization', async () => { throw new Error('Network issue'); }), /did not respond/);
await assert.rejects(lookupPapers('Robust Optimization', async () => Response.json({}, { status: 429 })), /busy/);
console.log('OpenReview venue/public-access filtering, safe inputs, source abstracts, bounded search and upstream failure handling passed.');

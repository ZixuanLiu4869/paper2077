import { anonymousResearchText } from './privacy.mjs';
export const VENUE = 'ICLR.cc/2027/Conference';
const SUBMISSION = VENUE + '/-/Submission';
export class PaperLookupError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function parsePaperQuery(raw) {
  const query = typeof raw === 'string' ? raw.trim() : '';
  if (!query || query.length > 300) throw new PaperLookupError('Enter an ICLR 2027 paper title, up to 300 characters.');
  if (/^https?:\/\//i.test(query) || /^(?:paper\s*)?#?\s*\d+$/i.test(query)) throw new PaperLookupError('Search using the paper title, rather than a link or submission number.');
  if (query.length < 4) throw new PaperLookupError('Use at least four characters from the paper title.');
  return { kind: 'title', value: query, query };
}
const value = field => typeof field === 'string' ? field : field?.value;
export function publicPaper(note) {
  const invitations = [...(Array.isArray(note?.invitations) ? note.invitations : []), note?.invitation];
  const venue = value(note?.content?.venueid);
  if (!invitations.includes(SUBMISSION) || !note?.readers?.includes('everyone') || (note.forum && note.forum !== note.id)
    || typeof venue !== 'string' || !(venue === VENUE || venue.startsWith(VENUE + '/')) || note.ddate) return null;
  const title = value(note.content.title); const abstract = value(note.content.abstract);
  if (typeof title !== 'string' || !title.trim() || typeof abstract !== 'string' || !abstract.trim() || !/^[A-Za-z0-9_-]{5,80}$/.test(note.id)) return null;
  return { id: note.id, number: note.number ?? null, title: anonymousResearchText(title.trim()), abstract: anonymousResearchText(abstract.trim()), url: 'https://openreview.net/forum?id=' + note.id, year: 2027 };
}
export async function lookupPapers(raw, fetcher = fetch) {
  const query = parsePaperQuery(raw);
  const url = new URL('https://api2.openreview.net/notes/search');
  url.search = new URLSearchParams({ term: query.value, content: 'title', type: 'terms', invitation: SUBMISSION, source: 'forum', limit: '8' }).toString();
  let response;
  try { response = await fetcher(url.toString(), { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(20_000) }); }
  catch { throw new PaperLookupError('OpenReview did not respond in time. Please try again.', 502); }
  if (!response.ok) {
    if (response.status === 403) throw new PaperLookupError('OpenReview is requiring verification right now. Please try again later.', 502);
    if (response.status === 429) throw new PaperLookupError('OpenReview is busy. Please wait a moment and try again.', 429);
    if (response.status === 404) throw new PaperLookupError('No public ICLR 2027 submission was found. Check the title or paper link.', 404);
    throw new PaperLookupError('OpenReview is temporarily unavailable. Please try again.', 502);
  }
  let result; try { result = await response.json(); } catch { throw new PaperLookupError('OpenReview returned an unreadable response. Please try again.', 502); }
  if (!Array.isArray(result.notes)) throw new PaperLookupError('OpenReview returned an incomplete response. Please try again.', 502);
  const papers = result.notes.map(publicPaper).filter(Boolean);
  if (!papers.length) throw new PaperLookupError('No public ICLR 2027 papers with an abstract matched. Try more words from the title.', 404);
  return { papers, more: typeof result.count === 'number' && result.count > result.notes.length };
}

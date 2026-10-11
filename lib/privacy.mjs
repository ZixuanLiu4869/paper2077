const contactPattern = /(?:https?:\/\/|www\.)\S+|\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b|@[A-Z0-9_]{2,}|\b\d{4}-\d{4}-\d{4}-[\dX]{4}\b/gi;
export function anonymousResearchText(text) {
  return String(text).replace(contactPattern, '[link or contact omitted]');
}
export function assertAnonymousStory(story) {
  const text = [story.headline, story.deck, story.quote, ...story.sections.flatMap(s => [s.heading, s.text]), ...story.timeline.map(t => t.event)].join('\n');
  contactPattern.lastIndex = 0;
  const contact = contactPattern.test(text); contactPattern.lastIndex = 0;
  if (contact || /\b(?:my|our|your)\s+(?:paper|submission)\b|\b(?:paper|research)\s+(?:authors?\s+(?:is|are|include)|by\s+[A-Z])|\b(?:i|we)\s+(?:authored|submitted)\b/i.test(text)) throw new Error('This story did not pass the anonymous-sharing check. Please try again.');
  return story;
}
export async function archiveFingerprint(paperId) {
  if (!/^[A-Za-z0-9_-]{5,80}$/.test(paperId)) throw new Error('Select a valid public paper.');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('ICLR2027/shared-future/' + paperId));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
}
export function publicStory(story) {
  assertAnonymousStory(story);
  return { format: story.format, headline: story.headline, deck: story.deck, quote: story.quote,
    sections: story.sections.map(s => ({ heading: s.heading, text: s.text })),
    timeline: story.timeline.map(t => ({ year: t.year, event: t.event })) };
}

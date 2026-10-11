"use client";
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Download, Link2, Printer, Orbit, Check, ArrowDown, X } from 'lucide-react';
import type { Archive } from '@/lib/types';
import { OrbitArt } from './orbit-art';
import { SiteFooter } from './site-footer';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { drawShareCard, INVITATION_URL } from '@/lib/share-card.mjs';
export default function ArchiveView({ archive }: { archive: Archive }) {
  const { story } = archive; const [notice, setNotice] = useState<{ message: string } | null>(null); const [copied, setCopied] = useState(false); const [shareURL, setShareURL] = useState('');
  const [poster, setPoster] = useState<{ url: string; blob: Blob } | null>(null); const [creatingPoster, setCreatingPoster] = useState(false);
  useEffect(() => () => { if (poster) URL.revokeObjectURL(poster.url); }, [poster]);
  useEffect(() => {
    if (!notice) return;
    const timer = window.setTimeout(() => setNotice(null), 4500);
    return () => window.clearTimeout(timer);
  }, [notice]);
  function showNotice(message: string) { setNotice({ message }); }
  const dark = story.format === 'museum' || story.format === 'documentary';
  async function share() { const url = INVITATION_URL; setShareURL(url); try { await Promise.race([navigator.clipboard.writeText(url), new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard unavailable')), 1500))]); setCopied(true); showNotice('Website link copied.'); setTimeout(() => setCopied(false), 3000); } catch { showNotice('Select and copy the website link below.'); } }
  async function createPoster() {
    if (creatingPoster) return; setCreatingPoster(true);
    try {
      const logo = await new Promise<HTMLImageElement>((resolve, reject) => {
        const image = new Image(); image.onload = () => resolve(image); image.onerror = () => reject(new Error('Sponsor logo unavailable'));
        image.src = '/detectium-logo.webp';
      });
      const canvas = drawShareCard(document.createElement('canvas'), logo) as HTMLCanvasElement;
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(value => value ? resolve(value) : reject(new Error('Image export failed')), 'image/png'));
      setPoster({ url: URL.createObjectURL(blob), blob });
    } catch { showNotice('The share image could not be prepared. Please try again.'); }
    finally { setCreatingPoster(false); }
  }
  function downloadPoster() {
    if (!poster) return;
    const link = document.createElement('a'); link.download = 'paper-2077-invitation.png'; link.href = poster.url; document.body.appendChild(link); link.click(); link.remove();
    showNotice('Image download requested. You can also save the preview image.');
  }
  return <div className={'archive-shell ' + (dark ? 'dark-shell' : '')}>
    <header className="site-header"><a className="brand" href="/"><Orbit size={23} strokeWidth={1.5} /><span>Paper <b>2077</b></span></a><a className="text-link" href="/"><ArrowLeft size={15} />Back to 2027</a></header>
    <div className="archive-toolbar"><span className="eyebrow">{archive.example ? archive.id === 'example' ? 'LUNA-IMAGINED SAMPLE' : 'AN IMAGINED FUTURE' : 'SHARED FUTURE ARCHIVE'}</span><div><button onClick={share} className="button subtle">{copied ? <Check size={15} /> : <Link2 size={15} />}Copy website link</button><button onClick={createPoster} disabled={creatingPoster} className="button subtle"><Download size={15} />{creatingPoster ? 'Preparing image…' : 'Share image'}</button><button onClick={() => window.print()} className="button subtle"><Printer size={15} />Print / PDF</button></div></div>
    <Dialog open={poster !== null} onOpenChange={open => { if (!open) setPoster(null); }}><DialogContent className="share-dialog"><DialogTitle>Invite someone to 2077</DialogTitle><DialogDescription>A paper. A very different future. Come take a little trip.</DialogDescription>{poster && <img src={poster.url} alt="Paper 2077 website invitation" className="share-card-preview" />}<button type="button" className="button primary" onClick={downloadPoster}><Download size={16} />Download PNG</button></DialogContent></Dialog>
    {notice && <div className="toast"><span role="status">{notice.message}</span><button type="button" className="toast-dismiss" aria-label="Dismiss notification" onClick={() => setNotice(null)}><X size={16} /></button></div>}
    {shareURL && <div className="archive-share"><label htmlFor="share-url">Website link</label><input id="share-url" readOnly value={shareURL} onFocus={event => event.target.select()} /></div>}
    <article className={'archive-document ' + story.format}>
      <div className="artifact-edition"><span>Paper 2077 / FUTURE ARCHIVES</span><span>FICTIONAL · 2077</span></div>
      {story.format === 'newspaper' && <><header className="dispatch-masthead"><span className="dispatch-symbol" aria-hidden="true">↗</span><div><p>A DISPATCH FROM TOMORROW</p><strong>The 2077 Dispatch</strong></div><span className="dispatch-date">DECEMBER<br /><b>16</b><br />2077</span></header><div className="dispatch-lead"><div className="article-category">SCIENCE / EVERYDAY LIFE</div><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p><div className="dispatch-byline">From the imagined future desk <span>Paper 2077</span></div></div></>}
      {story.format === 'encyclopedia' && <><header className="guide-masthead"><span className="guide-symbol" aria-hidden="true">✳</span><div><p>A COMPANION TO A WORLD THAT COULD BE</p><strong>The 2077 Field Guide</strong></div></header><div className="guide-lead"><div><div className="article-category">ENTRY / RESEARCH &amp; SOCIETY</div><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p></div><aside className="guide-note"><span>THEN → NOW</span><OrbitArt /><dl><dt>First spark</dt><dd>{archive.sourceYear ?? 'An original paper'}</dd><dt>Looking back from</dt><dd>2077</dd></dl></aside></div><nav className="guide-contents" aria-label="In this entry"><span>IN THIS ENTRY</span>{story.sections.map((s, i) => <a href={'#chapter-' + i} key={i}><b>{String(i + 1).padStart(2, '0')}</b>{s.heading}<ArrowDown size={12} /></a>)}</nav></>}
      {story.format === 'museum' && <><header className="collection-masthead"><strong>The 2077 Collection</strong><span>OBJECTS FROM A POSSIBLE FUTURE</span></header><div className="collection-hero"><figure className="collection-object"><span className="object-corner">A SMALL IDEA.<br />AN ENTIRELY DIFFERENT WORLD.</span><div className="object-study"><OrbitArt dark /></div><figcaption>CONCEPT STUDY / Paper 2077</figcaption></figure><div className="collection-label"><div className="article-category">ON DISPLAY / 2077</div><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p><dl><dt>Collection</dt><dd>Ideas that outgrew the page</dd><dt>First spark</dt><dd>A research paper{archive.sourceYear ? ', ' + archive.sourceYear : ''}</dd></dl></div></div><div className="collection-divider"><span>THE EXHIBITION NOTES</span><span>↓</span></div></>}
      {story.format === 'documentary' && <><header className="reel-masthead"><strong>The 2077 Cut</strong><span>AN IMAGINED DOCUMENTARY / IN WORDS</span></header><div className="reel-hero"><div className="reel-art" aria-hidden="true"><OrbitArt dark /><span>2027 → 2077</span></div><div className="reel-copy"><div className="article-category">ONE IDEA. FIFTY YEARS LATER.</div><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p><a className="reel-read" href="#chapter-0">Read the story <ArrowDown size={16} /></a></div><div className="reel-caption"><span>A FUTURE IN THREE ACTS</span><span>Paper 2077 ORIGINAL FICTION</span></div></div></>}
      <div className="story-sections">{story.sections.map((section, i) => <section id={'chapter-' + i} key={i}><span className="chapter-number">{story.format === 'documentary' ? 'ACT ' : story.format === 'museum' ? 'EXHIBITION NOTE ' : story.format === 'encyclopedia' ? 'ENTRY / ' : 'DISPATCH / '}{String(i + 1).padStart(2, '0')}</span><div className="section-copy"><h2>{section.heading}</h2><p>{section.text}</p></div></section>)}</div>
      <blockquote><span>“</span>{story.quote}<cite>— An imagined voice from the future</cite></blockquote>
      <section className="archive-timeline" id="history"><div className="eyebrow">THE RIPPLE THROUGH TIME</div><div>{story.timeline.map((t, i) => <div className="timeline-point" key={i}><strong>{t.year}</strong><p>{t.event}</p></div>)}</div></section>
      <div className="source-paper"><span>WHERE THIS POSSIBLE FUTURE BEGAN</span><h3>{archive.title}</h3><p>{archive.sourceURL ? <><a href={archive.sourceURL} target="_blank" rel="noreferrer">Read the original paper ↗</a>{archive.sourceYear ? ' · ' + archive.sourceYear : ''}</> : 'Inspired by a research idea.'}</p></div>
      <div className="fiction-label"><span>✳</span> FICTIONAL FUTURE, GENERATED FOR ENTERTAINMENT. ALL FUTURE EVENTS, QUOTATIONS AND ACHIEVEMENTS ARE INVENTED.</div>
    </article><div className="archive-afterword"><p>Whatever the reviews say,<br /><em>there’s still a future to imagine.</em></p><a href="/" className="button primary">Imagine another paper <ArrowUpRight size={17} /></a></div><SiteFooter />
  </div>;
}

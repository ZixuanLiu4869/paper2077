"use client";
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Download, Link2, Printer, Orbit, Play, Check, BookOpen } from 'lucide-react';
import type { Archive } from '@/lib/types';
import { OrbitArt } from './orbit-art';
import { SiteFooter } from './site-footer';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from './ui/dialog';
import { drawShareCard, INVITATION_URL } from '@/lib/share-card.mjs';
export default function ArchiveView({ archive }: { archive: Archive }) {
  const { story } = archive; const [notice, setNotice] = useState(''); const [copied, setCopied] = useState(false); const [shareURL, setShareURL] = useState('');
  const [poster, setPoster] = useState<{ url: string; blob: Blob } | null>(null); const [creatingPoster, setCreatingPoster] = useState(false);
  useEffect(() => () => { if (poster) URL.revokeObjectURL(poster.url); }, [poster]);
  const dark = story.format === 'museum' || story.format === 'documentary';
  async function share() { const url = INVITATION_URL; setShareURL(url); try { await Promise.race([navigator.clipboard.writeText(url), new Promise((_, reject) => setTimeout(() => reject(new Error('Clipboard unavailable')), 1500))]); setCopied(true); setNotice('Website link copied.'); setTimeout(() => setCopied(false), 3000); } catch { setNotice('Select and copy the website link below.'); } }
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
    } catch { setNotice('The share image could not be prepared. Please try again.'); }
    finally { setCreatingPoster(false); }
  }
  function downloadPoster() {
    if (!poster) return;
    const link = document.createElement('a'); link.download = 'iclr-2077-invitation.png'; link.href = poster.url; document.body.appendChild(link); link.click(); link.remove();
    setNotice('Image download requested. You can also save the preview image.');
  }
  return <div className={'archive-shell ' + (dark ? 'dark-shell' : '')}>
    <header className="site-header"><a className="brand" href="/"><Orbit size={23} strokeWidth={1.5} /><span>ICLR <b>2077</b></span></a><a className="text-link" href="/"><ArrowLeft size={15} />Back to 2027</a></header>
    <div className="archive-toolbar"><span className="eyebrow">{archive.example ? archive.id === 'example' ? 'LUNA-IMAGINED SAMPLE' : 'AN IMAGINED FUTURE' : 'SHARED FUTURE ARCHIVE'}</span><div><button onClick={share} className="button subtle">{copied ? <Check size={15} /> : <Link2 size={15} />}Copy website link</button><button onClick={createPoster} disabled={creatingPoster} className="button subtle"><Download size={15} />{creatingPoster ? 'Preparing image…' : 'Share image'}</button><button onClick={() => window.print()} className="button subtle"><Printer size={15} />Print / PDF</button></div></div>
    <Dialog open={poster !== null} onOpenChange={open => { if (!open) setPoster(null); }}><DialogContent className="share-dialog"><DialogTitle>Invite someone to 2077</DialogTitle><DialogDescription>A paper. A very different future. Come take a little trip.</DialogDescription>{poster && <img src={poster.url} alt="ICLR 2077 website invitation" className="share-card-preview" />}<button type="button" className="button primary" onClick={downloadPoster}><Download size={16} />Download PNG</button></DialogContent></Dialog>
    {notice && <div className="toast" role="status">{notice}</div>}
    {shareURL && <div className="archive-share"><label htmlFor="share-url">Website link</label><input id="share-url" readOnly value={shareURL} onFocus={event => event.target.select()} /></div>}
    <article className={'archive-document ' + story.format}>
      {story.format === 'newspaper' && <><div className="bbc-masthead"><div className="bbc-boxes" aria-label="BBC"><span>B</span><span>B</span><span>C</span></div><strong>NEWS</strong><span className="bbc-edition">SCIENCE &amp; TECHNOLOGY · 2077</span></div><div className="publication-fiction">FICTIONAL FUTURE BY ICLR 2077 · BBC-STYLE PARODY · NOT A BBC PUBLICATION</div><div className="bbc-section-bar">Science &amp; Technology <span>The world in 2077</span></div><div className="article-category">THE LONG VIEW</div><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p><div className="news-byline"><strong>ICLR 2077</strong> · Imagined future correspondent<br /><span>16 December 2077</span></div></>}
      {story.format === 'encyclopedia' && <><div className="wiki-header"><BookOpen size={36} strokeWidth={1} /><div><strong>Wikipedia</strong><span>The Free Encyclopedia</span></div><span className="wiki-date">IMAGINED 2077 EDITION</span></div><div className="publication-fiction">FICTIONAL FUTURE BY ICLR 2077 · WIKIPEDIA-STYLE PARODY · NOT A WIKIPEDIA ARTICLE</div><div className="wiki-tabs"><span>Article</span><span>Read · 2077</span></div><h1>{story.headline}</h1><p className="wiki-source">An imagined future entry, presented in the style of Wikipedia.</p><p className="document-deck">{story.deck}</p><nav className="wiki-contents" aria-label="Contents"><strong>Contents</strong><a href="#chapter-0">(Top)</a>{story.sections.map((s, i) => <a href={'#chapter-' + i} key={i}>{i + 1}. {s.heading}</a>)}<a href="#history">4. Historical milestones</a></nav><aside className="wiki-infobox"><strong>{story.headline}</strong><dl><dt>Field</dt><dd>Research and society</dd><dt>Origin</dt><dd>{archive.sourceYear ?? 'An original research paper'}</dd><dt>Article setting</dt><dd>2077 (fictional)</dd><dt>Original paper</dt><dd>{archive.title}</dd></dl></aside></>}
      {story.format === 'museum' && <><div className="museum-topline"><span>SCIENCE MUSEUM · IMAGINED EXHIBIT</span><span>PERMANENT COLLECTION / 2077</span></div><div className="museum-exhibit"><div className="exhibit-number">EXHIBIT № {archive.id.slice(0, 3).toUpperCase()}</div><OrbitArt dark /><span>THE EARLY DAYS OF AN EXTRAORDINARY IDEA.</span></div><div className="museum-label"><div className="article-category">SCIENCE, BEFORE IT BECAME HISTORY</div><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p><div className="museum-material">Collection: Research that changed what seemed possible<br />Origin: A research paper{archive.sourceYear ? ', ' + archive.sourceYear : ''} · Imagined display: 2077</div></div></>}
      {story.format === 'documentary' && <><div className="film-topline"><span>AN ICLR 2077 ORIGINAL</span><span>A FICTIONAL DOCUMENTARY</span></div><div className="film-poster"><OrbitArt dark /><div className="film-poster-copy"><span className="article-category">FIFTY YEARS IN THE MAKING</span><h1>{story.headline}</h1><p className="document-deck">{story.deck}</p><a className="film-read" href="#chapter-0"><Play size={16} fill="currentColor" />Read the imagined film</a></div><div className="film-credits">RELEASED 2077 · SCIENCE / HUMAN POSSIBILITY · FICTIONAL FILM ARCHIVE</div></div><div className="film-intro"><span>THE STORY BEHIND THE BREAKTHROUGH</span><p>An idea begins in a paper. This is where it might lead.</p></div></>}
      <div className="story-sections">{story.sections.map((section, i) => <section id={'chapter-' + i} key={i}><span className="chapter-number">{story.format === 'documentary' ? 'CHAPTER ' : story.format === 'museum' ? 'CURATOR’S NOTE ' : ''}{String(i + 1).padStart(2, '0')}</span><h2>{section.heading}</h2><p>{section.text}</p></section>)}</div>
      <blockquote><span>“</span>{story.quote}<cite>— An imagined voice from the future</cite></blockquote>
      <section className="archive-timeline" id="history"><div className="eyebrow">THE RIPPLE THROUGH TIME</div><div>{story.timeline.map((t, i) => <div className="timeline-point" key={i}><strong>{t.year}</strong><p>{t.event}</p></div>)}</div></section>
      <div className="source-paper"><span>WHERE THIS POSSIBLE FUTURE BEGAN</span><h3>{archive.title}</h3><p>{archive.sourceURL ? <><a href={archive.sourceURL} target="_blank" rel="noreferrer">Read the original paper ↗</a>{archive.sourceYear ? ' · ' + archive.sourceYear : ''}</> : 'Inspired by a research idea.'}</p></div>
      <div className="fiction-label"><span>✳</span> FICTIONAL FUTURE, GENERATED FOR ENTERTAINMENT. ALL FUTURE EVENTS, QUOTATIONS AND ACHIEVEMENTS ARE INVENTED.</div>
    </article><div className="archive-afterword"><p>Whatever the reviews say,<br /><em>there’s still a future to imagine.</em></p><a href="/" className="button primary">Imagine another paper <ArrowUpRight size={17} /></a></div><SiteFooter />
  </div>;
}

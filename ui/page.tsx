"use client";
import { useEffect, useState, type FormEvent } from 'react';
import { ArrowUpRight, ArrowRight, Orbit, LoaderCircle } from 'lucide-react';
import { OrbitArt } from '@/components/orbit-art';
import { SiteFooter } from '@/components/site-footer';
import { attentionExample as example } from '@/lib/attention-example';
type Paper = { id: string; number: number | null; title: string; abstract: string; url: string; year: number; archiveId?: string | null };
export default function Home() {
  const [query, setQuery] = useState(''); const [lookupQuery, setLookupQuery] = useState('');
  const [papers, setPapers] = useState<Paper[]>([]); const [selected, setSelected] = useState<Paper | null>(null);
  const [looking, setLooking] = useState(false); const [lookupError, setLookupError] = useState(''); const [more, setMore] = useState(false);
  const [pending, setPending] = useState(false); const [error, setError] = useState(''); const [ready, setReady] = useState<boolean | null>(null); const [seconds, setSeconds] = useState(0);
  useEffect(() => { fetch('/api/status').then(r => r.json()).then(r => setReady((r as { ready?: boolean }).ready === true)).catch(() => setReady(false)); }, []);
  useEffect(() => { if (!pending) return; const timer = setInterval(() => setSeconds(s => s + 1), 1000); return () => clearInterval(timer); }, [pending]);
  async function findPaper(event: FormEvent) {
    event.preventDefault(); if (looking || pending) return;
    setLooking(true); setLookupError(''); setError(''); setPapers([]); setSelected(null); setMore(false);
    try {
      const response = await fetch('/api/papers?q=' + encodeURIComponent(query.trim()), { signal: AbortSignal.timeout(25_000) });
      const result = await response.json() as { papers?: Paper[]; more?: boolean; error?: string };
      if (!response.ok || !result.papers?.length) throw new Error(result.error || 'No matching ICLR 2027 paper was found.');
      setPapers(result.papers); setLookupQuery(query.trim()); setMore(result.more === true);
      if (result.papers.length === 1) setSelected(result.papers[0]);
    } catch (e) { setLookupError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'OpenReview took too long to respond. Please try again.'); }
    finally { setLooking(false); }
  }
  async function travel() {
    if (pending || !selected) return; setError(''); setPending(true); setSeconds(0);
    try {
      const response = await fetch('/api/generate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ paperId: selected.id, lookupQuery }), signal: AbortSignal.timeout(120_000) });
      const result = await response.json() as { id?: unknown; error?: unknown; pending?: boolean }; if (!response.ok) throw new Error(typeof result.error === 'string' ? result.error : 'The time machine needs a moment. Try again.');
      const id = response.status === 202 && result.pending ? await waitForArchive(selected.id) : result.id;
      if (typeof id !== 'string' || !/^[a-f0-9-]{36}$/.test(id)) throw new Error('The archive could not be saved.');
      window.location.assign('/archive/' + id);
    } catch (e) { setError(e instanceof Error && e.name !== 'TimeoutError' ? e.message : 'Time travel took longer than expected. Please try again later.'); setPending(false); }
  }
  async function waitForArchive(paperId: string) {
    for (let attempt = 0; attempt < 60; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      const response = await fetch('/api/generation-status?paperId=' + encodeURIComponent(paperId), { signal: AbortSignal.timeout(10_000) });
      const result = await response.json() as { id?: unknown; error?: string };
      if (response.status === 202) continue;
      if (!response.ok) throw new Error(result.error || 'This generation did not finish. No new API request was made.');
      return result.id;
    }
    throw new Error('This future is still being prepared. Check back later; waiting does not start another paid request.');
  }
  return <>
    <header className="site-header"><a className="brand" href="/"><Orbit size={23} strokeWidth={1.5} /><span>ICLR <b>2077</b></span></a><span className="header-note">FOR THE ICLR 2027 WAITING SEASON</span></header>
    <main className="home"><section className="hero"><div className="hero-copy"><div className="eyebrow"><span className="status-dot" /> ICLR 2027 · SOMEWHERE BETWEEN HOPE &amp; REVIEW</div><h1>A paper.<br />A very different<br /><em>future.</em><span className="title-star">✳</span></h1><p className="hero-description">The reviews can wait a moment.<br />Let’s imagine what an idea changes in fifty years.</p><a className="hero-link" href="#time-machine">Take a little trip <ArrowRight size={18} /></a></div>
      <div className="hero-preview" aria-label="An imagined 2077 future of Attention Is All You Need"><div className="preview-year">DESTINATION <strong>2077</strong><span>A POSSIBLE FUTURE</span></div><a href="/archive/attention" className="preview-paper preview-encyclopedia"><div className="mini-meta"><span>2077 EDITION</span><span>FICTIONAL FUTURE</span></div><div className="mini-masthead">Wikipedia</div><div className="mini-rule">IMAGINED ENTRY · NOT A WIKIPEDIA ARTICLE</div><h2>{example.story.headline}</h2><OrbitArt /><p>By 2077, AI had moved on.<br />Attention had moved into a museum.</p><span className="preview-open">Step into this future <ArrowUpRight size={14} /></span></a><span className="preview-caption">THE TECHNOLOGY THAT CHANGED EVERYTHING. THEN RETIRED.</span></div></section>
      <section id="time-machine" className="machine-section"><div className="section-intro"><span className="section-number">2027 → 2077</span><h2>Every future starts<br />with a paper.</h2><p>Let’s skip ahead to the part<br />where it changes everything.</p><div className="journey"><span>2027</span><div /><Orbit size={20} /><div /><strong>2077</strong></div></div>
        <form className="paper-form" onSubmit={findPaper}>
          <div className="venue-badge">ICLR 2027 · MAIN CONFERENCE</div>
          <label htmlFor="paper-query">Paper title <span>ICLR 2027</span></label>
          <input id="paper-query" name="query" value={query} onChange={e => { setQuery(e.target.value); setSelected(null); setPapers([]); setLookupError(''); setError(''); }} placeholder="Type a paper title…" required minLength={4} maxLength={300} disabled={looking || pending} />
          <button type="submit" className="button primary lookup-button" disabled={looking || pending || !query.trim()}>{looking ? <><LoaderCircle className="spin" size={16} />Opening the time machine…</> : <>Let’s explore the future <ArrowRight size={16} /></>}</button>
          {lookupError && <p className="form-error" role="alert">{lookupError}</p>}
          {papers.length > 1 && !selected && <div className="paper-results" aria-label="Matching ICLR 2027 papers"><p className="results-label">Choose a paper{more ? ' · Refine the title to see other matches' : ''}</p>{papers.map(p => <button type="button" className="paper-result" key={p.id} onClick={() => { setSelected(p); setError(''); }}><span>{p.title}</span><small>ICLR 2027{p.number !== null ? ' · Paper #' + p.number : ''}{p.archiveId ? ' · Future already imagined' : ''}</small></button>)}</div>}
          {selected && <div className="resolved-paper" aria-live="polite"><div className="resolved-label">ICLR 2027</div><h3>{selected.title}</h3><div className="resolved-actions"><a className="paper-source-link" href={selected.url} target="_blank" rel="noreferrer">View original submission <ArrowUpRight size={13} /></a>{papers.length > 1 && <button type="button" className="button subtle" disabled={pending} onClick={() => { setSelected(null); setError(''); }}>Choose another match</button>}</div><details><summary>Abstract</summary><p>{selected.abstract}</p></details>
            {ready === false && !selected.archiveId && <p className="connection-note">This paper is ready. Live story generation is being connected; meanwhile, explore the example.</p>}{error && <p className="form-error" role="alert">{error}</p>}
            {selected.archiveId ? <a className="button primary travel-button" href={'/archive/' + selected.archiveId}>Open the shared future <ArrowUpRight size={19} /></a> : <button className="button primary travel-button" disabled={pending || ready !== true} type="button" onClick={travel}>{pending ? <><LoaderCircle className="spin" size={18} />{seconds < 9 ? 'Leaving 2027…' : seconds < 25 ? 'Following the ripples of the idea…' : 'Recovering the shared future…'}</> : <>Travel to 2077 <ArrowUpRight size={19} /></>}</button>}
          </div>}
          <p className="form-footnote">Fictional future. Real room to imagine.</p>
        </form></section>
      <section className="possibility-note"><span className="possibility-star" aria-hidden="true">✳</span><div><h2>One idea. Many possible legacies.</h2><p>The next fifty years haven’t read the reviews.</p></div></section>
    </main><SiteFooter />
  </>;
}

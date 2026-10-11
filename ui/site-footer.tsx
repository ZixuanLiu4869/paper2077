import { ArrowUpRight } from 'lucide-react';

export function SiteFooter() {
  return <footer className="site-footer community-footer">
    <div className="footer-top"><span>Paper 2077 · MADE FOR A MOMENT OF POSSIBILITY</span><span className="footer-disclaimer">An independent game made for entertainment. All futures are fictional. Not affiliated with or endorsed by ICLR, OpenReview, or the organisations featured in these stories.</span></div>
    <div className="footer-bottom"><p className="footer-contact">If this project is interesting to you, reach out at <a href="mailto:info@detectium.io">info@detectium.io</a></p><a className="footer-github" href="https://github.com/ZixuanLiu4869/paper2077" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a></div>
  </footer>;
}

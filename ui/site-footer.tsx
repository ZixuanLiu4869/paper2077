import { ArrowUpRight } from 'lucide-react';

export function SiteFooter() {
  return <footer className="site-footer community-footer">
    <div className="footer-top"><span>ICLR 2077 · MADE FOR A MOMENT OF POSSIBILITY</span><span>All futures are fictional. Not affiliated with ICLR, BBC or Wikipedia.</span></div>
    <div className="footer-bottom"><p className="footer-contact">If this project is interesting to you, reach out at <a href="mailto:info@detectium.io">info@detectium.io</a></p><a className="footer-github" href="https://github.com/ZixuanLiu4869/iclr2077" target="_blank" rel="noreferrer">GitHub <ArrowUpRight size={13} /></a></div>
  </footer>;
}

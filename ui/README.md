# UI reference source

These files are the selected interface source used by the live Paper 2077 site.
They are supplied for reading and reuse, not as a standalone app.

- `page.tsx` expects `/api/status`, `/api/papers`, `/api/generate` and `/api/generation-status` from a backend integration.
- `archive-view.tsx` accepts an `Archive` and renders the model-selected format.
- `attention-example.ts` contains the public, editorial Attention example.
- `site-footer.tsx` and `orbit-art.tsx` provide the footer and original illustration.
- `globals.css` supplies the site's styling.

Integrating the page/layout files requires React, TypeScript and `lucide-react`, an `@/` alias resolving the shown `lib/` and `components/` imports, and a compatible accessible dialog component for `./ui/dialog` in the archive view. The hosting-specific dialog wrapper and runtime are not part of this selected export. The invitation uses the fixed Detectium logo asset supplied by the host; the logo is not included in the code license.

No original submission title, abstract or author metadata is supplied as an example fixture. The public Attention example is about the well-known 2017 paper and is not generated from a private submission.

# ICLR 2077

**A paper. A very different future.**

A fictional time machine for research. While the community waits for reviews, imagine the year 2077: what if an idea from a paper changed everyday life in a spectacular, slightly absurd way?

[Explore the website](https://iclr-2077-future-archives.wholehake256.chatgpt.site/) · [Read the Attention example](https://iclr-2077-future-archives.wholehake256.chatgpt.site/archive/attention) · [Suggest an idea](https://github.com/ZixuanLiu4869/iclr2077/issues)

## The experience

- Search for a public ICLR 2027 paper by title. No account needed.
- The model chooses a suitable fictional artifact: a news story, encyclopedia entry, museum exhibit or documentary.
- The story follows an exaggerated future consequence, in everyday language. New research possibilities emerge through the story rather than a list of advice.
- Everyone visiting the same paper reuses the saved result. A durable database claim prevents concurrent requests from paying for duplicate generations.
- Every paper uses the same fixed website invitation image. It never receives a paper title, story, author or visitor identity.

The **Attention Was All You Needed** example is editorial fiction, not an ICLR 2027 submission or a claim about actual future events. All future stories are invented. This project is not affiliated with ICLR, BBC or Wikipedia.

## What is open here

This is the community edition: reusable research lookup, generation and cache code, plus the website's page and artwork source for reference. It is **not a deployment of the production service**. There are no credentials, production database records, visitor data or private deployment settings in this repository.

| Path | Purpose |
| --- | --- |
| `lib/openreview.mjs` | Public ICLR 2027 title search and submission validation |
| `lib/generation.mjs` | Story prompt, strict JSON schema, validation and API client |
| `lib/shared-generation.mjs` | Cache-first flow, durable generation claim and attempt limits |
| `lib/privacy.mjs` | Contact filtering, public field projection and paper fingerprint |
| `lib/share-card.mjs` | Fixed 1200×630 invitation artwork, with no paper/story input |
| `drizzle/*.sql` | Empty database schema and migrations, not stored records |
| `ui/` | Homepage, archive layouts, footer and orbit illustration source |
| `scripts/test-*.mjs` | Offline regression tests with mocked API responses |

## Run the tests

Use **Node.js 24+** (the database tests use the built-in `node:sqlite` module). No package installation or API key is needed:

```sh
git clone https://github.com/ZixuanLiu4869/iclr2077.git
cd iclr2077
npm test
```

Tests make **no live model or OpenReview requests** and spend no API credits. They cover source validation, anonymous field projection, identical invitation artwork, cache reuse, concurrent visitors, ambiguous failures and budget caps.

## Reuse the core

The modules are standard ESM with no third-party runtime dependencies. A backend adapter supplies a D1-compatible database (`prepare`, `bind`, `first`, `run`), validated lookup and generation functions. Keep the API key on the server.

```js
import { lookupPapers } from './lib/openreview.mjs';
import { generateStory } from './lib/generation.mjs';
import { generateSharedArchive } from './lib/shared-generation.mjs';

// This is a backend integration example, not an instruction to run a paid call.
const result = await generateSharedArchive(db, {
  paperId: selectedPaperId,
  lookupQuery: titleQuery,
}, serverApiKey, { lookup: lookupPapers, generate: generateStory });
```

The source currently selects `gpt-6-luna`; model availability depends on the account running an integration. The live app caps generation attempts at 100 per UTC day and 1,000 overall. These are attempt limits, not dollar guarantees. Failed or uncertain attempts stay blocked for owner investigation rather than automatically issuing another paid call. See the tests before changing this behavior.

The React files in `ui/` are reference source, not a standalone runnable frontend. See [ui/README.md](ui/README.md) for their integration dependencies.

## Help shape the future

We welcome clearer storytelling, better archive layouts, accessibility fixes, stronger anonymous sharing and offline tests. Open an issue or a pull request; see [CONTRIBUTING.md](CONTRIBUTING.md). If this project makes the review season a little more fun, a star helps others discover it.

Supported by [Detectium](https://www.detectium.io/). If this project is interesting to you, reach out at **info@detectium.io**.

The code is available under the [MIT License](LICENSE). Detectium's name and logo, and third-party publication names, remain their owners' marks; the code license does not grant rights to those marks.

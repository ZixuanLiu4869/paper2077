# Paper 2077

**A paper. A very different future.**

A fictional time machine for research. While the community waits for reviews, imagine the year 2077: what if an idea from a paper changed everyday life in a spectacular, slightly absurd way?

[Explore the website](https://paper2077.wholehake256.chatgpt.site/) · [Read the Attention example](https://paper2077.wholehake256.chatgpt.site/archive/attention) · [Suggest an idea](https://github.com/ZixuanLiu4869/paper2077/issues)

## The experience

- Search for a public ICLR 2027 paper by title. No account needed.
- The model chooses a suitable fictional artifact: a news story, encyclopedia entry, museum exhibit or documentary.
- The story follows an exaggerated future consequence, in everyday language. New research possibilities emerge through the story rather than a list of advice.
- Everyone visiting the same paper reuses the saved result. A durable database claim prevents concurrent requests from paying for duplicate generations.
- Every paper uses the same fixed website invitation image. It never receives a paper title, story, author or visitor identity.

The **Attention Was All You Needed** example is editorial fiction, not an ICLR 2027 submission or a claim about actual future events. All future stories are invented. This project is not affiliated with ICLR, OpenReview or any depicted organization.

## What is open here

This is the community edition: reusable research lookup, generation and cache code, plus the website's page and artwork source for reference. It is **not a deployment of the production service**. There are no credentials, production database records, visitor data or private deployment settings in this repository.

| Path | Purpose |
| --- | --- |
| `lib/openreview.mjs` | Public ICLR 2027 title search and submission validation |
| `lib/generation.mjs` | Story prompt, strict JSON schema, validation and API client |
| `lib/shared-generation.mjs` | Cache-first flow, durable generation claim and attempt limits |
| `lib/request-guard.mjs` | Transactional client/global request limits and daily pseudonyms |
| `lib/search-cache.mjs` | Ten-minute search cache, durable query leases and upstream backoff |
| `lib/privacy.mjs` | Contact filtering, public field projection and paper fingerprint |
| `lib/share-card.mjs` | Fixed 1200×630 invitation artwork, with no paper/story input |
| `drizzle/*.sql` | Empty database schema and migrations, not stored records |
| `ui/` | Homepage, archive layouts, footer and orbit illustration source |
| `scripts/test-*.mjs` | Offline regression tests with mocked API responses |

## Run the tests

Use **Node.js 24+** (the database tests use the built-in `node:sqlite` module). No package installation or API key is needed:

```sh
git clone https://github.com/ZixuanLiu4869/paper2077.git
cd paper2077
npm test
```

Tests make **no live model or OpenReview requests** and spend no API credits. They cover source validation, anonymous field projection, identical invitation artwork, cache reuse, concurrent visitors, ambiguous failures and budget caps.

Search results are cached for ten minutes; empty results for one minute. Concurrent searches for the same normalized title share a database lease. New OpenReview queries are capped at 60 per minute and 3,000 per 24-hour window, with a short backoff after upstream failures. The HTTP perimeter separately caps search at 20 requests per client bucket per minute and 240 globally, generation requests at 6/60, and status/archive requests at 120/1,200. It returns 429 with Retry-After when capacity is exhausted. These counters supplement hosting protection; they are not a CAPTCHA or a guarantee against distributed denial of service.

Backend integrations must apply `protectRequest` to the original trusted edge Request before framework adaptation, provision a private `ABUSE_GUARD_SECRET`, and implement transactional D1 `batch`. Raw IP addresses, client-supplied X-Forwarded-For values and visitor account data are not stored. Daily HMAC pseudonyms are used for short-lived counters, and record counts are bounded. Without trustworthy edge metadata, clients share a conservative fallback bucket. Search cache payloads contain public paper metadata, never OpenReview author profiles or private notes. Searches themselves do not call the model.

## Reuse the core

The modules are standard ESM with no third-party runtime dependencies. A backend adapter supplies a D1-compatible database (`prepare`, `bind`, `first`, `run`, transactional `batch`), validated lookup and generation functions. Keep the API key on the server.

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

The source currently selects `gpt-6-luna`; model availability depends on the account running an integration. New generation is capped at 100 attempts per UTC day, 500 per UTC calendar month and 1,000 overall, with at most 10 per rolling minute and 3 simultaneous active calls. A single SQL statement atomically reserves these allowances. Cached stories remain readable after a cap is reached.

The monthly application allowance conservatively reserves $0.02 per attempt toward $10. It is not measured billing: configure the dedicated OpenAI project's actual hard spend limit separately and recheck pricing before changing the model or request bounds. Failed or uncertain attempts stay blocked for owner investigation rather than automatically issuing another paid call. Rejected requests cannot burn other allowances. See the tests before changing this behavior. Anonymous scripts may still consume the allowed slots; these controls bound exposure and do not guarantee that all bot activity is detected.

The React files in `ui/` are reference source, not a standalone runnable frontend. See [ui/README.md](ui/README.md) for their integration dependencies.

## Help shape the future

We welcome clearer storytelling, better archive layouts, accessibility fixes, stronger anonymous sharing and offline tests. Open an issue or a pull request; see [CONTRIBUTING.md](CONTRIBUTING.md). If this project makes the review season a little more fun, a star helps others discover it.

Supported by [Detectium](https://www.detectium.io/). If this project is interesting to you, reach out at **info@detectium.io**.

The code is available under the [MIT License](LICENSE). Third-party runtime software keeps its own licenses; see [the notices](THIRD-PARTY-NOTICES.txt). Public OpenReview titles and abstracts are metadata subject to the CC0 dedication in its [Terms of Use](https://openreview.net/legal/terms); full papers and figures are outside this application's input. Detectium's branding is used with permission. Its name and logo remain its owner's marks; the code license does not grant rights to those marks.

# Contributing

Help make research's imagined future more vivid, readable and welcoming.

1. Open an issue describing the concrete improvement. A fictional example helps with story ideas.
2. Fork this repository and make a focused change.
3. Run `npm test` using Node 24+.
4. Open a pull request explaining the change and relevant checks.

Useful contributions include prompt clarity, accessible layouts, public OpenReview validation, anonymity checks and cache correctness. The tests use mocked responses and do not need credentials.

Do not include API keys, database exports, private submissions, author identities or unpublished research in issues, fixtures or pull requests. Use synthetic papers and characters. The UI invitation must remain fixed and independent of paper and story data.

Do not add automatic retries or stale-job takeovers to the paid generation path: an interrupted request may already have been charged. Preserve cache-first reads and one durable claim per paper.

Community changes are reviewed before incorporation into the live service. A merge here does not deploy the production website.

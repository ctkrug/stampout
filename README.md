# Optoutly

A checklist-and-tracker for opting out of the data brokers that resell your personal
information. Optoutly keeps a curated list of ~40 major US data brokers, tracks which ones
you've opted out of, tells you when to re-check (many brokers quietly re-list you after a few
months), and links each state's privacy-law rights so you know exactly what you're entitled to
ask for.

Everything runs client-side. There's no account, no backend, and no server — your opt-out
progress lives in your browser's `localStorage`, and the site itself is a static bundle you can
host anywhere (including as a subpath of another domain).

## Why

Data brokers — people-search sites, marketing aggregators, background-check services — build
profiles from public records and sell access to them. Most let you opt out, but:

- there are dozens of them, each with a different opt-out flow;
- several silently re-list you a few months later, so "opted out" isn't a one-time task; and
- your actual legal rights (to delete, to know, to correct) depend on which state you live in.

Optoutly turns "go opt out of your data everywhere" from an open-ended chore into a checklist
with a schedule.

## Features (planned for v1)

- **Broker checklist** — ~40 major brokers with name, category, and a direct opt-out link.
- **Status tracking** — mark each broker as not started / requested / confirmed, stored locally.
- **Re-check scheduler** — brokers that are known to re-list get a "check again by" date,
  computed from when you last confirmed the opt-out.
- **State privacy-law reference** — pick your state and see which comprehensive privacy law
  applies (CCPA/CPRA, VCDPA, etc.) and what rights it grants.
- **Zero backend** — a static site; your data never leaves your browser.

## Stack

- Vanilla JavaScript (ES modules), no framework, no bundler.
- A static JSON dataset (`public/data/`) for brokers and state privacy laws.
- `node:test` for unit tests on the pure logic (scheduling, storage, derived status).
- ESLint for linting.

## Project layout

```
public/            the whole deployable site (self-contained, relative paths)
  index.html
  css/
  js/
    lib/            pure logic: scheduler, storage, broker-status helpers
  data/
    brokers.json
    state-laws.json
test/               node:test suites for public/js/lib
docs/
  VISION.md         problem, audience, core idea, what "done" means
  DESIGN.md         visual direction and design tokens
  BACKLOG.md        epics/stories for the build
```

## Development

```
npm install
npm test     # run the unit test suite
npm run lint # run eslint
```

To preview the site, serve `public/` with any static file server, e.g.
`npx http-server public`.

## Status

Early scaffold — see [`docs/BACKLOG.md`](docs/BACKLOG.md) for what's built vs. planned.

## License

MIT — see [`LICENSE`](LICENSE).

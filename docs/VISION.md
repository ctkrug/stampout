# Optoutly — vision

## The problem

Dozens of data brokers — people-search sites, background-check services, marketing-data
aggregators — build profiles on nearly every US adult from public records and sell access to
them. Each one has a different opt-out process, and several are known to silently re-list your
data a few months after you've opted out, so this isn't a one-time chore, it's ongoing
maintenance. On top of that, your actual legal leverage (the right to demand deletion, to know
what's held, to opt out of sale) depends on which state's privacy law applies to you, and that
landscape has grown to twenty-plus states with different rights.

The result: people either give up after the first two or three opt-outs, or do it once and
never realize they've been re-listed.

## Who it's for

Anyone who wants to reduce their public data-broker footprint without hiring a paid
"data-removal" subscription service (many of which are themselves resellers of the same
underlying broker relationships). Particularly useful for people who've had a specific reason to
care — stalking/harassment concerns, a recent move, job-hunting privacy — but works as a general
privacy hygiene tool for anyone.

## The core idea

A static checklist, not a service. Optoutly ships a curated dataset of major data brokers (name,
category, direct opt-out link, and how quickly each is known to re-list data) and a matching
dataset of state privacy-law rights. You track your own progress per broker — not started,
requested, confirmed — entirely in your browser's `localStorage`. Once you confirm a broker,
Optoutly computes when you should check it again based on that broker's known re-listing
behavior, and surfaces the ones that are overdue.

There's no account and no backend, deliberately: the whole point is that a tool for reducing
your data footprint shouldn't itself become another place your data is collected.

## Key design decisions

- **Static site, zero backend.** All state lives in `localStorage`. This is a genuine constraint,
  not a shortcut — it means the dataset (`public/data/*.json`) is the only thing that needs to
  stay current, and the app can be hosted anywhere as a plain file bundle.
- **Curated dataset as the core asset.** The checklist is only as valuable as the data broker
  list is accurate and current. Keeping `brokers.json` and `state-laws.json` correct — and
  expanding both toward full coverage (~40 brokers, all states with an enacted privacy law) — is
  the main ongoing content investment, tracked as backlog stories, not just initial scaffolding.
- **Re-check scheduling is broker-specific.** A single global "check again in 6 months" reminder
  would be wrong for the brokers known to re-list within weeks. Each broker carries its own
  `recheckDays`, and the schedule math (`public/js/lib/scheduler.js`) is pure and unit-tested so
  the "overdue" logic can be trusted.
- **Pure logic, thin DOM layer.** `public/js/lib/` holds framework-free, dependency-free logic
  (scheduling, status storage, view derivation) fully covered by `node:test`. `render.js`/`app.js`
  are the only files that touch the DOM, keeping the testable surface large and the untested
  surface small and simple.

## What "v1 done" looks like

- The full broker dataset covers roughly the ~40 major US data brokers, each with a working,
  verified opt-out link, category, and re-check interval.
- The state privacy-law dataset covers every state with an enacted comprehensive privacy law.
- A visitor can: see the full checklist, mark brokers as requested/confirmed, see computed
  recheck-due dates, filter by category, see overdue items surfaced first, and look up their own
  state's rights — all without creating an account, all persisted across page reloads.
- The page meets the visual/interaction bar in `docs/DESIGN.md` (paper-and-ink direction, stamp
  interaction, responsive at phone/tablet/desktop) rather than reading as a functional-but-plain
  utility.
- CI (lint + tests) is green on `main`.

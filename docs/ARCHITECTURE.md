# Optoutly — architecture

A static site: no build step, no bundler, no backend. `public/` is the entire deployable
artifact; everything is loaded by the browser as plain ES modules.

## Data flow

```
public/data/brokers.json  ─┐
public/data/state-laws.json┴─ fetch() in app.js
                              │
                              ▼
                     public/js/lib/*.js (pure logic)
                              │
                              ▼
                       public/js/render.js (DOM)
                              │
                              ▼
                     window.localStorage (persisted state)
```

`app.js` is the only file that touches `fetch`, `localStorage`, or the DOM directly through
`render.js`. Everything under `public/js/lib/` is framework-free, side-effect-free (or takes its
side effect — `store`, `AudioContextClass` — as an injected argument) and fully covered by
`node:test` in `test/`.

## Modules

| File | Responsibility |
|---|---|
| `lib/scheduler.js` | Pure date math: `addDays`, `daysBetween`, `nextCheckDate`, `getRecheckState` (not-started / ok / due-soon / overdue), `isStale` (dataset-freshness threshold), and `isValidISODate` (a real `YYYY-MM-DD` calendar date, used to reject corrupt stored/imported dates before the math runs). |
| `lib/storage.js` | `localStorage`-backed status persistence (`loadStatuses`/`saveStatuses`/`setBrokerStatus`), import/export serialization (`serializeStatuses`/`parseImportedStatuses`), and onboarding-dismissal persistence. All functions take an explicit `store` argument (anything with `getItem`/`setItem`) instead of reading a global, so tests pass in an in-memory fake. |
| `lib/brokers.js` | Derives the per-broker view the UI renders (`deriveBrokerView`/`deriveAllBrokerViews` — merges a dataset entry with its stored status and computed `recheckState`), plus `summarize`, `filterByCategory`, `sortByRecheckUrgency`, and `selectDueToday` (the "what to do today" view). |
| `lib/states.js` | Static list of all 50 states + DC (`ALL_US_STATES`) and `resolveStateLaw` to look up a state's enacted-law entry (or `null` if not yet covered). |
| `lib/sound.js` | `createSoundEngine` — WebAudio oscillator/gain synth SFX (`playThump`/`playTick`) gated behind a persisted mute flag. The `AudioContext` is injected and constructed lazily on first play, so it's testable without a browser and never runs afoul of autoplay policy. |
| `render.js` | Pure-ish DOM builders: `renderOnboarding`, `renderFreshnessNotice`, `renderSummary`, `renderCategoryTabs`, `renderBrokerCards` (shared by both the main grid and the "today" view), `renderStateLaws`. Each one clears and rebuilds its container from scratch — no diffing. |
| `app.js` | Wires it all together: loads the two JSON datasets, builds the sound engine and mute toggle, decides whether to show onboarding, and owns the `rerender()` closure that re-derives broker views from `statuses` + `today()` and re-renders every section on any status change. |

## UI structure

```
#app
├─ #onboarding          (first-visit explainer; removed once dismissed or once any status exists)
├─ #data-freshness      (shown only when a dataset's `updated` date is >90 days old)
├─ .dossier             (CSS grid: 250px rail + main panel on desktop, stacked under 860px)
│  ├─ .rail
│  │  ├─ #summary       (confirmed/requested/not-started/overdue counts)
│  │  ├─ #category-tabs (button group, aria-pressed)
│  │  └─ .progress-io   (export/import buttons)
│  └─ .main-panel
│     ├─ .today-view    (overdue/due-soon brokers, most-urgent first)
│     └─ #broker-grid   (full checklist, filtered by category)
└─ #state-laws          (state picker + rights panel, "not yet covered" for states with no
                          enacted law in state-laws.json)
```

## State

All state is `localStorage`, keyed under the `optoutly:v1:*` prefix (see `lib/storage.js` and
`lib/sound.js` for the exact keys). There is no server and no cookies. Import/export lets a
visitor move that state between browsers as a JSON file.

## Running it

```
npm install
npm test     # node:test over test/
npm run lint # eslint
```

Serve `public/` with any static file server (e.g. `npx http-server public`) to preview — it's
base-path-relative, so it also works when served from a subpath.

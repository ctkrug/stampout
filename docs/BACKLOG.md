# Optoutly — backlog

Stories are marked `[ ]` until built. Every story has 1–3 acceptance criteria a later run can
verify true/false. Story 1 is the wow moment and ships before anything optional.

## Epic 1 — Core checklist experience

- [x] **1. (Wow moment) Interactive opt-out checklist with recheck scheduling**
  - Marking a broker "confirmed" persists `status` and `lastChecked` to `localStorage` and
    survives a page reload.
  - A confirmed broker whose `recheckDays` has elapsed since `lastChecked` renders as "Recheck
    overdue" the next time the app loads.
  - The summary counts (confirmed / requested / not started / overdue) update immediately when
    any broker's status changes, with no page reload required.

- [x] **2. Category filtering and urgency-first sorting**
  - Selecting a category tab shows only brokers in that category; selecting "All" restores the
    full list.
  - Within any filtered view, brokers render in order: overdue, then due-soon, then ok, then
    not-started.

- [x] **3. State privacy-law lookup panel**
  - Selecting a state from the dropdown displays its law name, effective date, granted rights,
    and a working link to the enforcing authority.
  - Selecting a state with no law yet in the dataset shows an explicit "not yet covered"
    message rather than a blank or broken panel.

- [x] **4. Design polish: paper-and-ink craft pass**
  - The confirm action plays the stamp animation and synthesized thump sound from
    `docs/DESIGN.md`, respects `prefers-reduced-motion`, and honors a mute toggle persisted in
    `localStorage`.
  - The layout is composed with no dead space, overlap, or horizontal scroll at 390px, 768px,
    and 1440px widths.

## Epic 2 — Dataset completeness & accuracy

- [x] **5. Expand broker dataset to ~40 verified entries**
  - `public/data/brokers.json` contains at least 40 broker entries, each with a non-empty
    `optOutUrl`.
  - Every `optOutUrl` is spot-checked to return a non-error HTTP status, with results noted in
    the PR/commit description.

- [x] **6. Expand state law dataset to all enacted-law states**
  - `public/data/state-laws.json` includes every US state (or DC) with a comprehensive consumer
    privacy law in force as of the run date.
  - Each entry has a non-empty `rights` array and a working `authorityUrl`.

- [x] **7. Stale-data flagging in the UI**
  - If a dataset's top-level `updated` date is more than 90 days old, the UI shows a small
    "data last verified on {date}" notice instead of silently presenting possibly-stale links.

- [x] **8. Import/export opt-out progress**
  - An "Export progress" control downloads the current status map as a JSON file.
  - An "Import progress" control restores status from a previously exported file, and shows an
    inline error (not a crash) for invalid or malformed JSON.

## Epic 3 — Usability & trust

- [x] **9. First-visit onboarding state**
  - On a fresh visit with no stored status, the page shows a short explanation of how
    confirm/recheck works before the checklist.
  - Dismissing it persists that choice so it does not reappear on the next visit.

- [x] **10. "What to do today" prioritized view**
  - A dedicated view/section surfaces only overdue and due-soon brokers, most-overdue first.
  - When nothing is overdue or due soon, it shows a clear empty state instead of looking broken.

- [x] **11. Accessibility pass**
  - Every interactive control (category tabs, action buttons, state select) is operable via
    keyboard alone, with a visible focus indicator.
  - Status changes are announced through the existing `aria-live` region without requiring
    screen-reader navigation away from the control.

## Epic 4 — Deployment & shareability

- [ ] **12. Verified static deploy at a subpath**
  - The built `public/` directory works when served from a non-root subpath (e.g. `/optoutly/`)
    with no broken relative asset or `fetch` paths.
  - `site_build_dir`/`build_cmd` reported in the STATUS block match the actual build process.

- [ ] **13. Wordmark, favicon, and link-preview polish**
  - A custom favicon (not the default globe) is present.
  - An Open Graph image/meta tags are present and render correctly when the URL is shared.

- [ ] **14. Design polish: responsive & print check**
  - The full page (checklist + state-law panel) has no horizontal scroll or clipped content at
    390px width.
  - A print stylesheet renders a clean, legible checklist summary.

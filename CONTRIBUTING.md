# Contributing

## Local setup

```
npm install
npm test     # node:test suite for public/js/lib
npm run lint # eslint
npx http-server public -p 8080 -s   # preview the site
```

## Adding or updating a broker

Edit `public/data/brokers.json` directly — see `public/data/README.md` for the schema. Keep
`recheckDays` honest: it should reflect how quickly that specific broker is known to re-list
removed data, not a default guess.

## Adding a state privacy law

Edit `public/data/state-laws.json` — see `public/data/README.md` for the schema. Link the
`authorityUrl` to the state Attorney General or equivalent enforcing body, not a private
explainer site.

## Code layout

- `public/js/lib/` — framework-free logic, covered by `test/`. Keep DOM access out of this
  directory; if it needs `window` or `document`, it belongs in `render.js`/`app.js` instead.
- `test/` mirrors `public/js/lib/` one file at a time.

# Data files

Both files are hand-curated and loaded at runtime via `fetch` from `public/data/`.

## `brokers.json`

```
{
  "schemaVersion": 1,
  "updated": "YYYY-MM-DD",       // last time this file was reviewed
  "brokers": [
    {
      "id": "spokeo",            // stable, used as the localStorage key
      "name": "Spokeo",
      "category": "people-search", // people-search | background-check | marketing | credit-marketing
      "website": "https://...",
      "optOutUrl": "https://...",  // direct link to the opt-out/removal flow
      "recheckDays": 180,          // how often this broker is known to re-list removed data
      "notes": "..."
    }
  ]
}
```

## `state-laws.json`

```
{
  "schemaVersion": 1,
  "updated": "YYYY-MM-DD",
  "states": [
    {
      "code": "CA",
      "name": "California",
      "law": "California Consumer Privacy Act, as amended by the CPRA",
      "effective": "YYYY-MM-DD",
      "rights": ["know", "delete", "correct", "opt-out-sale", "opt-out-targeted-ads"],
      "authorityUrl": "https://...",  // enforcing state agency
      "notes": "..."
    }
  ]
}
```

Only states with an enacted comprehensive privacy law are included; see
[`docs/BACKLOG.md`](../../docs/BACKLOG.md) for the story tracking full coverage.

# Data quality (Datenqualität)

Every playground is assigned one of three data-quality states based on how thoroughly it is documented in OpenStreetMap. The state is computed from a fixed set of OSM tag criteria — it is not a universal mapping standard but a practical indicator for the tags that make a playground entry most useful to visitors.

The label key `completeness.label` (`"Datenqualität"` / `"Data quality"`) can be used wherever the concept needs a heading.

## Criteria

Three independent criteria are evaluated per playground:

| Criterion | Satisfied when |
|---|---|
| **hasPhoto** | At least one `panoramax` or `panoramax:*` tag is present |
| **hasName** | A `name` tag is present |
| **hasInfo** | Any one of `operator`, `opening_hours`, `surface`, or `access` (with a value other than `yes`) is present |

Each criterion is satisfied by the presence of **any** qualifying tag — `hasInfo` does not require all four tags.

## States

| State | Rule | Color |
|---|---|---|
| `complete` | All three criteria satisfied | Green |
| `partial` | At least one criterion satisfied | Yellow |
| `missing` | No criteria satisfied | Red |

## Implementation

The logic is maintained in two mirrored places that must stay in sync:

- **Frontend**: `app/src/lib/completeness.js` — `playgroundCompleteness(props)`
- **Database**: `importer/api.sql`, CTE `completeness_attrs` (around line 110) — used to populate the `playground_stats` materialized view

Run `make db-apply` after changing the SQL definition to rebuild the materialized view.

## Locale keys

All UI strings live under the `completeness.*` namespace in `locales/de.json` and `locales/en.json`.

| Key | DE | EN |
|---|---|---|
| `completeness.label` | Datenqualität | Data quality |
| `completeness.complete` | Fotos, Name & Details vorhanden | Photos, name & details available |
| `completeness.partial` | Teilweise erfasst | Partially mapped |
| `completeness.missing` | Noch keine Daten | No data yet |
| `completeness.badgeComplete` | Vollständig | Complete |
| `completeness.dotComplete` | Daten vollständig | Data complete |
| `completeness.dotPartial` | Teilweise erfasst | Partially mapped |
| `completeness.dotMissing` | Daten fehlen | No data |
| `completeness.restrictedHint` | schraffiert = nicht öffentlich | hatched = not public |

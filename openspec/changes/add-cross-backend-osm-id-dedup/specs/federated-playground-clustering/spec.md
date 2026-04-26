## ADDED Requirements

### Requirement: Hub deduplicates overlapping playgrounds by `osm_id` at VectorSource insertion

In hub mode, when two or more registered backends serve the same playground (overlapping coverage — e.g. a city backend inside a state backend, both shipping that city's playgrounds), the hub SHALL render exactly one feature per `osm_id` in each shared `VectorSource`. The merge rule is deterministic: prefer the feature whose backend reports the freshest `last_import_at`, with `null` always losing and ties broken by URL alphabetical so the outcome is stable across refresh cycles and arrival orderings.

#### Scenario: Two backends share an `osm_id`, fresher `last_import_at` wins

- **WHEN** backend A and backend B both return a feature with `osm_id = 12345`, A's `get_meta` reported `last_import_at = 2026-04-25T03:00Z` and B's reported `2026-04-26T03:00Z`
- **THEN** the hub's polygon `VectorSource` contains exactly one feature with `osm_id = 12345`
- **AND** that feature's `_backendUrl` property equals B's URL (B is fresher)
- **AND** that feature's `_lastImportAt` property equals `2026-04-26T03:00Z` (frozen at insertion time)

#### Scenario: Null `last_import_at` always loses

- **WHEN** backend A reports `last_import_at = null` (e.g. pre-`add-federation-health-exposition` backend, or first-import not yet completed) and backend B reports any non-null timestamp
- **THEN** the kept feature comes from backend B
- **AND** the rule applies symmetrically — non-null beats null in either arrival order

#### Scenario: Equal or both-null timestamps tie-break by URL alphabetical

- **WHEN** backends A and B both report identical `last_import_at`, OR both report `null`
- **THEN** the kept feature comes from whichever backend's URL sorts first lexicographically
- **AND** swapping the order in `registry.json` does NOT change the winner — the URL string itself is the load-bearing key, not registry position

#### Scenario: Refresh cycle does not flip the winner on stable inputs

- **WHEN** the registry-poll refresh fires and re-fetches `get_meta` and the bbox-tier features from both backends, with neither backend's `last_import_at` having changed
- **THEN** the same backend remains the winner for every shared `osm_id`
- **AND** no transient swap is observable in the rendered polygon source

#### Scenario: Refresh cycle flips the winner when one backend imports newer data

- **WHEN** the previously-losing backend's `last_import_at` advances past the previously-winning backend's `last_import_at` between two refresh cycles
- **THEN** at the next refresh, the winner flips to the now-fresher backend for every shared `osm_id`
- **AND** the previously-winning feature is removed from the source by `removeFeature` before the new feature is added

#### Scenario: Comparison treats ISO timestamps numerically

- **WHEN** the two competing `last_import_at` values represent the same instant but are serialised in different timezone formats (e.g. `2026-04-25T12:00:00Z` from one backend and `2026-04-25T14:00:00+02:00` from another)
- **THEN** the comparison declares them equal (as `Date.parse(a) === Date.parse(b)`) and falls through to URL alphabetical
- **AND** the comparison MUST NOT use lexicographic string compare — that flips the winner non-deterministically based on the chosen TZ format

#### Scenario: Existing-feature age is read from the feature, not the live backends store

- **WHEN** the hub is mid-refresh on backend A — A's `backends`-store entry has *already* been updated to A's new `last_import_at` — and the dedup loop compares A's incoming feature against an existing feature owned by A from the previous cycle
- **THEN** the existing feature's `_lastImportAt` (frozen at insertion time on the previous cycle) is used as the comparator, NOT the live `backends.find(b => b.url === url)?.lastImportAt` value
- **AND** the dedup outcome is independent of the order in which the backends-store update and the dedup loop run within a single refresh

#### Scenario: Single backend per `osm_id` is a no-op

- **WHEN** backend A returns a feature with `osm_id = 12345` and no other backend covers that playground
- **THEN** the feature is added to the source as-is
- **AND** no compare or remove is performed
- **AND** the feature carries `_backendUrl` and `_lastImportAt` from backend A

#### Scenario: Cluster tier is not affected

- **WHEN** the dedup runs at the polygon tier (zoom > `clusterMaxZoom`)
- **THEN** the cluster tier's Supercluster kd-tree merge (existing behaviour from this same capability) operates independently — it merges by spatial proximity on `[lon, lat]`, not by `osm_id`
- **AND** the polygon-tier dedup does NOT touch the cluster tier's `VectorSource`

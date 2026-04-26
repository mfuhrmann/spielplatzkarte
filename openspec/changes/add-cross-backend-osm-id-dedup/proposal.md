## Why

Hub mode supports overlapping backend coverage as a deliberate topology — a Fulda city backend can run alongside a Hessen state backend, and both contain the Fulda playgrounds. After fan-out, the OL `VectorSource` ends up with multiple polygon features carrying the same `osm_id`. Today's behaviour is undefined: the OL click handler picks "the first match", deep-link restore logs `[deeplink] osm_id X matched 2 backends` and proceeds non-deterministically, and which backend's polygon "wins" depends on response-arrival ordering across moveends.

Issue #202 named this and pointed at an `openspec/changes/add-import-timestamps-and-dedup/` directory that was never drafted. PR #295 attempted an implementation and was rejected for (a) coordinating with the wrong names against `add-federation-health-exposition` and (b) shipping multiple correctness bugs in the dedup loop itself (lexicographic ISO compare, O(N²) lookup, stale-removal-then-compare race, missing branches). This change sets the contract that any clean re-implementation must satisfy — independent of where the implementation lands.

## What Changes

- **Frontend (`app/src/hub/registry.js`)**: introduce a per-`VectorSource` deterministic merge rule applied at backend-arrival time. After removing the current backend's prior features (the existing stale-removal step), pre-index the remaining features as `Map<osm_id, feature>`. For each incoming feature, look up by `osm_id`:
    - If absent → push to `toAdd`.
    - If present → compare `last_import_at` (numeric `Date.parse`) with the existing feature's frozen-at-insertion `_lastImportAt`. Newer wins; null always loses; ties broken by URL alphabetical for absolute determinism.
    - If incoming wins → `vectorSource.removeFeature(existing)` + `toAdd.push(incoming)`. If existing wins → drop incoming.
- **Feature property contract**: every kept feature carries
    - `_backendUrl` (already shipped by the federation work) — which backend the feature came from
    - `_lastImportAt` (new) — frozen value of that backend's `last_import_at` *at the time this feature was inserted*, NOT a live read from the backends store. This is load-bearing: the live backends-store entry is mutated mid-cycle when a backend refreshes, so a live read produces the silent-drop bug PR #295 hit.
    - `_relationId` (new — but conditional on `add-federation-health-exposition` shipping `relation_id` in `get_meta`) — kept as an opaque sentinel for any future cross-backend disambiguation; consumers in this change SHALL NOT read it.
- **Single `addFeatures(toAdd)`** after the per-backend loop completes — no incremental adds inside the loop, to keep the source's `change` event cycle predictable.
- **Tests**: Playwright fixture exercising two backends with overlapping `osm_id`; deterministic winner-by-`last_import_at`; refresh stability (no flicker across polls); URL-alphabetical tie-break.
- **Docs**: `docs/reference/federation.md` gains a "Cross-backend dedup" subsection naming the contract.

Out of scope (explicit non-goals):

- Server-side aggregation or de-duplication. Backends still ship their full feature sets; the merge is purely client-side.
- Region-of-truth assignment (e.g. "Fulda always wins for Fulda playgrounds"). That requires per-osm_id metadata that doesn't exist today; track separately if a use case appears.
- Cluster-tier dedup. The cluster tier already merges via Supercluster's kd-tree on `[lon, lat]` — see archived `add-federated-playground-clustering` D-section. This change is polygon-tier only.
- Modifications to `get_meta` shape. The `last_import_at` field is provided by `add-federation-health-exposition`; this change consumes it.
- The implementation in PR #295. That PR is rejected for review in its current form; re-author against the contract here.

## Capabilities

### Modified Capabilities

- `federated-playground-clustering`: gains a new Requirement "Hub deduplicates overlapping playgrounds by `osm_id` at VectorSource insertion".

## Impact

- `app/src/hub/registry.js` — `loadBackend()` gains the index-and-compare loop after the stale-removal step.
- Each polygon feature gains `_lastImportAt` and (conditionally) `_relationId` properties.
- `tests/hub-multi-backend.spec.js` (or a new `tests/hub-dedup.spec.js`) — Playwright coverage for the new contract.
- `docs/reference/federation.md` — new "Cross-backend dedup" subsection.
- No changes to: `importer/api.sql`, `importer/import.sh`, `oci/app/`, `compose.yml`, the OL VectorSource subclass, the cluster tier, the polygon-tier RPC contract, or any non-hub frontend code.

## Dependencies

- **`add-federation-health-exposition`** (in flight, issue #194) provides the `last_import_at` field on `get_meta` that this change's merge rule consumes. If the federation-health change is delayed, this change's tasks document a degraded-mode fallback (URL-alphabetical only — deterministic but not freshness-aware) so the dedup contract still holds; the freshness-tiebreak adds value as soon as the upstream lands.
- **`add-federated-playground-clustering`** (archived 2026-04-26) provides the per-feature `_backendUrl` tagging that the merge rule reads. No new dependency surfaces here.

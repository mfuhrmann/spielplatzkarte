## Context

Federation hub mode (`add-federated-playground-clustering`, archived 2026-04-26) fans out per-backend playground RPCs in parallel and renders results into a shared OL `VectorSource`. The cluster tier collapses cross-backend overlap via Supercluster's kd-tree merge on `[lon, lat]`. The polygon tier has no such merge — each backend's `get_playgrounds_bbox` response is appended to the source as-is.

In a non-overlapping topology this is harmless: each `osm_id` exists at exactly one backend. In an overlapping topology — which is a deliberate, supported configuration (issue #251 tracks the InstancePanel UI for it) — the same playground is served by ≥ 2 backends. Today the source ends up with N copies of that feature; OL's hit-detection picks one in arrival order; deep-link restore logs `[deeplink] osm_id X matched 2 backends` and proceeds non-deterministically.

Issue #202 named the problem and proposed dedup. The openspec change directory was never created. PR #295 attempted an implementation directly. Code review rejected it for (a) using table/field names that conflict with the in-flight `add-federation-health-exposition`, (b) string-comparing ISO timestamps lexicographically (TZ-format-sensitive), (c) reading `osmDataAge` from a live backends-store entry that gets mutated mid-cycle (silent drops on the fresher backend's own refresh), (d) O(N²) per-feature lookup, and (e) missing branches for the four corner cases in `(existingAge ± null) × (incomingAge ± null)`. This proposal sets the contract that a clean re-implementation must satisfy.

## Goals / Non-Goals

**Goals:**

- Deterministic which-feature-wins rule for any `osm_id` present at ≥ 2 backends.
- O(N + M) per backend join, not O(N × M).
- Stable across refresh cycles — a backend's refresh-poll must not transiently swap winners.
- Compatible with the existing federation surface — no new RPC fields beyond what `add-federation-health-exposition` already adds.
- Behaviour observable in the existing `[deeplink]` logging path so a future regression surfaces as a logged inconsistency rather than silent click misrouting.

**Non-Goals:**

- Server-side filtering. Backends keep shipping their full bbox-scoped feature sets; the merge is purely client-side.
- Region-of-truth assignment. "Fulda's polygons always win for Fulda playgrounds" needs per-osm_id metadata that doesn't exist; if it becomes a hard requirement, ship as a separate proposal that adds an `authoritative_region` field somewhere.
- Cluster tier. Already covered by Supercluster (different mechanism, different merge key).
- Cross-source merging across the polygon and cluster tiers. They render in disjoint zoom ranges and are independent VectorSources.
- Selection-store changes. The selection store already keys on `(osm_id, backendUrl)`; dedup happens at insertion time, before selection is involved.

## Decisions

### D1 — Dedup at VectorSource insertion time, not at fetch time

The merge runs in `app/src/hub/registry.js` `loadBackend()` after the stale-removal step (the existing `vectorSource.removeFeatures(stale)` line). Alternative locations considered and rejected:

- **At fetch time, before adding to source**: would require deduping the in-memory backends array of pending features, then a single batched insert. Adds memory pressure (hold N backends' results before any render) and breaks the existing progressive-render contract from `add-federated-playground-clustering` §3.2.
- **In an OL `VectorSource` subclass** (`addFeature` override): the cleanest separation, but introduces a new module and ties dedup to the source rather than to the federation flow. Reserve for a future refactor if dedup logic grows.
- **At selection time**: too late — the source still holds duplicates, OL's spatial index still sees N features per spot, hover preview still picks arbitrarily.

Insertion-time dedup runs once per backend join, lives next to the per-backend stale-removal it pairs with, and stays under the existing `loadBackend` lock.

### D2 — Compare by `last_import_at` (numeric), tie-break by URL alphabetical

The merge rule for two features sharing an `osm_id`:

1. Both have `last_import_at` → newer wins (numeric `Date.parse(a) - Date.parse(b)`).
2. One has `last_import_at`, the other null → the one with a value wins.
3. Both null OR equal `last_import_at` → URL alphabetical (lower URL string wins).

The numeric compare via `Date.parse` is mandatory — the rejected PR #295's lexicographic string compare flips winners non-deterministically when two backends emit the same instant in different ISO TZ formats (`2026-04-25T12:00:00Z` vs `2026-04-25T14:00:00+02:00`).

URL-alphabetical tie-break is chosen over "first arrival" because:

- Arrival order is non-deterministic across moveends (parallel fan-out).
- URL is stable across the session (registry doesn't re-rank backends).
- Easy to reason about in test expectations.

### D3 — Stamp `_lastImportAt` on the kept feature, frozen at insertion time

Each kept feature carries:

- `_backendUrl` (already shipped by `add-federated-playground-clustering`).
- `_lastImportAt` (new) — the value of `backend.lastImportAt` *at the moment this feature was inserted*. Subsequent reads MUST come from the feature, not from the live backends store entry.

The "frozen value" requirement is load-bearing. PR #295 read the existing-feature's age via `backends.find(b => b.url === existing.get('_backendUrl'))?.osmDataAge`, which is a *live* read of the backends store. By the time a fresher backend's refresh poll fires, its store entry has already been mutated to the new `last_import_at` *before* the dedup loop runs. The comparison `incomingAge > existingAge` then evaluates `freshAge > freshAge → false`, the feature is dropped, and the fresher backend's polygons silently disappear from the source on every refresh. Reading from the feature's own `_lastImportAt` (which was frozen on the previous insertion) avoids the data-race entirely.

### D4 — Pre-index existing features as `Map<osm_id, feature>` once per backend join

For an N-feature backend joining a source already holding M features, the cost should be O(N + M):

- Build the `Map<osm_id, feature>` over M existing features once, before the per-incoming loop.
- Per-incoming look-up is O(1).

PR #295's `vectorSource.getFeatures().find(f => f.get('osm_id') === osmId)` was O(N × M) — at federation scale (5 backends × 1k features) it ran 5M scans per refresh and blocked the main thread. Reject any future implementation that doesn't pre-index.

### D5 — Null `last_import_at` always loses

A backend that hasn't reported `last_import_at` (either because `add-federation-health-exposition` hasn't merged yet, or because that backend hasn't completed its first import) is never preferred over one that has. This is a deliberate bias toward fresh information when partial information exists.

If both have null, fall through to URL alphabetical (D2 step 3). The rule is total: every `(existing, incoming)` pair has a deterministic winner.

### D6 — Degraded-mode fallback if `add-federation-health-exposition` is delayed

If this change ships before `add-federation-health-exposition`, every backend's `last_import_at` is null. D5 means every comparison falls through to URL-alphabetical. The dedup contract still holds — the source has exactly one feature per `osm_id` and the choice is deterministic — but it's not freshness-aware. Once the upstream change lands, the freshness-tiebreak activates without any code change in this module.

This is intentional: it lets the dedup work ship independently if the federation-health work hits a delay.

### D7 — Single `addFeatures(toAdd)` at the end of the loop, not per-feature

OL's `VectorSource.addFeature` fires `change` events synchronously per call. The polygon-tier renderer reacts to `change` to repaint. Per-feature inserts → N repaints per backend join. Use `addFeatures(toAdd)` once after the loop so the renderer paints the merged set in a single cycle.

The corresponding `removeFeature(existing)` calls inside the loop are unavoidable (the loser must be evicted before its replacement can be added by `addFeatures`), but their `change` events are batched against the subsequent `addFeatures` by OL's existing event coalescing.

## Risks / Trade-offs

- **Pan flicker on `last_import_at` change.** If a backend's refresh-poll arrives with a slightly different `last_import_at` than the previous cycle (importer ran between polls), a feature that was the winner might transiently swap to the other backend before the next refresh re-stabilises. In practice `add-federation-health-exposition`'s import cadence is on the order of hours-to-days, polls are every 5 minutes, and observed flicker should be effectively never.
- **URL-alphabetical bias.** When tie-breaking on equal/null ages, URL ordering is not policy — it's coincidental. If a deployment names backends `a-fulda` and `z-hessen`, the city backend wins ties; rename to `z-fulda` and the state backend wins. Document this in the dedup section so operators understand the tie-break.
- **`_relationId` carries opaque payload with no consumer in this change.** Tagging features with `_relationId` is speculative state until a future change consumes it. Keeping it conditional on `add-federation-health-exposition` shipping `relation_id` (which it already does) means we don't ship dead data on pre-FHE backends. Cleaner to drop entirely if no consumer materialises within two release cycles.
- **OL `getFeatures()` snapshot vs Map staleness.** The `Map<osm_id, feature>` is built once per backend join. Within one join, a `removeFeature(existing)` call followed by another lookup for the same osm_id — possible if the incoming backend somehow has duplicate features for the same `osm_id` *within its own response* — would still find the removed feature in the Map. Mitigation: dedup within a single backend's response is the upstream's problem; if it ships duplicates, the second-seen wins (Map gets overwritten). Document.
- **Selection-store invalidation.** If the user has selected feature `osm_id=X` from backend A, and backend B's refresh causes A's feature to be evicted, the selection store still holds a reference to the now-removed feature. The selection store already keys on `(osm_id, backendUrl)` per `add-federation-health-exposition`'s spec, but the displayed polygon disappears. Mitigation: surface a one-time toast / log when this happens; defer to a follow-up if the UX is observed to be confusing.

## Migration Plan

None. This is a frontend-only behaviour change that activates as soon as the new code ships. Existing deployments see one feature per `osm_id` from the next moveend onward; no schema migration, no data backfill, no operator action.

## Open Questions / Follow-ups

- **Region-of-truth field on `get_meta`?** A future proposal could add `authoritative_relation_ids: [62700, ...]` so a state-level backend can declare "I'm authoritative for these relation IDs" and the dedup rule could prefer it over a city backend whose relation_id is contained. Out of scope here; track if operators ask.
- **Source-subclass refactor?** If dedup logic grows (e.g. cluster-tier dedup, or a federation-wide selection store), a `DedupingVectorSource extends VectorSource` is the cleaner home. Defer until there are ≥ 2 use cases.
- **Selection-store reconciliation when winner changes** — flagged in Risks. Track if observed.

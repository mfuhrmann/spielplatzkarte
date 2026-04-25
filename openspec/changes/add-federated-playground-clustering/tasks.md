## 1. Hub — bbox routing and backend metadata

- [x] 1.1 Backend `bbox` is cached on the existing registry-poll path (`app/src/hub/registry.js::loadBackend`); this section augments it with the new fields rather than introducing a separate `backends.js`.
- [x] 1.2 `backends` readable store now emits per-entry `playgroundCount` and `completeness: {complete, partial, missing}` populated from `get_meta` (the P1 extension). JSDoc shape comment updated.
- [x] 1.3 New pure module `app/src/hub/bboxRouter.js` exports `selectBackends(viewportBbox, backends)` — bbox intersection filter (touch counts).
- [x] 1.4 Bboxes refresh on the existing 5-min registry poll (`schedulePoll` re-runs `loadBackend` for every entry, which re-reads `get_meta`).
- [x] 1.5 New `app/src/hub/federationHealth.js` exposes `isBackendHealthy` + `filterHealthy` — **stubbed** to "always healthy" with a clear module comment. Real implementation lands when `add-federation-health-exposition` ships `/federation-status.json`.

## 2. Hub — fan-out with progressive render

- [x] 2.1 New `app/src/hub/fanOut.js` exports `fanOut({ fetcher, backends, signal, onResult, timeoutMs })`. Invokes the fetcher per-backend in parallel; `onResult` callback fires per-arrival for progressive render.
- [x] 2.2 One inner `AbortController` aborts every in-flight request together; honours a parent `signal` from the orchestrator.
- [x] 2.3 Per-backend timeout defaults to 5000 ms; timed-out backends are warned exactly once per session (module-level Set tracks the warning).
- [x] 2.4 Errors are caught and surfaced as `{ ok: false, error, backendUrl }`; the fan-out promise resolves with every backend's outcome rather than rejecting.

### Review Findings — §1 + §2 foundation, Pass 1 (bmad-code-review, 2026-04-25)

#### Medium
- [x] [Review][Patch] **Pre-P1 backend indistinguishable from zero playgrounds**. `meta.complete ?? 0` collapses missing fields and a 0 result into the same shape, so a legacy backend (no `get_meta` extension) renders as healthy-but-empty in the macro view. Use a `null` sentinel for `completeness` whenever any of the three fields is absent. [app/src/hub/registry.js loadBackend + initial state] (Medium)
- [x] [Review][Patch] **Backends store mutates entries in place**. `backend.bbox = …` etc. doesn't change object identity, defeating any future memoised consumer (macro-view rings keyed by `prev[i] === curr[i]`). Replace with `backends[idx] = { ...backend, ...patch }` so identity changes on every update. [app/src/hub/registry.js loadBackend] (Medium)

#### Low
- [x] [Review][Patch] **Antimeridian bbox silently dropped**. `bboxesIntersect` assumes `minLon ≤ maxLon`. A backend with bbox crossing ±180° won't match any normal viewport. No active deployment hits this today, but document the limitation in the function header. [app/src/hub/bboxRouter.js] (Low)
- [x] [Review][Patch] **`selectBackends([NaN,...], …)` silently excludes everything**. Every numeric comparison against `NaN` is false, so a viewport tuple containing NaN looks like a valid bbox to the truthiness check but filters out every backend. Add a finite-number guard. [app/src/hub/bboxRouter.js] (Low)
- [x] [Review][Patch] **`fanOut` fetcher not validated** — a missing/non-function fetcher rejects every task with the same error, masking the bug at the call site. Defensive guard with a clear throw. [app/src/hub/fanOut.js] (Low)
- [x] [Review][Patch] **Two timers per backend race the warn-once log**. The cosmetic warning timer can fire just before the abort timer if both land in the same tick. Merge into a single timer that warns then aborts. [app/src/hub/fanOut.js] (Low)
- [x] [Review][Patch] **Per-backend `AbortController` layering reads as redundant**. Add an inline comment so a future cleanup doesn't strip it (it's load-bearing for "one slow peer doesn't kill the others"). [app/src/hub/fanOut.js] (Nit)

#### Deferred (scope / pre-existing)
- **`_warnedTimeoutBackends` never resets** (potential leak; suppresses second-degradation warns). LRU/reset belongs with the §5 observability story. Defer.
- **No Vitest unit tests** for the pure modules. Same deferral as P1 §7.1; project doesn't ship a unit-test runner. Track for the eventual runner addition.
- **federationHealth stub doesn't emit "absent" warning**. Spec scenario lives with the real impl in `add-federation-health-exposition`. Defer.
- **`fetchMeta` strips unknown fields at the registry boundary** (forward-compat fragility). Real fix is to whitelist or pass-through; flag for §5 if it grows new fields.

### Dismissed
- Blind: bbox edge-touch counts. Intentional — matches OL viewport semantics.
- Edge: tests/helpers.js doesn't mock the new completeness fields. Existing tests don't assert on them; will be added when §5 wires the macro view.
- Edge: `signal?.removeEventListener` in finally with `once: true` listeners. Verified self-correcting.
- Auditor: `playgroundCount` / `completeness` not strictly required by any §1 spec scenario — they are inputs to §4/§5. Foundation work is justified by the proposal's "What Changes" list.

## 3. Hub — zoom-tier orchestrator

- [x] 3.1 New `app/src/hub/hubOrchestrator.js` — moveend-driven, debounced 300 ms, mirrors P1's `tieredOrchestrator.js`. `HubApp.svelte` attaches it once the map publishes; the registry's eager `get_playgrounds` fetch is gone (registry is now metadata-only).
- [x] 3.2 Two tiers wired (post-pivot, matching P1's two-tier client design — centroid tier dropped). `cluster` → `fanOut(fetchPlaygroundClusters, ...)`; `polygon` → `fanOut(fetchPlaygroundsBbox, ...)`. Centroid RPC stays server-shipped for future federation reuse.
- [x] 3.3 New `'macro'` tier — added new `macroMaxZoom` config (default 5). At `zoom ≤ macroMaxZoom` the orchestrator sets `activeTierStore = 'macro'`, clears feature sources, and fires no fan-out; the actual macro-view rendering lives in §5 and reads `backendsStore` directly.
- [x] 3.4 Each `orchestrate()` call aborts the prior fan-out's `AbortController` before constructing a new one; `fanOut` then propagates abort to every per-backend request via its inner controller.
- [x] 3.5 New `app/src/stores/hubLoading.js` writable `{loaded, total, settling}`. Orchestrator updates per `fanOut.onResult` arrival; consumers (instance pill in §5 follow-up) can render "3/5 regions loaded" partial state.

### Review Findings — §3 hub orchestrator, Pass 1 (bmad-code-review, 2026-04-25)

#### High
- [x] [Review][Patch] **Hub deeplinks hang at low zoom**. `tryRestoreFromHash` previously relied on the registry's eager `get_playgrounds` populating the polygon source; with the orchestrator-driven fetch, the polygon source stays empty at cluster + macro tiers. Restore hub-mode hydration via `fetchPlaygroundByOsmId(parsed.osmId, slugResolvedUrl)` when `parsed.slug && resolveSlugToBackendUrl` is present. Slug-less hub broadcast deeplinks remain a defer (no good way to choose a backend). [app/src/components/AppShell.svelte tryRestoreFromHash] (High)
- [x] [Review][Patch] **Hub Playwright tests will fail**. `stubHubRegistry` in `tests/helpers.js` doesn't route `/rpc/get_playground_clusters`, `/rpc/get_playgrounds_bbox`, or `/rpc/get_playground`; the meta fixture omits `playground_count` + completeness fields so InstancePanel pill renders "0 playgrounds". Extend the stub. [tests/helpers.js] (High)
- [x] [Review][Patch] **Initial fit can land at macro tier on multi-backend hubs** → empty map until §5 macro-view component ships. Add fit-clamp: when ≤ 1 backend, `maxZoom: clusterMaxZoom + 1`; for multi-backend hubs that union to a low-zoom fit, fit to a maxZoom that keeps cluster tier active until §5. [app/src/hub/HubApp.svelte tryFit] (High — covers spec §6.1 ahead of schedule)

#### Medium
- [x] [Review][Patch] **Hub has no per-backend legacy fallback**. Standalone falls back to `fetchPlaygrounds(relation_id)` once per session if any tier RPC 404s; hub silently sees `entry.ok=false` per backend forever. Track per-backend `useLegacy` Set in the orchestrator; on first 404 for a backend, log once and route subsequent fan-outs for that backend through `fetchPlaygrounds`. [app/src/hub/hubOrchestrator.js] (Medium)
- [x] [Review][Patch] **N source.clear()+addFeatures cycles per moveend**. Each backend arrival rebuilds the entire source. Switch to: clear source on the *first* arrival (so stale features clear cleanly), then `addFeatures(newFeatures)` incrementally for subsequent arrivals. [app/src/hub/hubOrchestrator.js fillClusterSource / fillPolygonSource] (Medium)
- [x] [Review][Patch] **Spec doc out of sync**. `specs/.../spec.md` still uses `clusterMaxZoom` for the macro threshold; code introduced `macroMaxZoom` (default 5). Update spec wording to match implementation. [openspec/.../spec.md] (Medium)

#### Nit
- [x] [Review][Patch] **O(N²) selected.find per polygon arrival**. Build a `Map<url, backend>` once before the fan-out and look up by key per onResult. Trivial, future-proofs as backend count grows. [app/src/hub/hubOrchestrator.js polygon tier] (Nit)

#### Deferred (out of §3 scope)
- **`hubLoadingStore` no consumer yet** — pill still uses pre-existing `firstLoadSettled` latch. Wire in §5 follow-up when InstancePanel updates land alongside the macro-view component.
- **`detachAttach()` race in HubApp** — only fires on map remount (HMR/dev). Latent.
- **macroMaxZoom in standalone entrypoint as dead config** — harmless; standalone reads but never uses it.
- **Empty `selected` (Pacific pan) renders nothing with no message** — UX cliff but acceptable for §3 scope; address with a "no backends in this region" overlay in §5 if it surfaces in usage.
- **`accumulated` unbounded** — same exposure as P1 standalone (pre-existing).

## 4. Hub — client-side re-clustering

- [x] 4.1 Cluster tier in `hubOrchestrator.js` now feeds each backend's server buckets into a per-fan-out Supercluster instance as weighted points. The `map` callback projects the per-bucket counts into the cluster properties; the `reduce` callback sums `{count, complete, partial, missing, restricted}` so cross-backend merges at borders render as a single seamless ring instead of two overlapping ones. `supercluster` dep reinstated (was uninstalled during the P1 two-tier pivot).
- [-] 4.2 ~~Centroid tier Supercluster~~ **N/A in the two-tier design** (centroid tier was dropped during the P1 pivot). The `get_playground_centroids` RPC still ships server-side for federation reuse but the client doesn't index it.
- [x] 4.3 Polygon tier already concatenated per-backend results into a single source in §3 (`fillPolygonSource` + per-feature `_backendUrl` / `_backendSlug` stamping in `parsePolygonFeatures`).
- [x] 4.4 On each fan-out partial arrival the cluster Supercluster index is reloaded with the accumulated set and the source is re-rendered; `load` is O(N) and well under a millisecond at cluster-tier viewport sizes.

### Review Findings — §4 Supercluster, Pass 1 (bmad-code-review, 2026-04-25)

#### High
- [x] [Review][Patch] **NaN propagation in `reduce` if any bucket count field is missing**. Only `restricted` is defensively coerced to `0`. If a backend ever omits `count/complete/partial/missing`, every downstream cluster renders with `NaN` counts. Coerce all five fields in `bucketToSuperclusterPoint`. [hubOrchestrator.js bucketToSuperclusterPoint] (High)
- [x] [Review][Patch] **Legacy backend at cluster tier downloads its entire region** via `fetchPlaygrounds(baseUrl)` and discards the result. Wasted bandwidth + invisible region with no UI signal. Skip the fetch entirely and return `[]` for legacy backends at cluster tier; the user sees a hole until they zoom past `clusterMaxZoom` (where legacy fetch is reused at the polygon tier). [hubOrchestrator.js clusterFetcherFor] (High)
- [x] [Review][Patch] **`cluster_id` emitted on multi-backend cluster features but never consumable** — `sc` is local to `orchestrate()` and GC'd before any click handler could call `sc.getClusterExpansionZoom`. Strip `cluster_id` so the API doesn't suggest a capability that isn't there. (Re-add when a future click handler retains the index.) [hubOrchestrator.js superclusterFeatureToOl] (High)
- [x] [Review][Patch] **Supercluster radius mismatch with OL tile model**. Default `extent: 512` doubles the effective clustering radius vs the OL 256-px tile expectation. Pass `extent: 256` so the radius corresponds to the grid the server cells were sized against. [hubOrchestrator.js Supercluster constructor] (High)

#### Medium
- [x] [Review][Patch] **Redundant `clusterSource.clear()` on first arrival**. The first-arrival latch clears, but the body's clear-and-fill on every arrival makes that latch dead. Remove the latch in the cluster branch (the polygon branch still needs it). [hubOrchestrator.js cluster onResult] (Medium)
- [x] [Review][Patch] **Spec scenarios mention only three counts**, code sums five. Update spec scenarios to include `restricted` so they match the rendered four-segment ring (matches the P1 amendment that already shipped). [openspec/.../spec.md re-cluster + macro scenarios] (Medium)

#### Deferred (out of §4 scope)
- **`hubLoadingStore.loaded` increments on legacy-discarded responses** — masks "this backend silently degraded" in the spinner. Surface a separate `degraded` count when wiring the InstancePanel consumer in §5.
- **Per-moveend Supercluster allocation churn** — could memoise on `(selected, accumulated hash)`. Acceptable today; revisit if rapid-pan jank is observable.
- **Cluster click → `getClusterExpansionZoom` integration** — requires persisting `sc` across orchestrations. Architectural; defer.
- **Antimeridian viewport** — same gap as bboxRouter; document.
- **`p.restricted ?? 0` already defended in bucketToSuperclusterPoint** — verified self-correcting after the High #1 patch.

## 5. Hub — country-level macro view (zoom 0–5)

- [x] 5.1 Created `app/src/hub/MacroView.svelte` — subscribes to the registry's backends store and rebuilds one OL Point feature per backend at the backend's bbox centroid (EPSG:3857). Mounted as a side-effect-only child of `HubApp.svelte`; the source is owned by the hub and threaded through `AppShell` to `Map.svelte`.
- [x] 5.2 New `app/src/hub/macroRingStyle.js` parallels the cluster renderer: same legend palette, same `radiusForCount` size scale (now exported from `clusterStyle.js`), but always renders as a ring (no count<=1 dot fallback) and uses the four-segment layout with the P1 `restricted` arc. Pre-P1 backends with `completeness: null` render as a flat gray ring (count routed into the restricted bucket — visual signal "data quality unknown" rather than a misleading healthy zero).
- [x] 5.3 Offline backends — flagged on the feature via `_offline: !isBackendHealthy(backend)` — render with the dashed stroke-only `OFFLINE_STROKE`, a muted inner disc, the last-known count, and a small "offline" label. Currently `isBackendHealthy` is the stub from §1.5 (always true); the wiring is forward-compatible with the real `federation-status.json` signal from `add-federation-health-exposition`.
- [x] 5.4 Macro hits in `Map.svelte`'s click handler animate `view.fit(transformExtent(bbox4326, ...))` with the standard 420 px left padding for the side panel; the orchestrator's debounced moveend then lands in the cluster or polygon tier and fan-out scopes naturally to the clicked backend.
- [-] 5.5 ~~Hover tooltip with region name, count, data freshness~~ — **deferred to a §5 follow-up**. The feature carries `_name`, `count`, and `_offline` props ready to consume; the existing `HoverPreview` is wired for playground polygons rather than rings, so wiring the macro tooltip needs a small dedicated tooltip component. Tracked as a Known Limitation rather than a §5 blocker since the macro ring's visual already conveys count + completeness + offline state.
- [x] 5.6 Tier-driven visibility extended in `Map.svelte::tierUnsubscribe` — `macroLayer.setVisible(tier === 'macro')`. The orchestrator already publishes `'macro'` for `zoom ≤ macroMaxZoom` (separate config knob from `clusterMaxZoom`, see §3.3).

## 6. Hub — initial map fit clamp

- [x] 6.1 `HubApp.svelte::tryFit` reads `get(backends).length` at fit time. With ≤ 1 backend the fit options carry `maxZoom: clusterMaxZoom + 1`, so a single small region cannot land in the macro tier. The §3 review pre-shipped a universal clamp; §5 narrowed it to single-backend so multi-backend continent overviews can use the macro view.
- [x] 6.2 Multi-backend hubs (`backendCount > 1`) fit without `maxZoom`; the union bbox naturally lands in whatever tier it spans. With §5 macro view shipped, a low-zoom union (e.g. Germany + France) renders the macro tier with one ring per backend instead of an empty map.

## 7. Hub — filter-aware cluster badge under federation

- [ ] 7.1 At the centroid tier, the filter badge computation runs over merged centroids from all contributing backends; no per-backend change needed beyond P1
- [ ] 7.2 At the cluster tier, no filter badge (same rule as P1)
- [ ] 7.3 At the macro tier, no filter badge (decision D6 in design.md)

## 8. Docs

- [ ] 8.1 Add a "Scale and clustering" section to `docs/reference/federation.md` describing the zoom tiers, bbox routing, and the country-level macro view
- [ ] 8.2 Update `docs/ops/federated-deployment.md` (coming in `document-federated-hub-deployment`) with a note that backends must implement `add-tiered-playground-delivery` before joining a hub running this code
- [ ] 8.3 Add an architecture diagram (mermaid or simple ASCII) showing hub → bbox-router → fan-out → re-cluster → render

## 9. Verification

- [ ] 9.1 Playwright: on a two-backend test registry, load the hub at zoom 4, assert macro rings appear for both backends with correct counts; zoom in and assert transitions to cluster tier trigger fan-out to both backends
- [ ] 9.2 Playwright: disable one backend mid-test (via a proxy that returns 503); assert the macro-view ring becomes outlined and subsequent moveends skip that backend
- [ ] 9.3 Playwright: moveend across the border between two backends; assert combined clusters render without visible seams and counts sum correctly
- [ ] 9.4 Manual: on a simulated 10-backend registry, confirm fan-out completes within 2s at cluster tier over a Europe-wide viewport
- [ ] 9.5 Manual: pan rapidly across borders, confirm cancelled fetches do not leak features from previous viewports
- [ ] 9.6 Lifecycle: `federation-status.json` is removed mid-session (simulate by stopping cron); fall back to "assume reachable", log warning once
- [ ] 9.7 `openspec validate add-federated-playground-clustering` passes before archive

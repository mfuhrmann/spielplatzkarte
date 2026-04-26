## 1. Frontend — dedup at VectorSource insertion time

- [ ] 1.1 In `app/src/hub/registry.js` `loadBackend()`, after the existing `vectorSource.removeFeatures(stale)` step, build a `Map<osm_id, feature>` over the source's remaining features. Do this **once** per backend join, not per incoming feature — the rejected PR #295's per-feature `vectorSource.getFeatures().find(...)` was O(N × M).
- [ ] 1.2 Iterate the incoming features. For each, look up by `osm_id` in the map:
    - **Absent** → push to `toAdd`.
    - **Present** → invoke a pure `pickWinner(existingFeature, incomingFeature, incomingBackendUrl, incomingLastImportAt)` helper that returns `{ winner: 'existing' | 'incoming' }`. Implementation rules per design D2:
        1. Both have `last_import_at` → newer wins (compare via `Date.parse(a) - Date.parse(b)`, NOT lexicographic string compare).
        2. Exactly one is null → the non-null wins.
        3. Both null OR equal → URL alphabetical (lower string wins).
    - If `pickWinner` returns `'incoming'` → `vectorSource.removeFeature(existing)` and push incoming to `toAdd`. If it returns `'existing'` → drop incoming silently.
- [ ] 1.3 Stamp every kept feature with three properties at insertion time:
    - `_backendUrl` — the backend the feature came from (already present from `add-federated-playground-clustering`).
    - `_lastImportAt` — **frozen value** of `backend.lastImportAt` at the time of insertion. Subsequent dedup cycles read this from the *feature*, NOT from the live backends store. This is the load-bearing fix for PR #295's silent-drop bug (see design D3).
    - `_relationId` — `backend.relationId` if present, omit otherwise. No consumer in this change; reserved for future cross-backend disambiguation.
- [ ] 1.4 After the per-incoming loop completes, call `vectorSource.addFeatures(toAdd)` **once**. Do not addFeature inside the loop — per-feature inserts cause N repaints per backend join (design D7).
- [ ] 1.5 Log a single `[hub] dedup: replaced osm_id=X (backend=… newer than backend=…)` line per replacement, using the existing console-warning de-dup pattern (`Set` of seen `osm_id`s per session) so a chronic overlap doesn't flood the console.
- [ ] 1.6 Extract `pickWinner` into a sibling `app/src/hub/dedup.js` module (or inline section) with full JSDoc covering all four `(existingAge, incomingAge)` corner cases — the rejected PR's helper was inline and missed the `(null, present)` and `(equal, equal)` cases.

## 2. Tests

- [ ] 2.1 Add a `pickWinner` unit test (or in-Playwright `page.evaluate` block) covering each of the four corner cases:
    - existingAge present + incomingAge present + incoming newer → `'incoming'`
    - existingAge present + incomingAge present + existing newer → `'existing'`
    - existingAge present + incomingAge null → `'existing'`
    - existingAge null + incomingAge present → `'incoming'`
    - both null + URL alphabetical → lower-URL backend wins
    - equal `last_import_at` + URL alphabetical → lower-URL backend wins
    - String-lexicographic-trap: same instant in different TZ formats (`+00:00` vs `Z` vs `+02:00`) — winner determined by `Date.parse`, not by raw string compare.
- [ ] 2.2 Add `tests/hub-dedup.spec.js` (or extend `tests/hub-multi-backend.spec.js`) with an end-to-end Playwright fixture: two backends with overlapping `osm_id` (registry stubs both reach the same playground), assert the source contains exactly one feature with that osm_id after the cluster→polygon transition. The winning feature's `_backendUrl` matches the backend that should have won by the merge rule.
- [ ] 2.3 Refresh stability: trigger a registry-poll refresh, assert the winner is unchanged (no flicker on stable inputs). Use Playwright route stubs to control timing.
- [ ] 2.4 Refresh transition: change one backend's stub `last_import_at` to a fresher value, trigger refresh, assert the winner flips deterministically and the previously-winning feature is removed from the source.

## 3. Docs

- [ ] 3.1 In `docs/reference/federation.md`, add a "Cross-backend dedup" subsection: explains overlapping topology is supported, the merge rule (D2 in plain English), the URL-alphabetical tie-break caveat, and the consequence (operator naming choices in `registry.json` affect tie-breaks).
- [ ] 3.2 Cross-link from `docs/ops/federated-deployment.md` "Verification" section to the new dedup subsection so an operator setting up overlap knows what to expect.
- [ ] 3.3 If `_relationId` ends up unused after the implementation lands, drop it from the feature property contract (proposal + this tasks file) before merge — don't ship dead state.

## 4. Verification

- [ ] 4.1 Run `make test` — full Playwright suite passes including the new dedup spec.
- [ ] 4.2 Manual smoke (two-backend dev fixture): `make up` with a registry pointing at both `db` and `db2` backends configured with overlapping bbox; load Hub mode; click on a playground in the overlap region; confirm exactly one popup appears, deterministic across reloads.
- [ ] 4.3 Manual: trigger a `make import` on the backend that should win the merge (fresher `last_import_at`); verify after the next 5-minute registry poll that the winner remains the same backend (no flicker).
- [ ] 4.4 Manual: with both backends sharing `last_import_at` (seed fixtures), verify URL-alphabetical tie-break by swapping the registry order and confirming the winner doesn't change (URL string is the load-bearing key, not registry order).
- [ ] 4.5 Confirm the deep-link path: open a `/#W<osm_id>` link for an overlapping playground; the existing `[deeplink] osm_id X matched 2 backends` log line is replaced by a single deterministic match, or the log line still fires but the selected feature is the merge winner.

## 5. OpenSpec hygiene

- [ ] 5.1 Run `openspec validate add-cross-backend-osm-id-dedup --strict`.
- [ ] 5.2 On merge, archive this change to `openspec/changes/archive/YYYY-MM-DD-add-cross-backend-osm-id-dedup` and apply the spec delta to `openspec/specs/federated-playground-clustering/spec.md`.
- [ ] 5.3 Update issue #202: replace the dead `openspec/changes/add-import-timestamps-and-dedup/` reference with this change's path; close on archive.

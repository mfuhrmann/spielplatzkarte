## 1. Backend — import status tracking

- [ ] 1.1 Add `api.import_status` table in `importer/api.sql` — columns `id int PRIMARY KEY CHECK (id = 1)`, `last_import_at timestamptz NOT NULL`, `source_pbf_url text`, `pbf_etag text`. Place the `CREATE TABLE IF NOT EXISTS` block above the `get_meta` definition (around line ~895) so the function can reference it.
- [ ] 1.2 Modify `importer/import.sh` to `UPSERT` into `api.import_status` with `now()` on exit code 0 only. The UPSERT must run **after** the existing `psql … < /api.sql` step (currently lines ~196–199) and **before** the `NOTIFY pgrst, 'reload schema'` line (~204) — the table is created in `api.sql`, so any earlier UPSERT would fail on a fresh database. Use the same `psql -h "$POSTGRES_HOST" …` invocation pattern as the surrounding lines for environment-variable consistency.
- [ ] 1.3 Extend `api.get_meta` (currently CTEs `region`/`bbox`/`counts` → `json_build_object(...)`) with a fourth CTE `import_status AS (SELECT last_import_at FROM api.import_status WHERE id = 1)` and project both `last_import_at` and `data_age_seconds = EXTRACT(EPOCH FROM (now() - last_import_at))::int` into the existing `json_build_object`. Both fields must be present-with-`null` when the table is empty (LEFT-JOIN-style semantics) — see scenario "get_meta before any import".
- [ ] 1.4 The function is `SECURITY DEFINER`, so no `web_anon` GRANT on `api.import_status` is needed for `get_meta` to read it. If a separate PostgREST endpoint for `import_status` is desired in a follow-up, that's a separate proposal.
- [ ] 1.5 Update `dev/seed/seed.sql` so `make seed-load` populates `api.import_status` with a plausible `last_import_at` (e.g. `now() - interval '3 days'`) — the seed already appends an env-substituted copy of `api.sql`, so the new INSERT slots in cleanly.
- [ ] 1.6 Document the new field in `docs/reference/registry-json.md` under the `get_meta` response section, and remove the breadcrumb in `docs/reference/api.md` ("A `data_version` cache-bust timestamp was originally scoped here but moved to `add-federation-health-exposition`...") — replace it with the concrete `last_import_at` field documentation.

## 2. Hub container — poll + exposition

- [ ] 2.1 Add `busybox-suid` (or `dcron`, whichever is smaller on the `nginx:alpine` base image) to `oci/app/Dockerfile`. The base is already alpine-based (line 19 `FROM nginx:alpine`), so `apk add --no-cache busybox-suid` slots into a new `RUN` directive after the `COPY` lines.
- [ ] 2.2 Create `oci/app/poll-federation.sh` — reads `/usr/share/nginx/html/registry.json`, curls each backend's `get_meta` with a 3s timeout, measures latency (e.g. `date +%s%N` deltas around the curl), writes `/usr/share/nginx/html/federation-status.json` and `/usr/share/nginx/html/metrics` atomically (write to `.tmp`, rename). The script is shipped via a `COPY oci/app/poll-federation.sh /usr/local/bin/` directive in the Dockerfile.
- [ ] 2.3 Install a crontab entry (`* * * * * /usr/local/bin/poll-federation.sh >/dev/null 2>&1`) into the hub image. On `nginx:alpine` with `busybox-suid`, the canonical path is `/etc/crontabs/root`.
- [ ] 2.4 Start cron in the nginx container via `oci/app/docker-entrypoint.sh` (the file is `docker-entrypoint.sh`, not `docker-entrypoint.app.sh`). Background the daemon (`crond -b -L /dev/stderr`) **before** the existing `exec nginx -g 'daemon off;'` on line 48, after the existing `cat > config.js` blocks.
- [ ] 2.5 Add an nginx `location = /metrics` block to `oci/app/nginx.conf` setting `Content-Type: text/plain; version=0.0.4` and `Cache-Control: no-store`. Place it alongside the existing `location = /version.json` block (line ~84).
- [ ] 2.6 Add a `location = /federation-status.json` block with the same CORS pattern already used by `/api/` and `/version.json` (`Access-Control-Allow-Origin: *`, `Cache-Control: no-store`).
- [ ] 2.7 Include `generated_at` ISO-8601 UTC timestamp as a top-level field in both outputs.
- [ ] 2.8 On first start, the entrypoint generates an empty placeholder `federation-status.json` and `metrics` (with a single `# poll has not run yet` comment line for the metrics side) so a hub queried before the first cron tick does not 404. This sits alongside the existing `config.js` generation in `docker-entrypoint.sh`.

## 3. Hub UI — surface freshness in the drawer

- [ ] 3.1 Replace the stub in `app/src/hub/federationHealth.js` with a real implementation: on hub-mode startup, fetch `/federation-status.json`; refresh on the existing `hubPollInterval` (default 300 s, same cadence as the registry poll); cache the per-backend status keyed by URL so `isBackendHealthy(backend)` consults the latest snapshot instead of hard-returning `true`. Keep the exported function signatures (`isBackendHealthy(backend)`, `filterHealthy(backends)`) unchanged so `hubOrchestrator.js` doesn't need touching.
- [ ] 3.2 Extend `app/src/hub/registry.js` to merge per-backend `dataAge`, `lastReachable`, `observationStale` fields from the federation-status snapshot into the existing `backends` readable store. The store entries already carry `loading`, `error`, `version`, `region`, `bbox`, `playgroundCount`, `completeness` — the new fields are additive and don't change the existing patch-style update flow (`patchBackend(...)`).
- [ ] 3.3 Update `app/src/hub/InstancePanelDrawer.svelte` to render per-backend `dataAge` (e.g. "data: 2 days old") and `lastReachable` (e.g. "last reachable 3 min ago") next to the existing `version` badge and loading/error states. Use the i18n keys from 3.5; never log per-poll noise to the console.
- [ ] 3.4 Show a subtle "observation stale" hint in the drawer header if `generated_at` is older than 2× `poll_interval_seconds` (default 120 s). Single banner at the drawer top, not per-row, so it doesn't flood the UI.
- [ ] 3.5 Add i18n strings for new drawer labels (`hub.dataAge`, `hub.lastReachable`, `hub.observationStale`, `hub.neverReachable`) under each existing locale file.
- [ ] 3.6 Graceful fallback: if `/federation-status.json` 404s or fails to parse, `federationHealth.isBackendHealthy()` falls back to `true` (the current stub behaviour), the drawer renders without freshness labels (exactly as it does today), and a single `console.warn(...)` fires per session — no per-poll log spam.

## 4. Docs

- [ ] 4.1 Create `docs/ops/monitoring.md` with three recipes:
    - **External uptime monitor** — point UptimeRobot / healthchecks.io / similar at `https://<hub>/federation-status.json`, alert on any `ok: false` or stale `generated_at`
    - **BYO Prometheus** — example scrape config block for `/metrics`, list of emitted metrics + labels, one-paragraph Grafana panel suggestion (no in-repo dashboards)
    - **Frontend error reporting** — link to Sentry free tier; paste-ready snippet for `app.html` if the operator chooses to add it; explicitly noted as *not* wired in-repo
- [ ] 4.2 Add a "Health exposition" section to `docs/reference/federation.md` cross-linking to the new page
- [ ] 4.3 Note `last_import_at` in `docs/reference/registry-json.md` under the `get_meta` fields
- [ ] 4.4 Add `Monitoring: ops/monitoring.md` to the `mkdocs.yml` nav under Operations

## 5. Verification

- [ ] 5.1 `make docker-build && make up` locally with the bundled two-backend `registry.json` (`/api` + `/api2`); `/federation-status.json` appears within 90s and contains both backends.
- [ ] 5.2 `curl http://localhost:8080/metrics` returns well-formed Prometheus text exposition with `# HELP` and `# TYPE` lines for `spielplatz_backend_up`, `spielplatz_backend_latency_seconds`, `spielplatz_backend_data_age_seconds`, `spielplatz_poll_generated_timestamp`.
- [ ] 5.3 Stop one backend container (`docker compose stop postgrest2`), wait one poll cycle, verify `ok: false` in status JSON and `spielplatz_backend_up{backend="..."} 0` in metrics.
- [ ] 5.4 `make seed-load` followed by `curl http://localhost:8080/api/rpc/get_meta` returns a payload that includes `last_import_at` and `data_age_seconds` (~3 days from the seed default).
- [ ] 5.5 `.venv/bin/mkdocs build --strict` passes with `docs/ops/monitoring.md` in the nav and no broken internal links (mirrors the `Deploy docs` workflow).
- [ ] 5.6 Manual smoke test of the drawer in hub mode: reachable backends show "data: N days old"; unreachable backend shows "last reachable N min ago"; stop the cron daemon (`docker compose exec app pkill crond`) and confirm the "observation stale" banner appears after 120 s.
- [ ] 5.7 Confirm `hubOrchestrator.js`'s `filterHealthy(...)` skips the unreachable backend on subsequent moveends (the spec scenario in `add-federated-playground-clustering` §9.2 deferred to here).
- [ ] 5.8 Validate the change with `openspec validate add-federation-health-exposition --strict` before archive.

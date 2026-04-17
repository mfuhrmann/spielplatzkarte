# Architecture

## Production stack

```
                  ┌─────────────────────────────────────────────────────┐
                  │                   Production                        │
                  │                                                     │
  Browser ──────► nginx ──────► PostgREST ──────► PostgreSQL/PostGIS   │
  (your phone      (serves        (turns SQL          (holds all the    │
   or laptop)      the app,       functions into      OSM playground    │
                   proxies API    HTTP endpoints)     data)             │
                   requests)                                            │
                  └─────────────────────────────────────────────────────┘
```

Your browser loads the app from nginx. When it needs playground data, it calls `/api/`, which nginx forwards to PostgREST. PostgREST runs a SQL function in PostgreSQL and returns the results as JSON — no custom server code needed. The database was pre-loaded with OpenStreetMap data by the osm2pgsql importer (a one-time step you re-run whenever you want fresh data).

## Local development

```
  Browser ──────► Vite dev server ──────► (hot-reload JS/CSS)
                                          ↓
                                   apiBaseUrl empty?
                                   ┌─────┴──────┐
                                  yes            no
                                   ↓              ↓
                               Overpass      PostgREST
                               (live OSM     (Docker stack
                                queries)      via make up)
```

During local development, the Vite dev server serves the JavaScript with instant hot-reload. By default (`apiBaseUrl` empty in `public/config.js`), the frontend fetches playground data directly from Overpass — no local database required. To test against the full PostgREST backend, start `make up` and set `apiBaseUrl` in `public/config.js`.

## Deployment modes

The compose file supports three profiles, selected at install time via `DEPLOY_MODE`:

| Mode | Services started | Use case |
|---|---|---|
| `data-node` | db, PostgREST, importer | Shared backend for multiple UI instances |
| `ui` | app (nginx) | Frontend connecting to a remote data node |
| `data-node-ui` | All of the above | Self-contained single-region deployment |

## Key source directories

| Path | Role |
|---|---|
| `app/src/` | Svelte 5 frontend components and modules |
| `importer/` | osm2pgsql Lua rules and PostgREST API SQL (`api.sql`) |
| `db/` | PostgreSQL schema initialisation |
| `oci/` | Docker build contexts |
| `processing/` | OSM data pipeline scripts used during import |

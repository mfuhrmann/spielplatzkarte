# Spielplatzkarte

A free, interactive web map for exploring playgrounds based on [OpenStreetMap](https://openstreetmap.org) data — configurable for any region.

> **Origin:** This project is a further development of the original [Berliner Spielplatzkarte](https://github.com/SupaplexOSM/spielplatzkarte) by Alex Seidel.

**[Documentation](https://mfuhrmann.github.io/spielplatzkarte/)**

---

## Architecture

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

---

## Tech stack

| Component | Technology |
|---|---|
| Map | [OpenLayers](https://openlayers.org/) |
| UI / icons | [Bootstrap 5](https://getbootstrap.com/) + [Tailwind CSS 4](https://tailwindcss.com/) + [lucide-svelte](https://lucide.dev/) |
| Language | [Svelte 5](https://svelte.dev/) |
| Build tool | [Vite 6](https://vitejs.dev/) |
| Database | [PostgreSQL 16](https://www.postgresql.org/) + [PostGIS 3.4](https://postgis.net/) |
| OSM import | [osm2pgsql](https://osm2pgsql.org/) |
| API layer | [PostgREST v12](https://postgrest.org/) |
| Web server | [nginx](https://nginx.org/) |
| Container runtime | Docker / Docker Compose |

---

## Deploy

The interactive installer downloads everything it needs and walks you through configuration:

```bash
curl -fsSL https://raw.githubusercontent.com/mfuhrmann/spielplatzkarte/main/install.sh -o install.sh
bash install.sh
```

**Requirements:** Docker with the Compose plugin, `bash`, `openssl`

The installer asks for a deployment mode (`data-node` / `ui` / `data-node-ui`), your OSM region, and optional settings, then generates a `.env`, pulls images, and optionally runs the first import.

For deploying from source, see [Manual Deploy](https://mfuhrmann.github.io/spielplatzkarte/ops/manual-deploy/).

---

## Configuration

Key variables (full reference at [docs/ops/configuration](https://mfuhrmann.github.io/spielplatzkarte/ops/configuration/)):

| Variable | Default | Description |
|---|---|---|
| `OSM_RELATION_ID` | `62700` | OSM relation ID of the region to display |
| `PBF_URL` | Hessen extract | Geofabrik `.osm.pbf` download URL |
| `APP_PORT` | `8080` | Host port the app is exposed on |
| `MAP_ZOOM` | `12` | Initial map zoom level |
| `POSTGRES_PASSWORD` | `change-me` | Database password — **change in production** |

---

## Local development

**Requirements:** Node.js v18+, Docker with Docker Compose

```bash
make install      # install Node dependencies (once)
make up           # start db + PostgREST + nginx
make dev          # Vite dev server with hot-reload at http://localhost:5173
```

Run `make help` to list all available targets.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full workflow (branch → commit → PR), or the [docs](https://mfuhrmann.github.io/spielplatzkarte/) for how-to guides (e.g. [adding a playground device](https://mfuhrmann.github.io/spielplatzkarte/contributing/add-device/)).

New to OSM concepts like relation IDs or PBF files? See the [glossary](https://mfuhrmann.github.io/spielplatzkarte/reference/glossary/).

---

## Federation

Multiple regional instances can be aggregated into a Hub by deploying with `APP_MODE=hub`. Each regional instance exposes `/api/rpc/get_playgrounds` and `/api/rpc/get_meta` for cross-origin federation. See [docs/reference/federation](https://mfuhrmann.github.io/spielplatzkarte/reference/federation/).

---

## External services

| Service | Purpose |
|---|---|
| [Geofabrik](https://download.geofabrik.de) | Source of OSM PBF extracts for import |
| [Nominatim](https://nominatim.openstreetmap.org) | Location search and region bounding box |
| [CartoDB Voyager](https://carto.com/basemaps) | Background map tiles |
| [Panoramax](https://panoramax.xyz) | Street-level photos |
| [Mangrove.reviews](https://mangrove.reviews) | Pseudonymous community reviews |
| [MapComplete](https://mapcomplete.org) | Contribute photos and equipment |
| [Wikidata](https://wikidata.org) | Operator entity linking |

All data comes from OpenStreetMap or the free services listed above. No proprietary data, no user accounts, no tracking.

---

## License

[GNU General Public License v3.0](LICENSE)

Map data © [OpenStreetMap](https://openstreetmap.org) contributors, available under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright).

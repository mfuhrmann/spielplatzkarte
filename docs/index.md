# spieli

A free, interactive web map for exploring playgrounds based on [OpenStreetMap](https://openstreetmap.org) data — configurable for any region.

> **Origin:** This project is a further development of the original [Berliner Spielplatzkarte](https://github.com/SupaplexOSM/spielplatzkarte) by Alex Seidel.

---

## Architecture

```
                  ┌─────────────────────────────────────────────────────┐
                  │                   Production                        │
                  │                                                     │
  Browser ──────► | nginx ──────► PostgREST ──────► PostgreSQL/PostGIS  │
  (your phone     | (serves        (turns SQL          (holds all the   │
   or laptop)     | the app,       functions into      OSM playground   │
                  | proxies API    HTTP endpoints)     data)            │
                  | requests)                                           │
                  └─────────────────────────────────────────────────────┘
```

Your browser loads the app from nginx. Playground data requests go to `/api/`, which nginx forwards to PostgREST. PostgREST runs a SQL function in PostgreSQL and returns JSON — no custom server code needed. The database is pre-loaded with OpenStreetMap data by the osm2pgsql importer.

Multiple regional instances can be aggregated into a single **Hub** map — see [Architecture](reference/architecture.md) and [Federation](reference/federation.md) for details.

---

## Getting started

| I want to… | Go to… |
|---|---|
| Deploy spieli for my region | [Quick Start](getting-started/quick-start.md) |
| Deploy from source | [Manual Deploy](ops/manual-deploy.md) |
| Connect my backend to an existing Hub | [Quick Start → Joining an existing Hub](getting-started/quick-start.md#joining-an-existing-hub) |

## Operations

| I want to… | Go to… |
|---|---|
| Configure environment variables | [Configuration](ops/configuration.md) |
| Stand up a Hub + multiple data-nodes | [Federated Deployment](ops/federated-deployment.md) |
| Monitor a running instance | [Monitoring](ops/monitoring.md) |
| Fix a problem | [Troubleshooting](ops/troubleshooting.md) |

## Contributing

| I want to… | Go to… |
|---|---|
| Add a new playground device type | [Add a Device](contributing/add-device.md) |
| Add a new sport type | [Add a Sport Type](contributing/add-sport-type.md) |
| Translate the app (Weblate) | [Translator Instructions](contributing/translation-guide.md) |
| Understand the translation workflow | [Translation Workflow](contributing/translations.md) |
| Set up a local dev environment | [Local Development](contributing/local-dev.md) |

## Reference

| Topic | Go to… |
|---|---|
| Tech stack | [Tech Stack](reference/tech-stack.md) |
| System architecture & deployment modes | [Architecture](reference/architecture.md) |
| PostgREST API endpoints | [API Reference](reference/api.md) |
| Hub federation protocol | [Federation](reference/federation.md) |
| `registry.json` schema | [Registry JSON](reference/registry-json.md) |
| External services used at runtime | [External Services](reference/external-services.md) |
| OSM and project terminology | [Glossary](reference/glossary.md) |

# Federation

Multiple regional instances can be aggregated into a single global map using the **Hub mode** built into this codebase. The Hub is not a separate repository — it is the same app deployed with `APP_MODE=hub`.

```
APP_MODE=standalone   →  regional map (one city / Kreis / Bundesland)
APP_MODE=hub          →  aggregation map that fetches from all registered instances
```

To run the Hub, use the same `compose.yml` and set `APP_MODE=hub`. The Hub reads a `registry.json` file listing the regional instances to aggregate.

## Federation endpoints

Each regional instance exposes two endpoints (available since v0.2.1):

| Endpoint | Description |
|---|---|
| `GET /api/rpc/get_playgrounds` | Full GeoJSON FeatureCollection of all playgrounds in the region |
| `GET /api/rpc/get_meta` | Instance metadata: OSM relation name, playground count, bounding box |

CORS is enabled on `/api/` so the Hub can query instances cross-origin from the browser.

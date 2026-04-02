# Spielplatzkarte

A free, interactive web map for exploring playgrounds based on [OpenStreetMap](https://openstreetmap.org) data — configurable for any region.

> **Origin:** This project is a further development of the original [Berliner Spielplatzkarte](https://github.com/SupaplexOSM/spielplatzkarte) by Alex Seidel. The original version relied on a GeoServer backend with precomputed data. This version works without a dedicated server — regional data is served as static GeoJSON files, with the Overpass API as a fallback.

> **Language:** The UI is currently in German only. Internationalisation (i18n) is a known limitation — all user-facing strings are hardcoded in German, equipment names are German, and the opening hours parser is configured for Germany (`country_code: de`). Contributions to add i18n support are welcome.

---

## Features

- Display all playgrounds in a configured OSM region on an interactive map
- Playground detail panel: name, size, access, opening hours (parsed live), age restrictions, operator, contact
- Load and display playground equipment and amenities (benches, shelters, picnic tables, pitches, fitness stations)
- Street photos via [Panoramax](https://panoramax.xyz) — inline viewer with fullscreen modal and keyboard navigation
- Nearby POIs: toilets, bus stops, ice cream, supermarkets, drugstores, emergency rooms — with distance and OSM foot routing
- Add photos and equipment directly via [MapComplete](https://mapcomplete.org/playgrounds)
- Location search via [Nominatim](https://nominatim.openstreetmap.org) with nearby playground suggestions
- Geolocation: show nearest playgrounds to current position
- Responsive layout: desktop (left sidebar card) and mobile (bottom sheet)
- Static GeoJSON data files for instant load — Overpass API as fallback with mirror support and stale cache

---

## External Services

| Service | Purpose |
|---|---|
| [Overpass API](https://overpass-api.de) | Fallback data source if static files are unavailable |
| [Nominatim](https://nominatim.openstreetmap.org) | Location search |
| [CartoDB Voyager](https://carto.com/basemaps) | Background map tiles |
| [Panoramax](https://panoramax.xyz) | Street-level photos |
| [MapComplete](https://mapcomplete.org) | Contribute photos and equipment |
| [Wikidata](https://wikidata.org) | Operator entity linking |

All data comes from OpenStreetMap or the free services listed above. No proprietary data, no user accounts, no tracking.

---

## Tech Stack

| Component | Technology |
|---|---|
| Map | [OpenLayers](https://openlayers.org/) |
| UI framework | [Bootstrap 5](https://getbootstrap.com/) + [Bootstrap Icons](https://icons.getbootstrap.com/) |
| DOM / events | [jQuery](https://jquery.com/) |
| Opening hours parser | [opening_hours.js](https://github.com/opening-hours/opening_hours.js) |
| Build tool | [Vite 6](https://vitejs.dev/) |
| Language | JavaScript (ES Modules) |

---

## Configuration

All region-specific settings live in `js/config.js`:

```js
export const mapCenter = [9.6744, 50.5520];            // map center [lon, lat]
export const mapExtent = [9.42, 50.35, 10.09, 50.81]; // bounding box [minLon, minLat, maxLon, maxLat]
export const mapZoom = 12;                             // initial zoom level
export const mapMinZoom = 10;                          // minimum zoom level

export const osmRelationId = 62700;                    // OSM relation ID of the region
export const regionName = 'Landkreis Fulda';           // used in page title and modals

// Optional — set to null to hide
export const regionPlaygroundWikiUrl = 'https://wiki.openstreetmap.org/wiki/...';
export const regionChatUrl = 'https://matrix.to/#/...';
export const regionChatName = 'OSM Community Chat';

export const projectAuthorName = 'Alex Seidel';
export const projectAuthorOsmUrl = 'https://www.openstreetmap.org/user/Supaplex030/';
export const projectRepoUrl = null; // set to your repository URL once available
```

The `osmRelationId` determines which OSM region is queried. Find the relation ID on [openstreetmap.org](https://openstreetmap.org) in the URL of the relevant area (e.g. a city or district boundary).

---

## Static Data Files

The app loads three pre-built GeoJSON files from the `data/` folder instead of querying Overpass on every page load. This eliminates timeout issues and makes the app significantly faster.

| File | Contents | Used for |
|---|---|---|
| `data/export.geojson` | Playground polygon boundaries | Map display |
| `data/playgrounds.geojson` | Equipment within playgrounds (benches, devices, pitches, etc.) | Detail panel |
| `data/poi.geojson` | Nearby POIs across the region (bus stops, toilets, shops, etc.) | Umfeld panel |

If any file is missing, the app falls back to live Overpass queries automatically.

### Updating the data

Run these queries in [Overpass Turbo](https://overpass-turbo.eu) and export as GeoJSON, replacing the relation ID (`3600062700`) with your region's relation ID (`3600000000 + osmRelationId`):

**Playground boundaries** (`export.geojson`):
```
[out:json][timeout:60];
area(3600062700)->.a;
way[leisure=playground](area.a);
out geom tags;
```

**Equipment** (`playgrounds.geojson`):
```
[out:json][timeout:120];
area(3600062700)->.a;
(
  node[playground](area.a);
  way[playground](area.a);
  node[amenity=bench](area.a);
  node[amenity=shelter](area.a);
  node[leisure=picnic_table](area.a);
  node[leisure=pitch](area.a);
  way[leisure=pitch](area.a);
  node[leisure=fitness_station](area.a);
);
out body geom;
```

**Nearby POIs** (`poi.geojson`):
```
[out:json][timeout:120];
area(3600062700)->.a;
(
  node[amenity=toilets](area.a);
  node[highway=bus_stop](area.a);
  node[amenity~"^(cafe|restaurant)$"][cuisine~"ice_cream"](area.a);
  node[amenity=ice_cream](area.a);
  node[amenity=hospital](area.a);
  node[amenity=doctors][emergency=yes](area.a);
  node[emergency=yes][emergency!=fire_hydrant](area.a);
  node[shop=chemist](area.a);
  node[shop=supermarket](area.a);
  node[shop=convenience](area.a);
);
out body;
```

---

## Getting Started

**Requirements:** [Node.js](https://nodejs.org/) v18 or newer

```bash
# Install dependencies
npm install

# Start development server
npm start

# Create production build
npm run build

# Preview production build locally
npm run serve
```

The development server will be available at `http://localhost:5173`.

---

## License

[GNU General Public License v3.0](LICENSE)

Map data © [OpenStreetMap](https://openstreetmap.org) contributors, available under the [Open Database License (ODbL)](https://www.openstreetmap.org/copyright).

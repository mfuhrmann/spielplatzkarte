<script>
  import { haversineDistance, formatDistance, bearingDeg, bearingToDir } from '../lib/playgroundHelpers.js';
  import { poiRadiusM } from '../lib/config.js';

  /** @type {Array} POI objects from fetchNearbyPOIs */
  export let pois = [];
  /** @type {number} Playground centre latitude (WGS84) */
  export let centerLat = 0;
  /** @type {number} Playground centre longitude (WGS84) */
  export let centerLon = 0;

  const CATEGORIES = [
    {
      icon: '🚻', label: 'Toiletten',
      match: f => f.amenity === 'toilets',
      fallback: 'Toiletten',
    },
    {
      icon: '🚌', label: 'Bushaltestellen',
      match: f => f.highway === 'bus_stop',
      fallback: 'Bushaltestelle',
      hint: (poi) => poi.tags.towards
        ? `→ ${poi.tags.towards}`
        : bearingToDir(bearingDeg(centerLat, centerLon, poi.lat, poi.lon)),
    },
    {
      icon: '🍦', label: 'Eis',
      match: f => f.amenity === 'ice_cream' || (f.cuisine && f.cuisine.includes('ice_cream')),
      fallback: 'Eisdiele',
    },
    {
      icon: '🛒', label: 'Einkaufen',
      match: f => f.shop === 'supermarket' || f.shop === 'convenience',
      fallback: 'Supermarkt',
    },
    {
      icon: '🧴', label: 'Drogerie',
      match: f => f.shop === 'chemist',
      fallback: 'Drogerie',
    },
    {
      icon: '🏥', label: 'Notaufnahme',
      match: f => f.emergency === 'yes' || f['healthcare:speciality'] === 'emergency',
      fallback: 'Notaufnahme',
    },
  ];

  $: enriched = pois.map(p => ({
    ...p,
    dist: haversineDistance(centerLat, centerLon, p.lat, p.lon),
  }));

  $: sections = CATEGORIES.map(cat => {
    const seen = new Set();
    const matches = enriched
      .filter(p => cat.match(p.tags))
      .sort((a, b) => a.dist - b.dist)
      .filter(p => {
        const key = (p.tags.name || cat.fallback).toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 2);
    return { ...cat, matches };
  }).filter(s => s.matches.length);
</script>

{#if sections.length === 0}
  <small class="text-muted">
    Keine nahegelegenen Einrichtungen im Umkreis von {(poiRadiusM / 1000).toFixed(0)} km gefunden.
  </small>
{:else}
  {#each sections as cat}
    <div class="mb-2">
      <small class="text-muted fw-bold text-uppercase" style="font-size:0.7rem;">
        {cat.icon} {cat.label}
      </small>
      {#each cat.matches as poi}
        {@const name = poi.tags.name || cat.fallback}
        {@const hint = cat.hint ? cat.hint(poi) : null}
        {@const geoUrl = `geo:${poi.lat},${poi.lon}?q=${poi.lat},${poi.lon}(${encodeURIComponent(name)})`}
        {@const osmUrl = `https://www.openstreetmap.org/directions?engine=fossgis_osrm_foot&route=${centerLat},${centerLon};${poi.lat},${poi.lon}`}
        <div class="d-flex justify-content-between align-items-baseline mt-1">
          <span style="font-size:smaller;">
            {name}{#if hint}<span class="text-muted ms-1" style="font-size:0.7rem;">({hint})</span>{/if}
          </span>
          <span class="ms-2 text-nowrap">
            <a href={geoUrl} class="text-muted text-decoration-none" style="font-size:smaller;"
               title="In Navigations-App öffnen">{formatDistance(poi.dist)} ↗</a>
            <a href={osmUrl} target="_blank" rel="noopener"
               class="text-muted text-decoration-none ms-1" style="font-size:smaller;"
               title="Im Browser navigieren">🗺</a>
          </span>
        </div>
      {/each}
    </div>
  {/each}
{/if}

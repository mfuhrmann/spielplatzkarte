<script>
  import { fromLonLat } from 'ol/proj';
  import { mapStore } from '../stores/map.js';

  /** Bounding box [minLon, minLat, maxLon, maxLat] to restrict Nominatim search. */
  export let regionExtent = null;

  let query = '';
  let searching = false;
  let message = '';

  async function search() {
    const q = query.trim();
    if (!q) return;
    searching = true;
    message = '';
    try {
      let url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(q)}&format=json&addressdetails=1&limit=1`;
      if (regionExtent) {
        const [minLon, minLat, maxLon, maxLat] = regionExtent;
        url += `&viewbox=${minLon},${minLat},${maxLon},${maxLat}`;
      }
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Nominatim error: ${res.status}`);
      const results = await res.json();
      if (!results.length) {
        message = `Kein Ergebnis für „${q}"`;
        return;
      }
      const result = results[0];
      const coord = fromLonLat([parseFloat(result.lon), parseFloat(result.lat)]);
      $mapStore?.getView().animate({ center: coord, zoom: 17 });

      const suburb = result.address?.suburb;
      const city = result.address?.city || result.address?.town || result.address?.village;
      const hint = suburb ? `${suburb}, ${city ?? ''}` : city;
      message = hint ? `${q} — ${hint}` : q;
    } catch (err) {
      console.error('Search failed:', err);
      message = 'Suche fehlgeschlagen.';
    } finally {
      searching = false;
    }
  }

  function onKeydown(e) {
    if (e.key === 'Enter') search();
  }
</script>

<div class="search-bar">
  <div class="input-group input-group-sm">
    <input
      type="text"
      class="form-control"
      placeholder="Ort suchen …"
      bind:value={query}
      onkeydown={onKeydown}
      disabled={searching}
      aria-label="Ortssuche"
    />
    <button class="btn btn-outline-secondary" onclick={search} disabled={searching} aria-label="Suchen">
      {#if searching}
        <span class="spinner-border spinner-border-sm" role="status"></span>
      {:else}
        <span class="bi bi-search"></span>
      {/if}
    </button>
  </div>
  {#if message}
    <div class="search-hint">{message}</div>
  {/if}
</div>

<style>
  .search-bar { width: 240px; }
  .search-hint {
    font-size: 0.7rem;
    color: #6c757d;
    margin-top: 2px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
</style>

<script>
  import { fromLonLat } from 'ol/proj';
  import { mapStore } from '../stores/map.js';
  import { Search, Loader2 } from 'lucide-svelte';
  import Button from './ui/Button.svelte';
  import { cn } from '../lib/utils.js';

  /** Bounding box [minLon, minLat, maxLon, maxLat] to restrict Nominatim search. */
  export let regionExtent = null;

  let query = '';
  let searching = false;
  let message = '';
  let inputEl;

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
        message = `Kein Ergebnis für "${q}"`;
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

  function clearSearch() {
    query = '';
    message = '';
    inputEl?.focus();
  }
</script>

<div class="search-container">
  <div class="relative flex items-center">
    <div class="absolute left-3 pointer-events-none">
      {#if searching}
        <Loader2 class="h-4 w-4 text-muted-foreground animate-spin" />
      {:else}
        <Search class="h-4 w-4 text-muted-foreground" />
      {/if}
    </div>
    <input
      bind:this={inputEl}
      type="text"
      class={cn(
        'h-8 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm',
        'placeholder:text-muted-foreground',
        'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-0',
        'disabled:cursor-not-allowed disabled:opacity-50'
      )}
      placeholder="Ort suchen..."
      bind:value={query}
      onkeydown={onKeydown}
      disabled={searching}
      aria-label="Ortssuche"
    />
  </div>
  {#if message}
    <div class="search-hint">
      {message}
    </div>
  {/if}
</div>

<style>
  .search-container {
    width: 200px;
  }

  @media (min-width: 640px) {
    .search-container {
      width: 240px;
    }
  }

  .search-hint {
    position: absolute;
    top: calc(100% + 4px);
    left: 0;
    right: 0;
    font-size: 0.7rem;
    color: var(--color-muted-foreground);
    background: var(--color-card);
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
    border: 1px solid var(--color-border);
  }
</style>

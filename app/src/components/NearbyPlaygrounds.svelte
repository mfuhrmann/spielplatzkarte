<script>
  import { playgroundSourceStore } from '../stores/playgroundSource.js';
  import { selection } from '../stores/selection.js';
  import { fetchNearestPlaygrounds } from '../lib/api.js';
  import { playgroundCompleteness } from '../lib/completeness.js';
  import { apiBaseUrl } from '../lib/config.js';

  export let lat;
  export let lon;
  /** Called when the panel should close (suggestion selected). */
  export let ondismiss = null;

  let items = [];
  let loading = true;

  $: if (lat != null && lon != null) {
    load(lat, lon);
  }

  async function load(lt, lg) {
    loading = true;
    items = [];
    try {
      items = await fetchNearestPlaygrounds(lt, lg);
    } catch (err) {
      console.error('Nearest playgrounds fetch failed:', err);
    } finally {
      loading = false;
    }
  }

  function formatDistance(m) {
    if (m < 1000) return `${Math.round(m)} m`;
    return `${(m / 1000).toFixed(1).replace('.', ',')} km`;
  }

  function completenessClass(tags) {
    const c = playgroundCompleteness(tags);
    if (c === 'complete') return 'dot-complete';
    if (c === 'partial')  return 'dot-partial';
    return 'dot-missing';
  }

  function selectSuggestion(item) {
    const source = $playgroundSourceStore;
    const feature = source?.getFeatures().find(f => f.get('osm_id') === item.osm_id);
    if (feature) {
      selection.select(feature, apiBaseUrl);
    }
    if (ondismiss) ondismiss();
  }
</script>

<div class="nearby-card">
  <div class="nearby-header">In der Nähe</div>
  {#if loading}
    <div class="nearby-loading">Wird geladen …</div>
  {:else if items.length === 0}
    <div class="nearby-loading">Keine Spielplätze gefunden.</div>
  {:else}
    <ul class="nearby-list">
      {#each items as item}
        <li>
          <button class="nearby-item" onclick={() => selectSuggestion(item)}>
            <span class="dot {completenessClass(item.tags)}"></span>
            <span class="nearby-name">{item.name || 'Unbekannter Spielplatz'}</span>
            <span class="nearby-dist">{formatDistance(item.distance_m)}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>

<style>
  .nearby-card {
    background: white;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1);
    overflow: hidden;
    width: 300px;
    max-width: calc(100vw - 5rem);
  }

  .nearby-header {
    padding: 8px 14px 6px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9aa0a6;
    border-bottom: 1px solid #e8eaed;
  }

  .nearby-loading {
    padding: 10px 14px;
    font-size: 13px;
    color: #9aa0a6;
  }

  .nearby-list {
    list-style: none;
    margin: 0;
    padding: 0;
  }

  .nearby-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 14px;
    width: 100%;
    border: none;
    background: transparent;
    cursor: pointer;
    text-align: left;
    transition: background 0.15s;
  }

  .nearby-item:hover {
    background: #f1f3f4;
  }

  .dot {
    flex-shrink: 0;
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .dot-complete { background: #22c55e; }
  .dot-partial  { background: #f59e0b; }
  .dot-missing  { background: #ef4444; }

  .nearby-name {
    flex: 1;
    font-size: 13px;
    color: #202124;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .nearby-dist {
    flex-shrink: 0;
    font-size: 12px;
    color: #9aa0a6;
  }
</style>

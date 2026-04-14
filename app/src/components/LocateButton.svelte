<script>
  import { fromLonLat } from 'ol/proj';
  import { mapStore } from '../stores/map.js';

  let locating = false;
  let error = '';

  function locate() {
    if (!navigator.geolocation) {
      error = 'Geolocation nicht verfügbar.';
      return;
    }
    locating = true;
    error = '';
    navigator.geolocation.getCurrentPosition(
      pos => {
        locating = false;
        const coord = fromLonLat([pos.coords.longitude, pos.coords.latitude]);
        $mapStore?.getView().animate({ center: coord, zoom: 16 });
      },
      err => {
        locating = false;
        error = err.code === 1 ? 'Standortzugriff verweigert.' : 'Standort nicht verfügbar.';
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  }
</script>

<button
  class="btn btn-sm btn-outline-secondary locate-btn"
  onclick={locate}
  disabled={locating}
  title={error || 'Meinen Standort anzeigen'}
  aria-label="Meinen Standort anzeigen"
>
  {#if locating}
    <span class="spinner-border spinner-border-sm" role="status"></span>
  {:else}
    <span class="bi bi-geo-alt{error ? '-fill text-danger' : ''}"></span>
  {/if}
</button>

<style>
  .locate-btn { padding: 0.25rem 0.5rem; line-height: 1; }
</style>

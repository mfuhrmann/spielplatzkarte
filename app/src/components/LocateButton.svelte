<script>
  import { fromLonLat } from 'ol/proj';
  import { mapStore } from '../stores/map.js';
  import { MapPin, Loader2 } from 'lucide-svelte';
  import Button from './ui/Button.svelte';
  import { cn } from '../lib/utils.js';

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

<Button
  variant="outline"
  size="icon"
  class={cn('h-8 w-8', error && 'border-destructive')}
  onclick={locate}
  disabled={locating}
  title={error || 'Meinen Standort anzeigen'}
  aria-label="Meinen Standort anzeigen"
>
  {#if locating}
    <Loader2 class="h-4 w-4 animate-spin" />
  {:else}
    <MapPin class={cn('h-4 w-4', error && 'text-destructive')} />
  {/if}
</Button>

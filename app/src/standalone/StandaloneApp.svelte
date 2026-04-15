<script>
  import Map from '../components/Map.svelte';
  import PlaygroundPanel from '../components/PlaygroundPanel.svelte';
  import SearchBar from '../components/SearchBar.svelte';
  import LocateButton from '../components/LocateButton.svelte';
  import FilterPanel from '../components/FilterPanel.svelte';
  import FilterChips from '../components/FilterChips.svelte';
  import BottomSheet from '../components/BottomSheet.svelte';
  import HoverPreview from '../components/HoverPreview.svelte';
  import DataContributionModal from '../components/DataContributionModal.svelte';
  import Button from '../components/ui/Button.svelte';
  import { Pencil } from 'lucide-svelte';
  import { apiBaseUrl } from '../lib/config.js';
  import { mapStore } from '../stores/map.js';
  import { selection, hasSelection } from '../stores/selection.js';
  import { transformExtent } from 'ol/proj';

  // Expose the current map extent in WGS84 to constrain Nominatim search.
  let regionExtent = null;
  $: if ($mapStore) {
    const updateExtent = () => {
      const size = $mapStore.getSize();
      if (!size) return;
      const ext = $mapStore.getView().calculateExtent(size);
      regionExtent = transformExtent(ext, 'EPSG:3857', 'EPSG:4326');
    };
    $mapStore.on('moveend', updateExtent);
    updateExtent();
  }

  let dataModalOpen = false;

  // Responsive: track if we're on mobile
  let isMobile = false;
  function checkMobile() {
    isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;
  }
  
  // Check on mount and resize
  $: if (typeof window !== 'undefined') {
    checkMobile();
  }

  // Bottom sheet state for mobile
  let bottomSheetOpen = false;
  let bottomSheetSnap = 'half';

  // Sync bottom sheet with selection on mobile
  $: if (isMobile && $hasSelection) {
    bottomSheetOpen = true;
    bottomSheetSnap = 'half';
  }
  $: if (isMobile && !$hasSelection) {
    bottomSheetOpen = false;
  }

  // Hover preview state
  let hoverFeature = null;
  let hoverPosition = null;

  function handleHover(feature, pixel) {
    if (isMobile) return; // No hover on mobile
    hoverFeature = feature;
    hoverPosition = pixel ? { x: pixel[0], y: pixel[1] } : null;
  }

  function clearHover() {
    hoverFeature = null;
    hoverPosition = null;
  }
</script>

<svelte:window onresize={checkMobile} />

<div class="app-root">
  <Map 
    defaultBackendUrl={apiBaseUrl} 
    onhover={handleHover}
    onclearhover={clearHover}
  />

  <!-- Toolbar: search + locate + filter + data contribution -->
  <div class="map-toolbar">
    <SearchBar {regionExtent} />
    <LocateButton />
    <FilterPanel />
    <Button
      variant="outline"
      size="icon"
      onclick={() => dataModalOpen = true}
      title="Daten ergänzen"
      aria-label="Daten ergänzen"
      class="h-8 w-8"
    >
      <Pencil class="h-4 w-4" />
    </Button>
  </div>

  <!-- Filter chips (shown below toolbar when filters active) -->
  <div class="filter-chips-container">
    <FilterChips />
  </div>

  <!-- Desktop: Side panel -->
  {#if !isMobile && $hasSelection}
    <PlaygroundPanel />
  {/if}

  <!-- Mobile: Bottom sheet -->
  {#if isMobile}
    <BottomSheet
      bind:open={bottomSheetOpen}
      bind:snapPoint={bottomSheetSnap}
      title=""
    >
      {#if $hasSelection}
        <PlaygroundPanel embedded={true} />
      {/if}
    </BottomSheet>
  {/if}

  <!-- Hover preview card (desktop only) -->
  <HoverPreview position={hoverPosition} feature={hoverFeature} />

  <!-- Data contribution modal -->
  <DataContributionModal bind:open={dataModalOpen} />
</div>

<style>
  .app-root {
    position: relative;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    background: var(--color-background);
  }

  .map-toolbar {
    position: absolute;
    top: 0.75rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 0.5rem;
    z-index: 100;
    background: oklch(1 0 0 / 0.95);
    backdrop-filter: blur(8px);
    padding: 0.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
    border: 1px solid var(--color-border);
  }

  .filter-chips-container {
    position: absolute;
    top: 4.5rem;
    left: 50%;
    transform: translateX(-50%);
    z-index: 99;
    max-width: calc(100vw - 2rem);
  }

  /* On mobile, adjust for bottom sheet */
  @media (max-width: 1023px) {
    .map-toolbar {
      top: 0.5rem;
      padding: 0.375rem;
    }

    .filter-chips-container {
      top: 4rem;
    }
  }
</style>

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
  <!-- Full-screen map -->
  <Map 
    defaultBackendUrl={apiBaseUrl} 
    onhover={handleHover}
    onclearhover={clearHover}
  />

  <!-- Search bar: top-left, Google Maps style -->
  <div class="search-area">
    <SearchBar {regionExtent} />
    <FilterChips />
  </div>

  <!-- Right side controls: locate, filter, edit -->
  <div class="controls-right">
    <LocateButton />
    <FilterPanel />
    <button
      class="control-btn"
      onclick={() => dataModalOpen = true}
      title="Daten ergänzen"
      aria-label="Daten ergänzen"
    >
      <Pencil class="h-5 w-5" />
    </button>
  </div>

  <!-- Desktop: Side panel slides in from left -->
  {#if !isMobile && $hasSelection}
    <div class="side-panel">
      <PlaygroundPanel />
    </div>
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
  }

  /* Search area: top-left floating card */
  .search-area {
    position: absolute;
    top: 1rem;
    left: 1rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Right side controls: stacked vertically */
  .controls-right {
    position: absolute;
    top: 1rem;
    right: 1rem;
    z-index: 100;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  /* Control button (for edit button) */
  .control-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    background: white;
    border: none;
    border-radius: 8px;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    color: #5f6368;
    transition: background 0.15s, color 0.15s;
  }

  .control-btn:hover {
    background: #f1f3f4;
    color: #202124;
  }

  /* Side panel: slides in from left on desktop */
  .side-panel {
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 380px;
    z-index: 200;
    background: white;
    box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15);
    overflow-y: auto;
    animation: slideInLeft 0.3s ease-out;
  }

  @keyframes slideInLeft {
    from {
      transform: translateX(-100%);
    }
    to {
      transform: translateX(0);
    }
  }

  /* Mobile adjustments */
  @media (max-width: 1023px) {
    .search-area {
      top: 0.75rem;
      left: 0.75rem;
      right: 4rem;
    }

    .controls-right {
      top: 0.75rem;
      right: 0.75rem;
    }
  }

  /* When panel is open on desktop, shift search area */
  @media (min-width: 1024px) {
    .app-root:has(.side-panel) .search-area {
      left: calc(380px + 1rem);
      transition: left 0.3s ease-out;
    }
  }
</style>

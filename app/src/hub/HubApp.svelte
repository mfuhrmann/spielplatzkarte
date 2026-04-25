<script>
  import VectorSource from 'ol/source/Vector.js';
  import { onDestroy, onMount } from 'svelte';
  import { get } from 'svelte/store';
  import { transformExtent } from 'ol/proj';

  import AppShell from '../components/AppShell.svelte';
  import InstancePanel from './InstancePanel.svelte';
  import MacroView from './MacroView.svelte';

  import { createRegistry } from './registry.js';
  import { attachHubOrchestrator } from './hubOrchestrator.js';
  import { mapStore } from '../stores/map.js';
  import { clusterMaxZoom } from '../lib/config.js';

  // Generic OSM wiki link for the contribution modal (hub is region-agnostic).
  const HUB_WIKI_URL = 'https://wiki.openstreetmap.org/wiki/Tag:leisure%3Dplayground';

  // Three sources owned by the hub — the orchestrator populates cluster /
  // polygon on every moveend; MacroView (P2 §5) populates macro from
  // backend metadata (no fetch). Map.svelte toggles layer visibility from
  // activeTierStore — same pattern as the standalone two-tier design,
  // extended with the hub-only macro tier.
  const polygonSource = new VectorSource();
  const clusterSource = new VectorSource();
  const macroSource   = new VectorSource();
  let detachOrchestrator = null;

  const {
    backends,
    registryError,
    aggregatedBbox,
    fetchNearestAcrossBackends,
  } = createRegistry();

  const dataContribLinks = { wikiUrl: HUB_WIKI_URL, chatUrl: null };

  // Sync resolver for deep-link slug → backend URL. Reads the current backends
  // list via `get()` so AppShell can call it from its restore loop without
  // taking a store subscription of its own.
  function resolveSlugToBackendUrl(slug) {
    return get(backends).find(b => b.slug === slug)?.url ?? null;
  }

  // Initial region fit: once both the map and the first aggregated bbox are
  // available, fit the view and then stop listening. Until that point the map
  // stays on its default Germany-wide center from Map.svelte — the "safe"
  // fallback from D5.
  let fitDone = false;
  let detachMap = null;
  let detachBbox = null;

  function tryFit(map, bbox) {
    if (fitDone || !map || !bbox) return;
    // Single-backend hubs always clamp to clusterMaxZoom + 1 (spec §6.1):
    // a single small city's bbox fitted with normal padding lands in the
    // macro tier, where one giant ring covers a city the user already
    // implied they wanted to look at. Clamping forces the initial paint
    // into the cluster tier.
    //
    // Multi-backend hubs accept whatever the union dictates (spec §6.2)
    // — a Germany+France union legitimately wants the macro continent
    // overview now that §5 ships and macro rings render properly.
    const backendCount = get(backends).length;
    const fitOpts = { padding: [20, 20, 20, 380], duration: 0 };
    if (backendCount <= 1) fitOpts.maxZoom = clusterMaxZoom + 1;
    map.getView().fit(
      transformExtent(bbox, 'EPSG:4326', 'EPSG:3857'),
      fitOpts,
    );
    fitDone = true;
    detachMap?.();
    detachBbox?.();
    detachMap = detachBbox = null;
  }

  onMount(() => {
    let latestMap = null;
    let latestBbox = null;
    detachMap = mapStore.subscribe(m => { latestMap = m; tryFit(latestMap, latestBbox); });
    detachBbox = aggregatedBbox.subscribe(b => { latestBbox = b; tryFit(latestMap, latestBbox); });

    // Attach the hub orchestrator once the map is published. The orchestrator
    // fans out per-tier RPCs across registered backends on every (debounced)
    // moveend, populates clusterSource / polygonSource, and writes the
    // active tier to activeTierStore for layer-visibility toggling.
    const detachAttach = mapStore.subscribe(map => {
      if (!map || detachOrchestrator) return;
      detachOrchestrator = attachHubOrchestrator({
        map,
        backendsStore: backends,
        clusterSource,
        polygonSource,
      });
      detachAttach();
    });
  });

  onDestroy(() => {
    detachMap?.();
    detachBbox?.();
    detachOrchestrator?.();
  });
</script>

<MacroView {backends} source={macroSource} />

<AppShell
  playgroundSource={polygonSource}
  {clusterSource}
  {macroSource}
  searchExtent={aggregatedBbox}
  nearestFetcher={fetchNearestAcrossBackends}
  {resolveSlugToBackendUrl}
  {dataContribLinks}
>
  {#snippet instancePanel()}
    <InstancePanel {backends} {registryError} />
  {/snippet}
</AppShell>

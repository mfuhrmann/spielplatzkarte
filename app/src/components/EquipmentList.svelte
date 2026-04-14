<script>
  import { objDevices, objFitnessStation } from '../lib/objPlaygroundEquipment.js';
  import { objColors } from '../lib/vectorStyles.js';
  import { getEquipmentAttributesFromProps } from '../lib/equipmentAttributes.js';

  /** @type {Array} GeoJSON features from fetchPlaygroundEquipment */
  export let features = [];
  /** @type {Object} Playground polygon properties (for playground:<key> fallback) */
  export let playgroundAttr = {};

  const pitchLabels = {
    soccer:          ['Bolzplatz',          'Bolzplätze'],
    basketball:      ['Basketballfeld',     'Basketballfelder'],
    table_tennis:    ['Tischtennisplatte',  'Tischtennisplatten'],
    volleyball:      ['Volleyballfeld',     'Volleyballfelder'],
    tennis:          ['Tennisfeld',         'Tennisfelder'],
    handball:        ['Handballfeld',       'Handballfelder'],
    badminton:       ['Badmintonfeld',      'Badmintonfelder'],
    boules:          ['Boulesbahn',         'Boulesanlagen'],
    petanque:        ['Pétanquebahn',       'Pétanqueanlagen'],
    multi:           ['Mehrzweckspielfeld', 'Mehrzweckspielfelder'],
    skateboard:      ['Skatepark',          'Skateparks'],
    bmx:             ['BMX-Bahn',           'BMX-Bahnen'],
    climbing:        ['Kletteranlage',      'Kletteranlagen'],
    fitness:         ['Fitnessbereich',     'Fitnessbereiche'],
  };

  $: deviceFeatures  = features.filter(f => f.properties.playground && f.properties.playground !== 'yes');
  $: fitnessFeatures = features.filter(f => f.properties.leisure === 'fitness_station');
  $: pitchFeatures   = features.filter(f => f.properties.leisure === 'pitch');
  $: benchCount   = features.filter(f => f.properties.amenity === 'bench').length;
  $: shelterCount = features.filter(f => f.properties.amenity === 'shelter').length;
  $: picnicCount  = features.filter(f => f.properties.leisure === 'picnic_table').length;

  // Fallback: playground:<key>=<count|yes> on the polygon itself
  $: fallbackCounts = (() => {
    if (deviceFeatures.length) return {};
    const counts = {};
    for (const [tag, val] of Object.entries(playgroundAttr)) {
      if (!tag.startsWith('playground:')) continue;
      const key = tag.replace('playground:', '');
      const n = parseInt(val) || (val === 'yes' ? 1 : 0);
      if (n > 0) counts[key] = n;
    }
    return counts;
  })();

  // Open/closed state per item (keyed by osm_id or random uid)
  let openItems = new Set();
  function toggleItem(uid) {
    const next = new Set(openItems);
    next.has(uid) ? next.delete(uid) : next.add(uid);
    openItems = next;
  }
  function uid(f) {
    return `dev-${f.properties.osm_id ?? Math.random().toString(36).slice(2)}`;
  }
</script>

{#if features.length === 0 && Object.keys(fallbackCounts).length === 0}
  <ul><li><small class="text-muted">Keine Spielgeräte erfasst.</small></li></ul>
  <p class="text-muted mt-2 mb-0" style="font-size:smaller">
    Hilf mit und trage Spielgeräte auf
    <a href="https://mapcomplete.org/playgrounds.html" target="_blank" rel="noopener">MapComplete</a> ein.
  </p>
{:else}
  <!-- Summary counts -->
  <ul>
    {#if deviceFeatures.length}
      <li>{deviceFeatures.length} Spielgerät{deviceFeatures.length !== 1 ? 'e' : ''}</li>
    {/if}
    {#if fitnessFeatures.length}
      <li>{fitnessFeatures.length} Fitnessgerät{fitnessFeatures.length !== 1 ? 'e' : ''}</li>
    {/if}
    {#if benchCount}
      <li>{benchCount} {benchCount !== 1 ? 'Sitzbänke' : 'Sitzbank'}</li>
    {/if}
    {#if shelterCount}
      <li>{shelterCount} Unterstand{shelterCount !== 1 ? 'e' : ''}</li>
    {/if}
    {#if picnicCount}
      <li>{picnicCount} Picknicktisch{picnicCount !== 1 ? 'e' : ''}</li>
    {/if}
  </ul>

  <!-- Detailed device list (mapped individually) -->
  {#if deviceFeatures.length || fitnessFeatures.length || pitchFeatures.length}
    <ul class="mb-0 device-list">
      {#each deviceFeatures as f (f.properties.osm_id)}
        {@const key = f.properties.playground}
        {@const name = objDevices[key]?.name_de ?? key}
        {@const cat = objDevices[key]?.category ?? 'fallback'}
        {@const color = objColors[cat] ?? objColors['fallback']}
        {@const detail = getEquipmentAttributesFromProps(f.properties)}
        {@const id = uid(f)}
        <li>
          {#if detail}
            <button type="button" class="device-toggle" onclick={() => toggleItem(id)}>
              <span style="color:{color}">●</span> {name}
              <span class="bi {openItems.has(id) ? 'bi-chevron-up' : 'bi-chevron-down'} device-chevron"></span>
            </button>
            {#if openItems.has(id)}
              <div class="device-detail">{@html detail}</div>
            {/if}
          {:else}
            <span style="color:{color}">●</span> {name}
          {/if}
        </li>
      {/each}

      {#each fitnessFeatures as f (f.properties.osm_id)}
        {@const fsType = f.properties.fitness_station}
        {@const name = (fsType && objFitnessStation[fsType]) ? objFitnessStation[fsType] : 'Fitnessgerät'}
        {@const color = objColors['activity'] ?? objColors['fallback']}
        {@const detail = getEquipmentAttributesFromProps(f.properties)}
        {@const id = uid(f)}
        <li>
          {#if detail}
            <button type="button" class="device-toggle" onclick={() => toggleItem(id)}>
              <span style="color:{color}">●</span> {name}
              <span class="bi {openItems.has(id) ? 'bi-chevron-up' : 'bi-chevron-down'} device-chevron"></span>
            </button>
            {#if openItems.has(id)}
              <div class="device-detail">{@html detail}</div>
            {/if}
          {:else}
            <span style="color:{color}">●</span> {name}
          {/if}
        </li>
      {/each}

      {#each pitchFeatures as f (f.properties.osm_id)}
        {@const sport = f.properties.sport ?? ''}
        {@const label = (pitchLabels[sport]?.[0]) ?? (sport ? `Sportfeld (${sport})` : 'Sportfeld')}
        {@const color = objColors['fallback']}
        {@const detail = getEquipmentAttributesFromProps(f.properties)}
        {@const id = uid(f)}
        <li>
          {#if detail}
            <button type="button" class="device-toggle" onclick={() => toggleItem(id)}>
              <span style="color:{color}">●</span> {label}
              <span class="bi {openItems.has(id) ? 'bi-chevron-up' : 'bi-chevron-down'} device-chevron"></span>
            </button>
            {#if openItems.has(id)}
              <div class="device-detail">{@html detail}</div>
            {/if}
          {:else}
            <span style="color:{color}">●</span> {label}
          {/if}
        </li>
      {/each}
    </ul>

  <!-- Fallback: playground:<key> tags on the polygon itself -->
  {:else if Object.keys(fallbackCounts).length}
    <ul class="mb-0">
      {#each Object.entries(fallbackCounts) as [key, count]}
        {@const name = objDevices[key]?.name_de ?? key}
        {@const cat  = objDevices[key]?.category ?? 'fallback'}
        {@const color = objColors[cat] ?? objColors['fallback']}
        <li>
          <span style="color:{color}">●</span>
          {count > 1 ? `${count}× ` : ''}{name}
        </li>
      {/each}
    </ul>
    <p class="text-muted mt-2 mb-0" style="font-size:smaller">
      Hilf mit und trage Spielgeräte auf
      <a href="https://mapcomplete.org/playgrounds.html" target="_blank" rel="noopener">MapComplete</a> ein.
    </p>
  {/if}
{/if}

<style>
  .device-list { padding-left: 0; list-style: none; }
  .device-list li { margin-bottom: 0.25rem; }
  .device-toggle { cursor: pointer; user-select: none; }
  .device-toggle:hover { text-decoration: underline; }
  .device-chevron { font-size: 0.7rem; margin-left: 0.25rem; }
  .device-detail {
    margin: 0.25rem 0 0.5rem 1rem;
    font-size: smaller;
  }
  .device-detail :global(ul) { padding-left: 1.2rem; margin-bottom: 0; }
  .device-detail :global(img) { width: 100%; border-radius: 4px; margin-bottom: 0.25rem; }
</style>

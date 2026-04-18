<script>
  import { objDevices, objFitnessStation } from '../lib/objPlaygroundEquipment.js';

  /** @type {{ x: number, y: number } | null} */
  export let position = null;
  /** @type {import('ol').Feature | null} */
  export let feature = null;

  $: props = feature?.getProperties() ?? null;
  $: label = (() => {
    if (!props) return '';
    if (props.name) return props.name;
    if (props.playground && objDevices[props.playground]) return objDevices[props.playground].name_de;
    if (props.leisure === 'fitness_station') {
      return objFitnessStation[props.fitness_station] ?? 'Fitnessgerät';
    }
    if (props.leisure === 'pitch') {
      const sports = { soccer: 'Bolzplatz', basketball: 'Basketballfeld', table_tennis: 'Tischtennisplatte',
        volleyball: 'Volleyballfeld', tennis: 'Tennisfeld', multi: 'Mehrzweckspielfeld' };
      return sports[props.sport] ?? (props.sport ? `Sportfeld (${props.sport})` : 'Sportfeld');
    }
    if (props.amenity === 'bench') return 'Sitzbank';
    if (props.amenity === 'shelter') return 'Unterstand';
    if (props.leisure === 'picnic_table') return 'Picknicktisch';
    return props.playground || 'Gerät';
  })();

  $: panoramaxUuid = (() => {
    if (!props) return null;
    if (props.panoramax) return props.panoramax;
    for (let i = 0; i <= 9; i++) {
      const v = props[`panoramax:${i}`];
      if (v) return v;
    }
    return null;
  })();
  $: thumbUrl = panoramaxUuid ? `https://api.panoramax.xyz/api/pictures/${panoramaxUuid}/thumb.jpg` : null;

  $: style = position ? `left: ${position.x}px; top: ${position.y}px;` : '';
</script>

{#if position && props}
  <div
    class="fixed z-[60] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
    {style}
  >
    <div class="relative -translate-x-1/2 -translate-y-full -mt-3">
      <div class="equip-tooltip rounded-lg shadow-lg border">
        {#if thumbUrl}
          <img src={thumbUrl} alt={label} class="thumb" />
        {/if}
        <div class="px-2.5 py-1.5 text-sm font-medium">{label}</div>
      </div>
      <div class="absolute left-1/2 -translate-x-1/2 -bottom-2">
        <div
          class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px]"
          style="border-top-color: #ffffff;"
        ></div>
      </div>
    </div>
  </div>
{/if}

<style>
  .equip-tooltip {
    background: #ffffff;
    border-color: #e5e7eb;
    color: #1f2937;
    max-width: 220px;
    overflow: hidden;
  }
  .thumb {
    width: 100%;
    aspect-ratio: 16/9;
    object-fit: cover;
    display: block;
    border-radius: 6px 6px 0 0;
  }
</style>

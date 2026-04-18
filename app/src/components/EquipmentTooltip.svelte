<script>
  import { objDevices } from '../lib/objPlaygroundEquipment.js';

  /** @type {{ x: number, y: number } | null} */
  export let position = null;
  /** @type {import('ol').Feature | null} */
  export let feature = null;

  $: props = feature?.getProperties() ?? null;
  $: label = props
    ? (props.name || objDevices[props.playground]?.name_de || props.playground || 'Gerät')
    : '';
  $: style = position ? `left: ${position.x}px; top: ${position.y}px;` : '';
</script>

{#if position && props}
  <div
    class="fixed z-[60] pointer-events-none animate-in fade-in-0 zoom-in-95 duration-150"
    {style}
  >
    <div class="relative -translate-x-1/2 -translate-y-full -mt-3">
      <div class="equip-tooltip rounded-md shadow-md border px-2.5 py-1.5 text-sm font-medium whitespace-nowrap">
        {label}
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
    text-overflow: ellipsis;
  }
</style>

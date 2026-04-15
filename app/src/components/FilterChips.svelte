<script>
  import { filterStore, hasActiveFilters } from '../stores/filters.js';
  import { X } from 'lucide-svelte';
  import Badge from './ui/Badge.svelte';

  const FILTER_LABELS = {
    private:     'Nur öffentlich',
    water:       'Wasserspielplatz',
    baby:        'Baby-geeignet',
    toddler:     'Kleinkind-geeignet',
    wheelchair:  'Rollstuhlgerecht',
    bench:       'Mit Sitzbank',
    picnic:      'Mit Picknicktisch',
    shelter:     'Mit Unterstand',
    tableTennis: 'Tischtennisplatte',
    soccer:      'Mit Bolzplatz',
    basketball:  'Basketballfeld',
  };

  $: activeFilters = Object.entries($filterStore)
    .filter(([_, active]) => active)
    .map(([key]) => ({ key, label: FILTER_LABELS[key] }));

  $: hasFilters = hasActiveFilters($filterStore);

  function removeFilter(key) {
    filterStore.update(f => ({ ...f, [key]: false }));
  }

  function clearAll() {
    filterStore.update(f => Object.fromEntries(Object.keys(f).map(k => [k, false])));
  }
</script>

{#if hasFilters}
  <div class="flex items-center gap-2 px-3 py-2 overflow-x-auto scrollbar-hide">
    {#each activeFilters as filter (filter.key)}
      <Badge 
        variant="secondary" 
        class="shrink-0 flex items-center gap-1 pr-1 cursor-pointer hover:bg-secondary/60 transition-colors"
      >
        <span class="text-xs">{filter.label}</span>
        <button
          class="p-0.5 rounded-full hover:bg-foreground/10 transition-colors"
          onclick={() => removeFilter(filter.key)}
          aria-label="{filter.label} entfernen"
        >
          <X class="h-3 w-3" />
        </button>
      </Badge>
    {/each}

    {#if activeFilters.length > 1}
      <button
        class="shrink-0 text-xs text-muted-foreground hover:text-foreground transition-colors px-2"
        onclick={clearAll}
      >
        Alle löschen
      </button>
    {/if}
  </div>
{/if}

<style>
  .scrollbar-hide {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }
  .scrollbar-hide::-webkit-scrollbar {
    display: none;
  }
</style>

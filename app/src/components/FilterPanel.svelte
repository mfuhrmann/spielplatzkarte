<script>
  import { filterStore, hasActiveFilters } from '../stores/filters.js';
  import { Filter, X, Droplets, Baby, Accessibility, Armchair, UtensilsCrossed, Home, TableTennis, Goal, CircleDot, Lock } from 'lucide-svelte';
  import Button from './ui/Button.svelte';
  import { cn } from '../lib/utils.js';

  let open = false;
  let wrap;

  function onWindowClick(e) {
    if (open && wrap && !wrap.contains(e.target)) open = false;
  }

  const FILTERS = [
    { key: 'private',     label: 'Nur öffentlich',       icon: Lock },
    { key: 'water',       label: 'Wasserspielplatz',     icon: Droplets },
    { key: 'baby',        label: 'Baby-geeignet',        icon: Baby },
    { key: 'toddler',     label: 'Kleinkind-geeignet',   icon: Baby },
    { key: 'wheelchair',  label: 'Rollstuhlgerecht',     icon: Accessibility },
    { key: 'bench',       label: 'Mit Sitzbank',         icon: Armchair },
    { key: 'picnic',      label: 'Mit Picknicktisch',    icon: UtensilsCrossed },
    { key: 'shelter',     label: 'Mit Unterstand',       icon: Home },
    { key: 'tableTennis', label: 'Tischtennisplatte',    icon: TableTennis },
    { key: 'soccer',      label: 'Mit Bolzplatz',        icon: Goal },
    { key: 'basketball',  label: 'Basketballfeld',       icon: CircleDot },
  ];

  $: active = hasActiveFilters($filterStore);
  $: activeCount = Object.values($filterStore).filter(Boolean).length;

  function toggle(key) {
    filterStore.update(f => ({ ...f, [key]: !f[key] }));
  }

  function clearAll() {
    filterStore.update(f => Object.fromEntries(Object.keys(f).map(k => [k, false])));
  }
</script>

<svelte:window onclick={onWindowClick} />

<div class="relative" bind:this={wrap}>
  <Button
    variant={active ? 'default' : 'outline'}
    size="icon"
    class="h-8 w-8 relative"
    onclick={() => open = !open}
    title="Filter"
    aria-label="Filter"
    aria-expanded={open}
  >
    <Filter class="h-4 w-4" />
    {#if active}
      <span class="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
        {activeCount}
      </span>
    {/if}
  </Button>

  {#if open}
    <div class="filter-dropdown">
      <div class="flex items-center justify-between pb-3 mb-3 border-b border-border">
        <span class="font-semibold text-sm">Filter</span>
        {#if active}
          <button 
            class="text-xs text-muted-foreground hover:text-foreground transition-colors"
            onclick={clearAll}
          >
            Alle zurücksetzen
          </button>
        {/if}
      </div>

      <div class="space-y-1">
        {#each FILTERS as f}
          <label class={cn(
            'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer transition-colors',
            $filterStore[f.key] ? 'bg-primary/10' : 'hover:bg-muted'
          )}>
            <input
              type="checkbox"
              class="h-4 w-4 rounded border-input text-primary focus:ring-primary focus:ring-offset-0"
              checked={$filterStore[f.key]}
              onchange={() => toggle(f.key)}
            />
            <svelte:component this={f.icon} class="h-4 w-4 text-muted-foreground" />
            <span class="text-sm">{f.label}</span>
          </label>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .filter-dropdown {
    position: absolute;
    top: calc(100% + 8px);
    right: 0;
    background: var(--color-card);
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
    padding: 0.75rem;
    min-width: 240px;
    z-index: 200;
    animation: scale-in 0.15s ease-out;
  }

  @keyframes scale-in {
    from {
      opacity: 0;
      transform: scale(0.95);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  input[type="checkbox"] {
    accent-color: var(--color-primary);
  }
</style>

<script>
  import { Pencil } from 'lucide-svelte';
  export let href = '';
  export let label = '';
</script>

<a {href} target="_blank" rel="noopener" class="mc-edit-link">
  <Pencil class="h-3 w-3" />
  {label}
</a>

<style>
  .mc-edit-link {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: #9ca3af;
    text-decoration: none;
    transition: color 0.15s;
  }
  .mc-edit-link:hover {
    color: #374151;
    text-decoration: underline;
  }
</style>

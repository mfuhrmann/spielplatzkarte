<script>
  /** @type {string | null} */
  export let impressumUrl = null;
  /** @type {string | null} */
  export let privacyUrl = null;
  export let open = false;

  function close() { open = false; }

  function onBackdropClick(e) {
    if (e.target === e.currentTarget) close();
  }

  function onKeydown(e) {
    if (open && e.key === 'Escape') close();
  }
</script>

<svelte:window onkeydown={onKeydown} />

{#if open}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div class="modal-backdrop" onclick={onBackdropClick}>
    <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="legal-title">
      <div class="modal-header">
        <h5 class="modal-title" id="legal-title">Rechtliches</h5>
        <button type="button" class="close-btn" onclick={close} aria-label="Schließen">✕</button>
      </div>
      <div class="modal-body">
        <div class="links">
          {#if impressumUrl}
            <a href={impressumUrl} target="_blank" rel="noopener">Impressum ↗</a>
          {/if}
          {#if privacyUrl}
            <a href={privacyUrl} target="_blank" rel="noopener">Datenschutzerklärung ↗</a>
          {/if}
        </div>
      </div>
      <div class="modal-footer">
        <button type="button" class="ok-btn" onclick={close}>OK</button>
      </div>
    </div>
  </div>
{/if}

<style>
  .modal-backdrop {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    z-index: 1050;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .modal-box {
    background: #fff;
    border-radius: 6px;
    width: min(90vw, 360px);
    box-shadow: 0 4px 24px rgba(0,0,0,0.2);
  }

  .modal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #dee2e6;
  }

  .modal-title { margin: 0; font-size: 1rem; font-weight: 600; }

  .close-btn {
    background: none;
    border: none;
    font-size: 1rem;
    line-height: 1;
    color: #6c757d;
    cursor: pointer;
    padding: 0.25rem;
    border-radius: 4px;
  }
  .close-btn:hover { color: #000; background: #f0f0f0; }

  .modal-body { padding: 1rem; }

  .links {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .links a {
    font-size: 0.875rem;
    color: #495057;
    text-decoration: none;
  }
  .links a:hover { color: #1a6b3a; text-decoration: underline; }

  .modal-footer {
    padding: 0.5rem 1rem;
    border-top: 1px solid #dee2e6;
    display: flex;
    justify-content: flex-end;
  }

  .ok-btn {
    background: #ed7014;
    color: #fff;
    border: none;
    border-radius: 4px;
    padding: 0.25rem 0.75rem;
    font-size: 0.875rem;
    cursor: pointer;
  }
  .ok-btn:hover { background: #d16212; }
</style>

<script>
  import { fetchReviews, submitReview, starsHtml, relativeDate } from '../lib/reviews.js';
  import { _ } from 'svelte-i18n';

  /** @type {number} Playground centre latitude (WGS84) */
  export let lat = 0;
  /** @type {number} Playground centre longitude (WGS84) */
  export let lon = 0;

  let reviews = [];
  let loading = true;
  let error = false;

  // ── Star rating state ───────────────────────────────────────────────────
  let selectedRating = null;   // 20/40/60/80/100
  let hoverRating = null;
  let opinion = '';
  let submitting = false;
  let submitStatus = '';       // success/error message

  $: if (lat && lon) loadReviews();

  async function loadReviews() {
    loading = true;
    error = false;
    try {
      reviews = await fetchReviews(lat, lon);
    } catch {
      error = true;
    } finally {
      loading = false;
    }
  }

  async function submit() {
    if (!selectedRating) return;
    submitting = true;
    submitStatus = '';
    try {
      const ok = await submitReview(lat, lon, selectedRating, opinion.trim() || null);
      if (ok) {
        submitStatus = 'success';
        selectedRating = null;
        opinion = '';
        setTimeout(() => loadReviews(), 1500);
      } else {
        submitStatus = 'error';
      }
    } catch {
      submitStatus = 'error';
    } finally {
      submitting = false;
    }
  }

  $: displayRating = hoverRating ?? selectedRating;
  $: avgRating = reviews.length
    ? reviews.reduce((s, r) => s + r.payload.rating, 0) / reviews.length
    : null;
</script>

{#if loading}
  <small class="text-muted"><i>{$_('reviews.loading')}</i></small>

{:else if error}
  <small class="text-muted">{$_('reviews.loadError')}</small>

{:else}
  <!-- Average + review list -->
  {#if reviews.length > 0}
    <p class="mb-2">
      {@html starsHtml(avgRating)}
      <strong style="font-size:14px">{(avgRating / 20).toFixed(1)}</strong>
      <span class="text-muted" style="font-size:12px">
        ({$_('reviews.count', { values: { count: reviews.length } })})
      </span>
    </p>

    {#each reviews as r}
      {@const p = r.payload}
      <div class="review-item">
        {@html starsHtml(p.rating, '#f59e0b')}
        <span class="text-muted ms-1" style="font-size:11px">{relativeDate(p.iat, $_)}</span>
        {#if p.opinion}
          <p class="mb-0 mt-1" style="font-size:13px">{p.opinion}</p>
        {/if}
      </div>
    {/each}
  {:else}
    <p class="text-muted mb-2" style="font-size:12px">{$_('reviews.empty')}</p>
  {/if}

  <!-- Submission form -->
  <div class="mt-2 pt-2 border-top">
    <!-- Star picker -->
    <div class="d-flex gap-1 mb-2" role="group" aria-label={$_('reviews.selectRating')}>
      {#each [20, 40, 60, 80, 100] as v, i}
        <button
          type="button"
          class="star-btn"
          style="color: {displayRating && v <= displayRating ? '#f59e0b' : '#d1d5db'}"
          onclick={() => selectedRating = v}
          onmouseenter={() => hoverRating = v}
          onmouseleave={() => hoverRating = null}
          aria-label={$_('reviews.starLabel', { values: { n: i + 1 } })}
        >★</button>
      {/each}
    </div>

    <textarea
      class="form-control form-control-sm mb-2"
      rows="2"
      placeholder={$_('reviews.opinionPlaceholder')}
      style="font-size:13px; resize:none;"
      bind:value={opinion}
      disabled={submitting}
    ></textarea>

    <button
      class="btn btn-sm btn-outline-secondary"
      onclick={submit}
      disabled={!selectedRating || submitting}
      style="font-size:12px"
    >
      {#if submitting}
        <span class="spinner-border spinner-border-sm me-1" role="status"></span>
      {/if}
      {$_('reviews.submit')}
    </button>

    {#if submitStatus === 'success'}
      <p class="text-success mt-1 mb-0" style="font-size:11px">{$_('reviews.submitted')}</p>
    {:else if submitStatus === 'error'}
      <p class="text-danger mt-1 mb-0" style="font-size:11px">{$_('reviews.errorRetry')}</p>
    {/if}

    <p class="text-muted mt-1 mb-0" style="font-size:10px">
      {@html $_('reviews.privacyNote', { values: { mangroveLink: '<a href="https://mangrove.reviews" target="_blank" rel="noopener" class="link-secondary">Mangrove.reviews</a>' } })}
    </p>
  </div>
{/if}

<style>
  .review-item {
    margin-bottom: 0.5rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #f3f4f6;
    font-size: 13px;
  }
  .review-item:last-of-type { border-bottom: none; }

  .star-btn {
    background: none; border: none; padding: 0;
    font-size: 22px; line-height: 1; cursor: pointer;
    transition: color 0.1s;
  }
  .star-btn:hover { transform: scale(1.15); }
</style>

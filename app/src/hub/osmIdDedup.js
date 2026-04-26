// Cross-backend osm_id deduplication for the polygon tier.
//
// When two backends serve the same playground (same osm_id, e.g. a region
// boundary runs through a park), the polygon source would otherwise contain
// two overlapping features. This module keeps exactly one: the feature whose
// backend ran the most recent import.
//
// Tie-breaking rules (priority order, matching `add-cross-backend-osm-id-dedup`
// design D2):
//   1. Both timestamps parseable, strictly different → newer wins.
//   2. Exactly one is parseable → the parseable one wins.
//   3. Otherwise (both unparseable, or equal-numeric — e.g. same instant
//      emitted in different ISO TZ formats) → URL alphabetical:
//        - prefer the side with a non-empty `_backendUrl` over one missing it
//        - identity collision (same `_backendUrl`) → existing wins (first-write)
//        - else raw JS `<` compare on the unmodified URL string (no
//          case-folding, no scheme/trailing-slash normalisation)
//
// "Parseable" means the value is a string matching the ISO-8601 date+time
// shape (`YYYY-MM-DDTHH:MM…`) AND `Date.parse()` returns a finite number.
// The shape regex rejects engine-dependent partial inputs like `"2026"` or
// `"2026-01"` that V8's `Date.parse` happens to accept as Jan 1 of that
// year — those are not values any well-behaved Postgres `timestamptz`
// would emit, and accepting them risks letting a malformed timestamp
// silently win against a valid one from a more recent date.
//
// Features without an `osm_id` property (shouldn't happen in practice) are
// always added — no dedup attempted.

const ISO_DATETIME_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;

function isParseableTimestamp(v) {
  return typeof v === 'string'
    && ISO_DATETIME_RE.test(v)
    && Number.isFinite(Date.parse(v));
}

function urlAlphaWinner(a, b) {
  const aUrl = a.get('_backendUrl') ?? '';
  const bUrl = b.get('_backendUrl') ?? '';
  // When one side has no _backendUrl (shouldn't happen post-fan-out, but
  // could during a transient state), prefer the side with a real URL —
  // never let an unstamped feature beat a stamped one.
  if (aUrl !== '' && bUrl === '') return a;
  if (aUrl === '' && bUrl !== '') return b;
  // Identity collision: same backend serving the same osm_id twice in one
  // batch (osm2pgsql artefact for some multipolygon relations). Existing
  // wins; the second occurrence is silently dropped.
  if (aUrl === bUrl) return a;
  return aUrl < bUrl ? a : b;
}

/**
 * Given two OL Features for the same osm_id, return the one that should
 * survive. Pure function — no side effects.
 *
 * @param {import('ol/Feature.js').default} a
 * @param {import('ol/Feature.js').default} b
 * @returns {import('ol/Feature.js').default}
 */
export function dedupWinner(a, b) {
  const ta = a.get('_lastImportAt'); // ISO string | null | undefined
  const tb = b.get('_lastImportAt');

  const pa = isParseableTimestamp(ta);
  const pb = isParseableTimestamp(tb);

  // Step 1: both parseable, strictly different → newer wins.
  if (pa && pb) {
    const da = Date.parse(ta);
    const db = Date.parse(tb);
    if (db > da) return b;
    if (da > db) return a;
    // equal-numeric (e.g. same instant in different TZ formats) → step 3
    return urlAlphaWinner(a, b);
  }
  // Step 2: exactly one parseable → it wins.
  if (pa) return a;
  if (pb) return b;
  // Step 3: both unparseable → URL alphabetical.
  return urlAlphaWinner(a, b);
}

/**
 * Merge an incoming batch of features into `dedupMap`, updating the map in
 * place and returning which OL Features to add to / remove from the source.
 *
 * @param {import('ol/Feature.js').default[]} incoming
 * @param {Map<string, import('ol/Feature.js').default>} dedupMap
 *   Caller-owned map of osm_id (string) → current winning OL Feature.
 *   Modified in place.
 * @returns {{ toAdd: import('ol/Feature.js').default[], toRemove: import('ol/Feature.js').default[] }}
 */
export function applyDedup(incoming, dedupMap) {
  const toAdd    = [];
  const toRemove = [];

  for (const f of incoming) {
    const osmId = f.get('osm_id');
    if (osmId == null) {
      toAdd.push(f);
      continue;
    }
    const key      = String(osmId);
    const existing = dedupMap.get(key);
    if (!existing) {
      dedupMap.set(key, f);
      toAdd.push(f);
    } else {
      const winner = dedupWinner(existing, f);
      if (winner === f) {
        // Incoming beats the current winner — swap.
        dedupMap.set(key, f);
        toRemove.push(existing);
        toAdd.push(f);
      }
      // else: existing still wins, incoming is silently dropped.
    }
  }

  return { toAdd, toRemove };
}

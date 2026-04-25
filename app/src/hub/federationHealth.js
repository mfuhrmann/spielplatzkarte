// Federation health signal — stub for the P2 hub orchestrator.
//
// The real `federation-status.json` (per-backend reachability + freshness)
// ships in `add-federation-health-exposition`. Until that change lands, this
// module assumes every registered backend is online so P2 can wire the
// "skip offline backends" hook without blocking on health.
//
// Once health-exposition lands, replace `isBackendHealthy` with a poll of
// `/federation-status.json` and merge into the backends store.

/**
 * Returns true while the backend should be queried by the hub orchestrator.
 *
 * @param {{ url: string }} backend
 * @returns {boolean}
 */
export function isBackendHealthy(_backend) {
  // STUB: always healthy. See module comment.
  return true;
}

/**
 * Filter a backends list to only the healthy ones, applied AFTER the bbox
 * router so the orchestrator's fan-out skips known-down peers entirely.
 */
export function filterHealthy(backends) {
  return backends.filter(isBackendHealthy);
}

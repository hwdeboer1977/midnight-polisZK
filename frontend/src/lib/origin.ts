/**
 * Whether this page is served from the machine the demo services run on.
 *
 * `/api/*` is a dev-server proxy to a local process that holds the platform
 * signing key. Behind a deployed origin there is no such process and there
 * should not be — it would mean putting the platform key on a web host — so
 * everything that route drives is simply absent there.
 *
 * Decided by origin rather than probed: the answer never changes for a given
 * deployment, and a failed probe cannot tell "not running" from "not hosted",
 * which are different problems with different advice.
 */
export const servedLocally =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\]|\d+\.\d+\.\d+\.\d+)$/.test(window.location.hostname);

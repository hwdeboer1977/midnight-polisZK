// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Where the platform service lives, and what a page may ask of it.
 *
 * Two questions that used to be one, and conflating them is what put a button
 * on a hosted page that could only ever answer 405.
 *
 * ── Where ───────────────────────────────────────────────────────────────────
 *
 * `/api/*` was a relative path everywhere, which works in development because
 * Vite proxies it to the local service. Behind a deployed origin it resolves to
 * the static host, which has no such route. `VITE_API_BASE` names the service
 * explicitly; unset, everything stays relative and the dev proxy behaves as
 * before.
 *
 * ── What ────────────────────────────────────────────────────────────────────
 *
 * Reaching the service is not the same as being allowed to use it. The faucet,
 * minting and fund+pay sign with the PLATFORM wallet behind a bearer token —
 * and a token shipped in a Vite bundle is a token published, so a browser cannot
 * hold one. Those three are operator actions, available where the operator is:
 * on their own machine, through the dev proxy.
 *
 * So `platformActions` is deliberately NOT "is an API configured". Pointing
 * `VITE_API_BASE` at a hosted backend must not put an unlimited mint button in
 * front of the public, and writing it this way is what stops a later edit from
 * doing so by accident.
 *
 * Signing up and drawing the starter allowance are the exceptions, and they are
 * exceptions on the SERVER first — `/api/onboard` and `/api/claim` are bounded
 * rather than authenticated, for reasons `guards.ts` sets out. A stranger has to
 * be able to call both or the hosted app is a brochure, so they ask a third
 * question: not "am I the operator" but "is there a service to ask at all".
 */

/** Trailing slash stripped, so `apiUrl` never produces a double slash. */
const configuredBase = (import.meta.env.VITE_API_BASE ?? "").trim().replace(/\/+$/, "");

/** The service's base URL, or "" for same-origin (the dev proxy). */
export const apiBase = configuredBase;

/**
 * Whether this page is served from the machine the platform service runs on.
 *
 * Decided by origin rather than probed: the answer never changes for a given
 * deployment, and a failed probe cannot tell "not running" from "not hosted",
 * which are different problems with different advice.
 */
export const servedLocally =
  typeof window !== "undefined" &&
  /^(localhost|127\.0\.0\.1|\[::1\]|\d+\.\d+\.\d+\.\d+)$/.test(window.location.hostname);

/**
 * Whether this page may invoke the operations that spend the platform wallet.
 *
 * Local only, and not because of a missing feature — because the credential
 * they need cannot exist in a browser without being public. A hosted page shows
 * what to send the operator instead.
 */
export const platformActions = servedLocally;

/**
 * Whether self-service signup can be reached from here.
 *
 * A different question from `platformActions`, and the distinction is the whole
 * reason both exist. `/api/onboard` is public — bounded by a rate limit, a
 * one-per-key rule and an optional signup code rather than by a token — because
 * the contract it deploys is assigned to the caller's own key, so the worst an
 * abuser achieves is a contract only they can use, paid for in the platform's
 * fees. The three routes that mint an unbounded amount or move an employer's
 * money stay operator-only, where no rate limit would make publishing them safe.
 *
 * True wherever a service is actually reachable: locally through the dev proxy,
 * or on a hosted build once VITE_API_BASE names the backend. Without that the
 * request would go to the static host and answer 405, so the page says what to
 * do instead.
 */
export const onboardingAvailable = servedLocally || apiBase !== "";

/**
 * Whether the registered employer's starter allowance can be drawn from here.
 *
 * The same question as `onboardingAvailable` — is a service reachable — and
 * named separately because it gates a different route and could one day part
 * company with it. It must NOT be `platformActions`, and it was: the claim
 * button vanished on the hosted app, which put an employer through self-service
 * signup and then told them the money salaries settle in is only obtainable by
 * running the repo locally.
 *
 * `/api/claim` is safe to publish for a narrower reason than `/api/onboard` is.
 * It mints, but only to a key the chain already shows is an employer, only once
 * per key, and only EMPLOYER_ALLOWANCE — the amount is fixed by the server and
 * the request cannot name one. `/api/faucet` is that same mint with the ceiling
 * removed, which is why it stays behind `platformActions` and this does not.
 */
export const claimAvailable = servedLocally || apiBase !== "";

/** Joins a `/api/...` path onto whichever base is in force. */
export function apiUrl(path: string): string {
  return `${apiBase}${path.startsWith("/") ? path : `/${path}`}`;
}

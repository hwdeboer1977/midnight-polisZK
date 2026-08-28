import { apiBase, apiUrl, servedLocally } from "./origin";
export interface Deployment {
  contractAddress: string;
  contractName: string;
  networkId: string;
  instance?: string;
  /** pEUR only: the token type its coins carry, so balances can be labelled. */
  tokenId?: string;
  /**
   * Deployed from a contract version this build can no longer read.
   *
   * Not a deletion, and the distinction matters: the contract is still on chain,
   * still bound to its employer, and `assignEmployer` cannot be repeated — so
   * the address is the only thing left that can find it, and throwing the record
   * away would be permanent. This says "do not query it", not "it never existed".
   *
   * `decodePayrollLedger` already detects these from their state and drops them,
   * which is what makes the app correct. What it cannot do is stop the query:
   * every scan on every page load fetched three dead contracts and logged the
   * same three warnings, so the console read as broken while the app was fine.
   * The flag moves that answer from after the request to before it.
   */
  retired?: boolean;
}

export type Deployments = Record<string, Deployment>;

/**
 * Every contract this app knows about, from two sources.
 *
 * The BASELINE comes from the build's own environment, written into
 * `frontend/.env.local` by `npm run frontend:config` from the root `.env`, with
 * pEUR's token id read off the contract. It is what lets a hosted build know any
 * addresses at all, and it is fixed at the moment the bundle was built — it
 * holds the four shared contracts and nothing that was deployed since.
 *
 * The BACKEND knows about anything deployed since, including contracts it
 * deployed itself a minute ago. Without asking it, a freshly onboarded employer
 * reloads and is told "this wallet is not registered as an employer" about
 * their own contract — the snapshot cannot contain something created after it
 * was taken.
 *
 * Baseline first, backend merged over it: the built-in addresses keep working
 * with no backend reachable, and the live list wins where both have an entry.
 * Neither source is trusted for anything but addresses; what a contract actually
 * says about its employer is read from the chain.
 */
export async function loadDeployments(): Promise<Deployments> {
  const [stat, live] = await Promise.all([loadStatic(), loadFromApi()]);
  const merged: Deployments = { ...stat, ...live };
  // `retired` survives the merge, for the same reason it does on the server.
  //
  // Nothing in the env baseline can carry the flag — it names four current
  // contracts and no history — so in practice this now only defends against a
  // future baseline that does. Kept rather than deleted because the rule it
  // encodes is still true: retirement is sticky in one direction, and a merge
  // must never be the thing that un-retires a contract.
  for (const [key, entry] of Object.entries(stat)) {
    if (entry.retired && merged[key] && !merged[key].retired) {
      merged[key] = { ...merged[key], retired: true };
    }
    // `tokenId` survives the merge too, and for a plainer reason than `retired`
    // does: the backend's record simply may not carry one. It is written by
    // `frontend:config`, which reads the token off the deployed pEUR contract —
    // `deployment.json` is appended to by deploy scripts that do not. A
    // wholesale overwrite then replaces a known token id with nothing, and every
    // caller that needs one fails with "No pEUR token id for <network>" on a page
    // whose baseline had it all along.
    //
    // Only fills a gap; a backend that DOES carry a token id still wins.
    if (entry.tokenId && merged[key] && !merged[key].tokenId) {
      merged[key] = { ...merged[key], tokenId: entry.tokenId };
    }
  }
  return pinned(merged);
}

/**
 * Narrows the list to the payroll contracts this build is pinned to.
 *
 * Why this exists: a payroll contract compiled from different contract source
 * has different verifier keys, and this frontend can only transact with one it
 * agrees with. Every older instance stays listed, stays selectable, and fails
 * at submit with a wall of verifier-key text — which is what an afternoon was
 * spent chasing. `VITE_PAYROLL_CONTRACTS` names the addresses that belong to
 * the contract version this bundle was built from, and everything else stops
 * being offered.
 *
 * Applied AFTER the merge rather than to either source, because both can carry
 * stale instances: the env baseline names whichever payroll contract `.env` was
 * last pointed at, and the backend keeps its own list of what it onboarded.
 *
 * Payroll only. Other contracts are single-deployment and there is nothing to
 * choose between.
 *
 * ── The cost, stated plainly ────────────────────────────────────────────────
 *
 * A contract onboarded AFTER this bundle was built is not in the list, so it
 * will not appear until the variable is updated and the frontend redeployed.
 * That is the wrong trade for a service onboarding real employers, and the
 * right one while a contract is changing under you. Unset, nothing is filtered
 * and behaviour is exactly as before.
 */
/**
 * The pinned addresses, or null when nothing is pinned.
 *
 * Exported because the deployment list is not the only place a payroll contract
 * is offered: the deployer's registrations roll comes from the registry service
 * and knows nothing about this file, so it has to apply the same rule from the
 * same source or the two views disagree about which contracts exist.
 */
export function pinnedContracts(): Set<string> | null {
  // Cast rather than typed in an ambient declaration: Vite types unknown keys
  // loosely enough that .split() lands on any.
  //
  // Falls back to the baseline address, which is the whole point: the contract
  // this build was told to run is by definition the one it may offer, so the
  // common case needs no second variable. Writing the default out as
  // `VITE_PAYROLL_CONTRACTS` was the first shape and it put the same 64
  // characters in the file twice — two names for one fact, free to disagree
  // after any hand edit. `VITE_PAYROLL_CONTRACTS` now appears only when someone
  // deliberately widens the list beyond that one contract.
  const raw = String(
    import.meta.env.VITE_PAYROLL_CONTRACTS ?? import.meta.env.VITE_PAYROLL_ADDRESS ?? ""
  ).trim();
  if (!raw) return null;

  const allowed = new Set(
    raw
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
  return allowed.size > 0 ? allowed : null;
}

/** Whether a payroll contract belongs to the build. True when nothing is pinned. */
export function isPinned(contractAddress: string): boolean {
  const allowed = pinnedContracts();
  return !allowed || allowed.has(contractAddress.trim().toLowerCase());
}

function pinned(all: Deployments): Deployments {
  const allowed = pinnedContracts();
  if (!allowed) return all;

  const kept: Deployments = {};
  for (const [key, entry] of Object.entries(all)) {
    if (entry.contractName !== "payroll") {
      kept[key] = entry;
    } else if (allowed.has(entry.contractAddress.toLowerCase())) {
      kept[key] = entry;
    }
  }
  return kept;
}

/**
 * The baseline, built from the build's environment.
 *
 * This used to be `fetch("/deployments.json")` — a committed address book served
 * as a static asset. It carried every contract ever deployed, retired ones
 * included, and keeping it honest meant hand-editing JSON that had to agree with
 * the root `deployment.json`. The four shared contracts it existed to carry are
 * now lines in the root `.env`, copied into Vite's namespace by
 * `npm run frontend:config`.
 *
 * Synchronous in substance, async in shape: the signature is kept so
 * `loadDeployments` still reads as two sources merged, and so restoring a
 * fetched source later does not ripple.
 *
 * An unset variable yields no entry rather than an empty address, because a
 * deployment record with a blank address is worse than a missing one — it
 * satisfies every "do we have a contract?" check and then fails at the indexer.
 *
 * Nothing here is trusted for more than an address. Whether a payroll contract
 * belongs to this build is still decided by `pinned()`, and who controls it is
 * still read from the chain.
 */
async function loadStatic(): Promise<Deployments> {
  const networkId = String(import.meta.env.VITE_NETWORK_ID ?? "").trim();
  if (!networkId) return {};

  const tokenId = String(import.meta.env.VITE_PEUR_TOKEN_ID ?? "").trim();
  const baseline: [string, string, string?][] = [
    ["payroll", String(import.meta.env.VITE_PAYROLL_ADDRESS ?? "")],
    ["peur", String(import.meta.env.VITE_PEUR_ADDRESS ?? ""), tokenId],
    ["taxparams", String(import.meta.env.VITE_TAXPARAMS_ADDRESS ?? "")],
    ["fund", String(import.meta.env.VITE_FUND_ADDRESS ?? "")],
    ["taxvault", String(import.meta.env.VITE_TAXVAULT_ADDRESS ?? "")],
  ];

  const out: Deployments = {};
  for (const [contractName, rawAddress, rawToken] of baseline) {
    const contractAddress = rawAddress.trim();
    if (!contractAddress) continue;
    out[`${networkId}/${contractName}`] = {
      contractAddress,
      contractName,
      networkId,
      ...(rawToken ? { tokenId: rawToken } : {}),
    };
  }
  return out;
}

/**
 * Skipped entirely when no backend is configured, rather than attempted and
 * caught: on a hosted build with no VITE_API_BASE the request would go to the
 * static host and 404 on every page load, which is noise in the console for an
 * answer we already know.
 */
async function loadFromApi(): Promise<Deployments> {
  if (!apiBase && !servedLocally) return {};
  try {
    const response = await fetch(apiUrl("/api/deployments"), { cache: "no-store" });
    return response.ok ? ((await response.json()) as Deployments) : {};
  } catch {
    // The backend being down must not take the static list with it.
    return {};
  }
}

export function forNetwork(
  deployments: Deployments,
  networkId: string
): [string, Deployment][] {
  return Object.entries(deployments)
    .filter(([key]) => key.startsWith(`${networkId}/`))
    .map(([key, value]) => [key.slice(networkId.length + 1), value]);
}

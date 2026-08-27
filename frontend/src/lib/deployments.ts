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
 * The STATIC file is written by `npm run frontend:config` from deployment.json,
 * with pEUR's token id read off the contract, and committed — which is what
 * lets a hosted build know any addresses at all. It is also a snapshot taken
 * when the frontend was built.
 *
 * The BACKEND knows about anything deployed since, including contracts it
 * deployed itself a minute ago. Without asking it, a freshly onboarded employer
 * reloads and is told "this wallet is not registered as an employer" about
 * their own contract — the snapshot cannot contain something created after it
 * was taken.
 *
 * Static first, backend merged over it: the committed file stays the baseline
 * that works with no backend reachable, and the live list wins where both have
 * an entry. Neither source is trusted for anything but addresses; what a
 * contract actually says about its employer is read from the chain.
 */
export async function loadDeployments(): Promise<Deployments> {
  const [stat, live] = await Promise.all([loadStatic(), loadFromApi()]);
  const merged: Deployments = { ...stat, ...live };
  // `retired` survives the merge, for the same reason it does on the server.
  // The backend wins on every other field because it knows about contracts
  // deployed after this bundle was built — but its own record for a contract IT
  // onboarded carries no flag, since retirement is written by hand into the
  // committed file. Letting the API record win wholesale would un-retire
  // exactly the contracts the static file was edited to retire.
  for (const [key, entry] of Object.entries(stat)) {
    if (entry.retired && merged[key] && !merged[key].retired) {
      merged[key] = { ...merged[key], retired: true };
    }
  }
  return merged;
}

async function loadStatic(): Promise<Deployments> {
  try {
    const response = await fetch("/deployments.json", { cache: "no-store" });
    return response.ok ? ((await response.json()) as Deployments) : {};
  } catch {
    return {};
  }
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

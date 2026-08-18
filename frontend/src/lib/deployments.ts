export interface Deployment {
  contractAddress: string;
  contractName: string;
  networkId: string;
  instance?: string;
  /** pEUR only: the token type its coins carry, so balances can be labelled. */
  tokenId?: string;
}

export type Deployments = Record<string, Deployment>;

/**
 * Written by `npm run frontend:config` from deployment.json, with pEUR's token
 * id read off the contract. Optional: the app still connects wallets without it.
 */
export async function loadDeployments(): Promise<Deployments> {
  try {
    const response = await fetch("/deployments.json", { cache: "no-store" });
    return response.ok ? ((await response.json()) as Deployments) : {};
  } catch {
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

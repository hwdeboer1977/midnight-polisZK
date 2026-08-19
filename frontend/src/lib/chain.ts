import { ContractState, type ChargedState } from "@midnight-ntwrk/compact-runtime";

/**
 * Reading public contract state needs no wallet and no proving — just the
 * indexer and the runtime that can deserialize what it returns. The indexer
 * sends `access-control-allow-origin: *`, so the browser can query it directly.
 */
export const INDEXERS: Record<string, string> = {
  undeployed: "http://127.0.0.1:8088/api/v4/graphql",
  preview: "https://indexer.preview.midnight.network/api/v4/graphql",
  preprod: "https://indexer.preprod.midnight.network/api/v4/graphql",
};

/** The websocket half, needed by the indexer provider when submitting. */
export const INDEXER_WS: Record<string, string> = {
  undeployed: "ws://127.0.0.1:8088/api/v4/graphql/ws",
  preview: "wss://indexer.preview.midnight.network/api/v4/graphql/ws",
  preprod: "wss://indexer.preprod.midnight.network/api/v4/graphql/ws",
};

/**
 * Proving runs on the employer's own machine, for every network.
 *
 * There is no hosted proof server and there should not be: proving takes the
 * salaries as input, so a remote prover would be handed exactly the figures
 * this design keeps off the chain. The server sends
 * `access-control-allow-origin` for the page's origin, so the browser reaches
 * it directly.
 */
export const PROOF_SERVERS: Record<string, string> = {
  undeployed: "http://127.0.0.1:6300",
  preview: "http://127.0.0.1:6300",
  preprod: "http://127.0.0.1:6300",
};

/**
 * Where to get tNIGHT for each network, mirroring `src/utils/environment.ts`.
 *
 * tDUST is deliberately absent: it is not handed out but generated from tNIGHT
 * once that tNIGHT is registered for generation, so there is nothing to link to.
 *
 * The local devnet has no faucet — its dev preset pre-funds a well-known account
 * instead — and an empty string is how that is said.
 */
export const FAUCETS: Record<string, string> = {
  undeployed: "",
  preview: "https://midnight-tmnight-preview.nethermind.dev/",
  preprod: "https://midnight-tmnight-preprod.nethermind.dev/",
};

/** Every contract action carries the state as it stood after that action. */
const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      ... on ContractDeploy { state }
      ... on ContractCall { state }
      ... on ContractUpdate { state }
      transaction { hash block { height } }
    }
  }
`;

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i += 1) {
    bytes[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

export interface ChainState {
  /** Charged state, ready to hand to a generated `ledger()` function. */
  data: ChargedState;
  blockHeight: number | null;
  txHash: string | null;
}

export async function fetchContractState(
  networkId: string,
  address: string
): Promise<ChainState | null> {
  const endpoint = INDEXERS[networkId];
  if (!endpoint) throw new Error(`No indexer configured for "${networkId}"`);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      query: CONTRACT_STATE_QUERY,
      variables: { address },
    }),
  });

  if (!response.ok) {
    throw new Error(`Indexer returned ${response.status}`);
  }

  const body = (await response.json()) as {
    data?: { contractAction?: { state?: string; transaction?: { hash?: string; block?: { height?: number } } } | null };
    errors?: { message: string }[];
  };

  if (body.errors?.length) throw new Error(body.errors[0]!.message);

  const action = body.data?.contractAction;
  if (!action?.state) return null;

  return {
    data: ContractState.deserialize(hexToBytes(action.state)).data,
    blockHeight: action.transaction?.block?.height ?? null,
    txHash: action.transaction?.hash ?? null,
  };
}

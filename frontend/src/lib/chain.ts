import { ContractState, type ChargedState } from "@midnight-ntwrk/compact-runtime";

/**
 * Reading public contract state needs no wallet and no proving — just the
 * indexer and the runtime that can deserialize what it returns. The indexer
 * sends `access-control-allow-origin: *`, so the browser can query it directly.
 */
const INDEXERS: Record<string, string> = {
  undeployed: "http://127.0.0.1:8088/api/v4/graphql",
  preview: "https://indexer.preview.midnight.network/api/v4/graphql",
  preprod: "https://indexer.preprod.midnight.network/api/v4/graphql",
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

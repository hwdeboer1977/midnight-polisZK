// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import path from "path";
import { ContractState } from "@midnight-ntwrk/compact-runtime";
import { getDeployment } from "./deployments.js";
import { managedPath } from "./contract.js";

const CONTRACT_STATE_QUERY = `
  query ContractState($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      ... on ContractDeploy { state }
      ... on ContractCall { state }
      ... on ContractUpdate { state }
    }
  }
`;

/**
 * The pEUR token type, read off the deployed contract.
 *
 * Not from `deployment.json`, which records addresses and nothing else: the
 * token id is derived from the contract address at mint time and only
 * `frontend/public/deployments.json` was ever enriched with it. Reading the
 * chain removes the question of which file is current — and the symptom of
 * getting it wrong is mild but confusing, a real balance filed under
 * "other tokens held" with a note that no pEUR is deployed.
 *
 * Returns null when there is no pEUR on this network, or when it has never been
 * minted — the id is zero until the first mint records it.
 */
export async function peurTokenId(
  networkId: string,
  indexer: string
): Promise<string | null> {
  const deployment = getDeployment(networkId, "peur");
  if (!deployment) return null;

  try {
    const response = await fetch(indexer, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        query: CONTRACT_STATE_QUERY,
        variables: { address: deployment.contractAddress },
      }),
    });
    const body: any = await response.json();
    const encoded = body.data?.contractAction?.state;
    if (!encoded) return null;

    const module_: any = await import(
      path.join(managedPath("peur"), "contract", "index.js")
    );
    const state = ContractState.deserialize(Buffer.from(encoded, "hex")).data;
    const id = Buffer.from(module_.ledger(state).tokenId as Uint8Array).toString("hex");
    return /^0+$/.test(id) ? null : id;
  } catch {
    // A balance check must not fail because a label could not be resolved.
    return null;
  }
}

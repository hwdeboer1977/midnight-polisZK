// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { connectContract, type ProvingMode } from "./submitPayroll";

/**
 * Vacates a payroll contract's employer seat, from the browser, as the platform.
 *
 * Called directly rather than through the backend, and that is the honest
 * arrangement rather than a shortcut: `revokeEmployer` asserts
 * `ownPublicKey() == platform`, so the transaction has to be signed by the
 * platform key — which is the wallet the deployer already has connected on this
 * page. Routing it through the server would mean the server holding a key that
 * can take contracts away from customers, to save the deployer a click.
 *
 * Takes no arguments and returns nothing. Everything it decides is read from the
 * chain: who the platform is, and whether there is anyone to revoke.
 *
 * Proving is quick compared with `setPayroll` — one small circuit, no roster —
 * but it is still a proof, so the caller gets progress rather than a frozen
 * button.
 *
 * `provingMode` defaults to `local` to match every other caller, but this is the
 * one circuit where `wallet` costs nothing: it takes no arguments and reads no
 * witness, so there is no private input for the wallet to see. The caller
 * decides; `EmployerTable`'s revoke action defaults it to `wallet` and explains
 * why there.
 */
export async function revokeEmployer(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  provingMode?: ProvingMode;
  onProgress?: (message: string) => void;
}): Promise<{ txHash: string }> {
  const { api, networkId, contractAddress, provingMode = "local" } = options;
  const onProgress = options.onProgress ?? (() => {});

  const { deployed } = await connectContract({
    api,
    networkId,
    contractAddress,
    contractName: "payroll",
    provingMode,
    onProgress,
  });

  onProgress("Proving the revocation…");
  const tx = await deployed.callTx.revokeEmployer();

  return { txHash: tx.public?.txHash ?? "" };
}

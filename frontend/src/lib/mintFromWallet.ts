// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { connectContract, type ProvingMode, type SubmitProgress } from "./submitPayroll";
import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";

/**
 * Minting pEUR from the connected wallet, with no service and no proof server.
 *
 * ── Why this can exist ─────────────────────────────────────────────────────
 *
 * `mint(amount)` in `peur.compact` asserts nothing about who calls it — the
 * issuer check was removed so a demo can fund itself — and it mints to
 * `ownPublicKey()`, which is whoever signed. So the caller does not have to be
 * the platform; it only had to be, because minting was implemented as a service
 * route and nothing else.
 *
 * ⚠️ That made every mint depend on infrastructure the operation never needed:
 * a running proof server, a `PLATFORM_API_TOKEN`, and the platform wallet's
 * dust state being current — which is where `170 InvalidDustSpendProof` came
 * from, twice, when the platform wallet had just spent dust on something else.
 * A wallet minting for itself has none of those failure modes.
 *
 * ── What it does NOT change ────────────────────────────────────────────────
 *
 * The demo warning stands and gets worse, not better: anyone can mint any
 * amount, so `totalSupply` measures nothing. Moving the call into the browser
 * makes that visible rather than introducing it — the contract was always open,
 * and a service route in front of an open circuit is a door beside an open
 * wall. A real deployment restores the issuer check in the contract; nothing
 * this page does can substitute for that.
 *
 * ── Where the coin lands ───────────────────────────────────────────────────
 *
 * `ownPublicKey()`, so it lands in the wallet that signed and nowhere else.
 * That is the useful part for funding: connect the social treasury, mint there,
 * and the wallet-paid deposit path opens — which needs the treasury to be the
 * connected wallet anyway.
 */
export interface WalletMintResult {
  txHash: string;
  amountMinor: bigint;
}

export async function mintFromWallet(options: {
  api: ConnectedAPI;
  networkId: string;
  /** The pEUR contract address, hex. */
  contractAddress: string;
  amountMinor: bigint;
  provingMode?: ProvingMode;
  onProgress?: SubmitProgress;
}): Promise<WalletMintResult> {
  const { api, networkId, contractAddress, amountMinor } = options;
  const onProgress = options.onProgress ?? (() => {});

  if (amountMinor <= 0n) throw new Error("Mint an amount above zero.");
  // `Uint<48>` in the circuit. Refused here rather than inside proving, where
  // an overflow surfaces as an assertion with no field name attached.
  if (amountMinor > 281474976710655n) {
    throw new Error("That amount does not fit the contract's Uint<48> mint field.");
  }

  onProgress("Connecting to the pEUR contract…");
  const { deployed } = await connectContract({
    api,
    networkId,
    contractAddress,
    contractName: "peur",
    provingMode: options.provingMode,
    onProgress,
  });

  onProgress("Proving — a minute or two. Approve in your wallet if it asks…");
  const tx: any = await deployed.callTx.mint(amountMinor);

  const txHash = String(tx?.public?.txHash ?? tx?.txHash ?? "");
  onProgress(`Minted — ${txHash}`);
  return { txHash, amountMinor };
}

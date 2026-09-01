// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { setNetworkId } from "@midnight-ntwrk/midnight-js-network-id";
import { EnvironmentManager } from "./environment.js";
import { getDeployment } from "./deployments.js";
import { benefitTokenColour } from "./fund-deposit.js";
import {
  confirmDeposit,
  freshNonce,
  poolFile,
  recordPending,
} from "./fund-pool.js";
import { contractModule as loadModule } from "./fund-deposit.js";

/**
 * The half of a deposit that must happen on the SERVICE, when the browser pays.
 *
 * `depositToFund` does everything in one place because the service holds the
 * treasury seed. Once the treasury is a wallet in someone's browser, the paying
 * half moves there — but one step cannot follow it, and it is the step that
 * makes the money spendable afterwards.
 *
 * ── Why the nonce cannot live in the browser ───────────────────────────────
 *
 * A shielded coin is found by its nonce, and the nonce exists nowhere but in
 * whoever generated it. `fund-pool.json` is the fund's only record of the coins
 * it holds — `relay-run.ts` reads it to hand a claimant something to spend, and
 * a coin the fund holds but cannot describe is money no claim can ever reach.
 * A browser tab is not a place to keep that: close it at the wrong moment and
 * the record is gone while the coin is on chain.
 *
 * So the nonce is generated here, written here BEFORE anything is submitted,
 * and handed to the browser to spend. `fund-pool.ts` explains the ordering:
 *
 *   "the deposit is written here BEFORE the transaction is submitted, not
 *    after. A crash between the two leaves a `pending` entry that may or may
 *    not describe a real coin, which is recoverable by looking; the other order
 *    leaves a real coin nobody can describe, which is not."
 *
 * That reasoning is unchanged by moving the payer. It is why this is two calls
 * — prepare, then confirm — rather than one report after the fact.
 */

export interface PreparedDeposit {
  /** Where to send it. */
  contractAddress: string;
  /** `fundBenefits` on the fund, `deposit` on the vault. */
  circuitId: "fundBenefits" | "deposit";
  target: "fund" | "taxvault";
  /** The coin to mint into the call, hex. Recorded before this returns. */
  nonce: string;
  /** pEUR's token type, hex. The contract pins it on first deposit. */
  color: string;
  /** Minor units, as a string — JSON has no bigint. */
  value: string;
  /** The payroll contract these contributions came from. */
  source: string;
  period: number;
  /** Which treasury the browser must be connected as, for the UI to check. */
  expectedPayer: string | null;
}

const hex = (b: Uint8Array): string => Buffer.from(b).toString("hex");

/**
 * Records the coin and returns what the browser needs to build the call.
 *
 * Deliberately does NOT check the payer's balance: the payer is a wallet this
 * service does not hold and cannot read. The browser checks it — and the
 * contract checks the coin regardless, which is the only check that binds.
 */
export async function prepareDeposit(options: {
  amountMinor: bigint;
  period: number;
  source: string;
  target?: "fund" | "taxvault";
  log?: (line: string) => void;
}): Promise<PreparedDeposit> {
  const { amountMinor, period, source } = options;
  const target = options.target ?? "fund";
  const log = options.log ?? (() => {});

  if (amountMinor <= 0n) throw new Error("amount must be greater than zero");
  if (!Number.isInteger(period) || period < 200001 || period > 299912) {
    throw new Error(`period must be YYYYMM, e.g. 202609 — got "${period}"`);
  }
  if (!/^[0-9a-f]{64}$/i.test(source.replace(/^0x/, ""))) {
    throw new Error("source must be a payroll contract address, 64 hex characters");
  }

  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const record = getDeployment(network.networkId, target);
  if (!record) throw new Error(`No ${target} deployed on ${network.networkId}`);

  const colour = await benefitTokenColour(network);

  // Written before the browser is told anything, so there is no window in which
  // a caller could submit a coin this file does not know about.
  const nonce = freshNonce();
  recordPending(network.networkId, record.contractAddress, {
    nonce,
    color: colour,
    value: amountMinor,
  });
  log(`coin nonce recorded in ${poolFile()} before the browser submits`);

  // Which treasury OUGHT to be paying. Stated so the page can refuse a mismatch
  // before proving rather than after: the destination decides the source, and
  // getting it wrong pays the right contract out of the wrong pot — which the
  // chain will happily accept and nobody can unpick afterwards.
  const label = target === "fund" ? "SOCIAL" : "TAX";
  const expectedPayer =
    process.env[`${label}_TREASURY_KEY`]?.trim().replace(/^0x/, "").toLowerCase() ?? null;

  return {
    contractAddress: record.contractAddress,
    circuitId: target === "fund" ? "fundBenefits" : "deposit",
    target,
    nonce: hex(nonce),
    color: hex(colour),
    value: amountMinor.toString(),
    source: source.replace(/^0x/, "").toLowerCase(),
    period,
    expectedPayer,
  };
}

/**
 * Marks a prepared deposit as landed, reading its ordinal off the chain.
 *
 * The ordinal is read rather than counted, for the reason `fund-deposit.ts`
 * gives: `poolOrdinal` is the ordinal of the coin THAT call received, and the
 * vault — which has no such field — is `coinsReceived - 1` afterwards. Either
 * way it is a receipt ordinal and never a position in the Zswap tree.
 */
export async function confirmPreparedDeposit(options: {
  nonce: string;
  txHash: string;
  target?: "fund" | "taxvault";
}): Promise<{ ordinal: number }> {
  const target = options.target ?? "fund";
  const network = EnvironmentManager.getNetworkConfig();
  setNetworkId(network.networkId);

  const record = getDeployment(network.networkId, target);
  if (!record) throw new Error(`No ${target} deployed on ${network.networkId}`);

  const receiving = await loadModule(target);
  const state = await readContractState(network.indexer, record.contractAddress);
  const ledger = state ? receiving.ledger(state) : null;
  if (!ledger) {
    throw new Error(
      `The ${target} has no readable state, so the coin's ordinal cannot be established. ` +
        `The deposit may still have landed — check \`npm run fund -- pool\`.`
    );
  }

  const ordinal = Number(ledger.poolOrdinal ?? BigInt(ledger.coinsReceived) - 1n);
  confirmDeposit(
    network.networkId,
    record.contractAddress,
    Uint8Array.from(Buffer.from(options.nonce.replace(/^0x/, ""), "hex")),
    { txHash: options.txHash, ordinal }
  );
  return { ordinal };
}

/** The receiving contract's state, or null. */
async function readContractState(indexer: string, address: string): Promise<any | null> {
  const query = `query C($address: HexEncoded!) {
    contractAction(address: $address) {
      __typename
      ... on ContractDeploy { state }
      ... on ContractCall { state }
      ... on ContractUpdate { state }
    }
  }`;
  const response = await fetch(indexer, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ query, variables: { address } }),
  });
  const body: any = await response.json();
  if (body.errors?.length) throw new Error(body.errors[0].message);
  const encoded = body.data?.contractAction?.state;
  if (!encoded) return null;
  const { ContractState } = await import("@midnight-ntwrk/compact-runtime");
  return ContractState.deserialize(Buffer.from(encoded, "hex")).data;
}

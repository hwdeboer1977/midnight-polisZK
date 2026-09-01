// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";
import { decodePayslip, fromHex, verifyPayslip, type Payslip } from "./payslip";

/**
 * Opening a payslip against the chain, with or without a wallet.
 *
 * Deliberately not gated on a connected wallet, and the reasoning is worth
 * keeping. A payslip is itself the credential: it holds the amounts and the
 * nonce, and nobody has one but the employee it was issued to. Requiring a
 * wallet before showing it protects nothing — it only puts an extension
 * install in front of the most common thing an employee wants, which is to read
 * what they were paid.
 *
 * The wallet still earns its place, for the two things a payslip cannot do. It
 * PROVES the slot belongs to the holder, by matching `payeeFor` — without it,
 * this can only report what the payslip claims and that the claim opens the
 * published commitment. And it is the only way to see a spendable balance,
 * since a shielded coin is visible to its holder's viewing key and to nothing
 * else, no login included.
 */
export interface CheckedPayslip {
  slip: Payslip;
  /** From the chain, for the slot this payslip names. */
  funded: boolean;
  paid: boolean;
  /**
   * Whether the slot is bound to the connected wallet's key.
   *
   * `null` when no wallet is connected — which is not the same as `false`, and
   * the page must not render it as though it were. Unknown means unchecked;
   * false means this payslip was issued to somebody else.
   */
  mine: boolean | null;
}

export async function checkPayslip(options: {
  networkId: string;
  /** Whatever the employee supplied: file contents, encoded blob, or a link. */
  text: string;
  /** The connected wallet's coin public key, if there is one. */
  coinPublicKey?: string | null;
}): Promise<CheckedPayslip> {
  const { networkId, text, coinPublicKey } = options;

  const slip = decodePayslip(text);
  const address = slip.contract.replace(/^0x/, "").toLowerCase();

  const state = await fetchContractState(networkId, address);
  if (!state) {
    throw new Error(
      `No contract at ${address.slice(0, 10)}… on ${networkId}. If your employer ` +
        "filed on a different network, switch to it and try again."
    );
  }

  const contract = await loadContract("payroll");
  const ledger = decodePayrollLedger(contract, state.data);
  if (!ledger) {
    throw new Error(
      "That address is not a payroll contract this page can read — it may have " +
        "been deployed from an older version."
    );
  }

  const period = BigInt(slip.period);
  const slot = BigInt(slip.slot);

  if (!ledger.commitmentsFor.member(period)) {
    throw new Error(`No payroll has been filed for ${slip.period} on that contract.`);
  }
  const commitments = ledger.commitmentsFor.lookup(period);
  if (!commitments.member(slot)) {
    throw new Error(`That period has no employee ${slip.slot + 1}.`);
  }

  const ok = verifyPayslip(
    (contract as unknown as { pureCircuits: Parameters<typeof verifyPayslip>[0] })
      .pureCircuits,
    slip,
    {
      // The key that FILED this period, not the one holding the seat now. Those
      // differ after a revoke or a key rotation, and reading the live seat made
      // every payslip from before either act fail here — with the message that
      // means the figures were altered.
      employer: ledger.employerFor.member(period)
        ? ledger.employerFor.lookup(period).bytes
        : ledger.employer.bytes,
      paramsHash: ledger.paramsHashFor.member(period)
        ? ledger.paramsHashFor.lookup(period)
        : new Uint8Array(32),
      commitment: bytesToHex(commitments.lookup(slot)),
    }
  );
  if (!ok) {
    throw new Error(
      "This payslip does not open the commitment your employer published for " +
        "that period. The figures do not match what was filed — which is exactly " +
        "what this check exists to catch."
    );
  }

  // Only meaningful once the figures are known good: a payslip that failed
  // above tells you nothing about whose slot it is.
  let mine: boolean | null = null;
  if (coinPublicKey) {
    const binding = (contract as unknown as {
      pureCircuits: {
        payeeHash: (
          key: { bytes: Uint8Array },
          period: bigint,
          instance: Uint8Array
        ) => Uint8Array;
      };
    }).pureCircuits.payeeHash(
      { bytes: fromHex(keyToHex(coinPublicKey)) },
      period,
      fromHex(address)
    );
    mine =
      ledger.payeeFor.member(period) && ledger.payeeFor.lookup(period).member(slot)
        ? bytesToHex(ledger.payeeFor.lookup(period).lookup(slot)) === bytesToHex(binding)
        : false;
  }

  return {
    slip,
    funded:
      ledger.fundedFor.member(period) && ledger.fundedFor.lookup(period).member(slot)
        ? ledger.fundedFor.lookup(period).lookup(slot)
        : false,
    paid:
      ledger.paidFor.member(period) && ledger.paidFor.lookup(period).member(slot)
        ? ledger.paidFor.lookup(period).lookup(slot)
        : false,
    mine,
  };
}

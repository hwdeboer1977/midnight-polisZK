// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { bytesToHex } from "./keys";
import { deriveEmployerKey, openSealed } from "./openings";
import { buildPayslip, verifyPayslip, type Payslip } from "./payslip";

/**
 * Rebuilds the payslips for a period that is already filed.
 *
 * They are not stored anywhere, and should not be: a payslip holds a salary in
 * clear, so a copy kept in `localStorage` would put the whole payroll at rest
 * in a browser. Nothing needs to be kept, because `setPayroll` already sealed
 * every opening into `sealedFor` under a key derived from the passphrase.
 * Recovering a payslip is therefore a decryption, not a re-run — no
 * transaction, no proof, and nothing that could disturb a period that has
 * already been paid.
 *
 * That last point is the reason this exists. Without it the only route back to
 * a payslip is to re-file the month, which replaces its commitments and marks
 * every employee unpaid — for a settled period that strands real payments
 * against openings that no longer match.
 *
 * Works for every period ever filed, including those filed before payslips
 * existed: the openings have been on chain the whole time.
 */
export interface Recovered {
  payslips: Payslip[];
  /**
   * Slots whose blob is all zeroes — filed before sealing existed, so there is
   * nothing to open. Reported rather than skipped silently: an employer with a
   * short list needs to know which employee they cannot hand a payslip to.
   */
  unsealed: number[];
}

/** An opening that was never written. */
function isSealed(sealed: Uint8Array): boolean {
  return sealed.length === 100 && sealed.some((byte) => byte !== 0);
}

export async function recoverPayslips(options: {
  networkId: string;
  contractAddress: string;
  period: number;
  passphrase: string;
  /** Employee names in slot order, if the employer still has the roster. */
  names?: string[];
}): Promise<Recovered> {
  const { networkId, contractAddress, period, passphrase, names } = options;

  const state = await fetchContractState(networkId, contractAddress);
  if (!state) throw new Error("No contract state on chain");

  const contract = await loadContract("payroll");
  const ledger = decodePayrollLedger(contract, state.data);
  if (!ledger) throw new Error("That contract's state cannot be read by this build");

  const p = BigInt(period);
  if (!ledger.commitmentsFor.member(p)) {
    throw new Error(`Nothing has been filed for ${period}`);
  }

  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  const count = ledger.employeeCountFor.member(p)
    ? Number(ledger.employeeCountFor.lookup(p))
    : 0;

  const payslips: Payslip[] = [];
  const unsealed: number[] = [];

  for (let slot = 0; slot < count; slot += 1) {
    const key = BigInt(slot);
    if (!ledger.sealedFor.member(p) || !ledger.sealedFor.lookup(p).member(key)) {
      unsealed.push(slot);
      continue;
    }
    const sealed = ledger.sealedFor.lookup(p).lookup(key);
    if (!isSealed(sealed)) {
      unsealed.push(slot);
      continue;
    }

    let line;
    try {
      line = await openSealed(employerKey, sealed);
    } catch {
      // AES-GCM authenticates, so a wrong passphrase fails here rather than
      // returning plausible nonsense. Thrown for the period rather than the
      // slot: one bad decryption means the key is wrong, not that one employee
      // is odd.
      throw new Error(
        "That passphrase does not open this period's openings. It is the one " +
          "you used when the month was filed — a later change of passphrase " +
          "does not re-seal an earlier month."
      );
    }

    const slip = buildPayslip({
      contractAddress,
      period,
      slot,
      employee: names?.[slot],
      line,
      nonce: line.nonce,
    });

    // Checked before it is offered. A payslip that did not open its own
    // commitment would be handed to an employee who would then be told, on the
    // Employee page, that their employer had published something else.
    const ok = verifyPayslip(
      (contract as unknown as { pureCircuits: Parameters<typeof verifyPayslip>[0] })
        .pureCircuits,
      slip,
      {
        employer: ledger.employer.bytes,
        paramsHash: ledger.paramsHashFor.member(p)
          ? ledger.paramsHashFor.lookup(p)
          : new Uint8Array(32),
        commitment: bytesToHex(ledger.commitmentsFor.lookup(p).lookup(key)),
      }
    );
    if (!ok) {
      throw new Error(
        `The opening recovered for employee ${slot + 1} does not match the ` +
          "commitment on chain. This period may have been re-filed since that " +
          "opening was sealed."
      );
    }

    payslips.push(slip);
  }

  return { payslips, unsealed };
}

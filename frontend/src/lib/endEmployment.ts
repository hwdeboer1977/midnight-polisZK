// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";
import { deriveEmployerKey, deriveTerminationNonce } from "./openings";
import { connectContract, type ProvingMode } from "./submitPayroll";
import { fromHex } from "./payslip";

/**
 * Ending an employee's employment, from the employer's own browser.
 *
 * Not a convenience over the CLI — for most instances it is the only route.
 * `endEmployment` asserts `ownPublicKey() == employer`, and an employer's key
 * lives in their browser wallet. The CLI signs with whatever is in `.env`,
 * which is the platform's wallet, so it can only end employment on an instance
 * where the platform happens to be the employer too.
 *
 * What reaches the chain is a commitment. Months worked published per slot
 * would be a tenure record for a worker, and a claim-key hash published per
 * slot would be a stable handle appearing identically at every employer that
 * person uses it with — rebuilding the cross-employer linkage `payeeFor` gives
 * up convenience to prevent. The opening is handed over as a file instead.
 */

export interface TerminationOpening {
  /** The deployment's name. Kept for readability; `contractAddress` is what resolves. */
  instance: string;
  /**
   * The contract this termination is on, hex, 32 bytes.
   *
   * Written because the name alone was not enough. The relay resolved openings
   * as `payroll:<instance>`, which is how per-company deployments are keyed —
   * but onboarding assigns the single `payroll` deployment now, so an employer's
   * page reports `payroll` and the relay looked for `payroll:payroll` and
   * skipped every opening as "not deployed on this network". An address cannot
   * drift with a naming convention, and it is what the claim leaf binds to.
   */
  contractAddress: string;
  slot: number;
  finalPeriod: number;
  monthsWorked: number;
  nonce: string;
}

export interface TerminationResult {
  txHash: string;
  opening: TerminationOpening;
  /** Which periods on this contract named that employee. */
  matched: number[];
}

export interface EndEmploymentProgress {
  (step: string): void;
}

/**
 * Finds an employee's slot in a period, and counts every month they appear.
 *
 * The employer can do this and nobody else can: `payeeFor` publishes only
 * `hash(payee ‖ period ‖ instance)`, so recomputing it needs the coin public
 * key, which lives in the employer's roster. Counting here rather than asking
 * the employer to type a number means the attestation carries what the chain
 * says, not what someone remembered — and it stays checkable afterwards by
 * anyone who is given the same key.
 */
export async function surveyEmployment(options: {
  networkId: string;
  contractAddress: string;
  /** The employee's coin public key, hex or Bech32m. */
  payee: string;
  period: number;
  /**
   * Whether an existing termination is an error.
   *
   * ⚠️ It always was, and that broke the rebuild. This refuses a period whose
   * slot is already in `terminationFor`, which is right for ENDING employment —
   * the attestation is write-once and a second attempt is a mistake worth
   * naming — and exactly backwards for REBUILDING the opening of one, which by
   * definition only happens once a termination exists.
   *
   * So the check is the caller's to ask for. `endEmployment` wants it;
   * `rebuildTerminationOpening` passes false and reads the same slot and month
   * count from the same place.
   */
  allowEnded?: boolean;
}): Promise<{ slot: number; monthsWorked: number; matched: number[] }> {
  const { networkId, contractAddress, period } = options;

  const state = await fetchContractState(networkId, contractAddress);
  if (!state) throw new Error("No contract state on chain");

  const contract = await loadContract("payroll");
  const ledger = decodePayrollLedger(contract, state.data);
  if (!ledger) throw new Error("That contract's state cannot be read by this build");

  const circuits = (contract as unknown as {
    pureCircuits: {
      payeeHash: (
        key: { bytes: Uint8Array },
        period: bigint,
        instance: Uint8Array
      ) => Uint8Array;
    };
  }).pureCircuits;

  const payeeBytes = fromHex(keyToHex(options.payee));
  const instanceBytes = fromHex(contractAddress.replace(/^0x/, ""));
  const bindingFor = (p: bigint) =>
    bytesToHex(circuits.payeeHash({ bytes: payeeBytes }, p, instanceBytes));

  let slot = -1;
  const matched: number[] = [];

  for (const filed of [...(ledger.periods as Iterable<bigint>)]) {
    if (!ledger.payeeFor.member(filed)) continue;
    const binding = bindingFor(filed);
    for (const [index, published] of ledger.payeeFor.lookup(filed)) {
      if (bytesToHex(published) !== binding) continue;
      matched.push(Number(filed));
      if (Number(filed) === period) slot = Number(index);
      break;
    }
  }

  matched.sort((a, b) => a - b);

  if (slot < 0) {
    throw new Error(
      `No employee in ${period} on this contract matches that coin public key. ` +
        "A wrong key produces a different hash and matches nothing — check it " +
        "against the roster."
    );
  }
  if (!options.allowEnded && ledger.terminationFor?.member(BigInt(period))) {
    const ended = ledger.terminationFor.lookup(BigInt(period));
    if (ended.member(BigInt(slot))) {
      throw new Error(
        "Employment has already been ended for that employee in that period. " +
          "A termination is written once: an employer who could restate it could " +
          "revise the final month after seeing what it entitled someone to."
      );
    }
  }

  return { slot, monthsWorked: matched.length, matched };
}

export async function endEmployment(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  instance: string;
  period: number;
  slot: number;
  monthsWorked: number;
  passphrase: string;
  provingMode?: ProvingMode;
  onProgress?: EndEmploymentProgress;
}): Promise<TerminationResult> {
  const {
    api,
    networkId,
    contractAddress,
    instance,
    period,
    slot,
    monthsWorked,
    passphrase,
    provingMode = "local",
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  onProgress("Deriving this attestation's nonce (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);
  const nonce = await deriveTerminationNonce(employerKey, period, slot);

  const { deployed, contractModule } = await connectContract({
    api,
    networkId,
    contractAddress,
    contractName: "payroll",
    provingMode,
    onProgress,
  });

  // Hashed by the contract's own pure circuit, so the value the relay later
  // checks an opening against is the one this contract produced — not a
  // TypeScript re-implementation that could drift from Compact's encoding.
  const attestation = (contractModule as any).pureCircuits.terminationCommitment(
    BigInt(period),
    BigInt(monthsWorked),
    nonce
  );

  onProgress("Proving the attestation — this takes a few minutes…");
  const tx = await deployed.callTx.endEmployment(
    BigInt(period),
    BigInt(slot),
    attestation
  );

  return {
    txHash: tx.public?.txHash ?? "",
    matched: [],
    opening: {
      instance,
      contractAddress: contractAddress.replace(/^0x/, "").toLowerCase(),
      slot,
      finalPeriod: period,
      monthsWorked,
      nonce: bytesToHex(nonce),
    },
  };
}

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";
import { fromHex, type Payslip } from "./payslip";
import { connectContract, toCircuitTaxParams, type ProvingMode } from "./submitPayroll";
import { benefitFor, paramsForVersion, toCircuitParams } from "../generated/benefit-params";
import { DUTCH_V1, computeLine } from "../generated/tax-params";

/**
 * Claiming a benefit, from the claimant's own browser.
 *
 * It has to be her browser. `claim` asserts that the leaf's `payeeBinding`
 * reproduces from `ownPublicKey()`, so the transaction must be signed by the
 * wallet payroll filed as payee — not by the fund, not by a relay, not by an
 * agency acting for her. That assertion is what stops an employer collecting on
 * their own leavers, so it cannot be relaxed for convenience.
 *
 * She needs three things she cannot produce alone, and one only she has:
 *
 *   - the CLAIM BUNDLE from the relay: her leaf, its path, the fund's address,
 *     the rule-set version, and a pool coin. The path proves membership of a
 *     tree over everyone terminated that month, which is what makes claiming
 *     safe to do — and she cannot build it, because she holds nobody else's
 *     leaf;
 *   - her PAYSLIP from the employer: the figures that open the commitment. The
 *     nonce in it is derived from the employer's passphrase, so there is no
 *     other route to it;
 *   - her CLAIM KEY, the one input nobody else can supply. It arrives here as
 *     32 bytes; where those bytes came from is the caller's problem, which is
 *     what lets a file and the legacy passphrase share one code path.
 *
 * Everything else is read from the chain here rather than trusted from a file.
 */

export interface ClaimBundle {
  period: number;
  instance: string;
  slot: number;
  root: string;
  leaf: {
    commitment: string;
    payeeBinding: string;
    finalPeriod: number;
    monthsWorked: number;
    instance: string;
  };
  leafDigest: string;
  path: { sibling: string; goesLeft: boolean }[];
  fund: string | null;
  paramsVersion: number | null;
  poolCoin: { nonce: string; color: string; value: string; mtIndex: number } | null;
}

export interface ClaimResult {
  txHash: string;
  /** Minor units, before withholding. */
  grossBenefitMinor: bigint;
  taxMinor: bigint;
  socialMinor: bigint;
  /** Minor units. What actually reached her wallet. */
  benefitMinor: bigint;
  /** The window this claim consumed. A second claim in it is refused on chain. */
  window: number;
}

export type ClaimProgress = (line: string) => void;

/** Parses a relay bundle, rejecting one that predates the fields a claim needs. */
export function parseBundle(text: string): ClaimBundle {
  const bundle = JSON.parse(text) as ClaimBundle;
  if (!bundle?.leaf || !Array.isArray(bundle.path)) {
    // The near-miss worth naming: the employer's termination opening is the
    // same person, the same period, and an almost identical filename, but it
    // travels employer → relay and carries no path.
    const opening = bundle as unknown as { nonce?: string; finalPeriod?: number };
    if (opening?.nonce && opening?.finalPeriod) {
      throw new Error(
        "That is the termination opening your employer downloaded, which goes to " +
          "the fund's relay. The claim bundle is what the relay gives back — look " +
          "for a file named claim-bundle-…"
      );
    }
    throw new Error("That file is not a claim bundle — it has no leaf and path.");
  }
  if (!bundle.fund || bundle.paramsVersion === null || !bundle.poolCoin) {
    throw new Error(
      "That bundle was written before the relay carried the fund address, rule-set " +
        "version and pool coin. Re-run the relay for this period to get a current one."
    );
  }
  return bundle;
}

export async function submitClaim(options: {
  api: ConnectedAPI;
  networkId: string;
  bundle: ClaimBundle;
  payslip: Payslip;
  /** The connected wallet's coin public key, Bech32m or hex. */
  coinPublicKey: string;
  /**
   * The benefit window being claimed for. One claim per window per WALLET: the
   * nullifier is `hash(ownPublicKey, window, fund)` and the fund keeps the
   * spent set, so re-claiming a window is refused on chain rather than merely
   * discouraged. `claim` also asserts `window < durationMonths`, so the number
   * of windows is the published rule set's answer and not the caller's.
   */
  window: number;
  provingMode?: ProvingMode;
  onProgress?: ClaimProgress;
}): Promise<ClaimResult> {
  const { api, networkId, bundle, payslip, window, coinPublicKey } = options;
  const onProgress = options.onProgress ?? (() => {});

  const leaf = bundle.leaf;
  const payrollAddress = leaf.instance;

  // Every check below exists to fail here, with a sentence, rather than inside
  // a circuit after two minutes of proving with "assertion failed".
  if (payslip.contract.replace(/^0x/, "").toLowerCase() !== payrollAddress.toLowerCase()) {
    // Names both, because the usual cause is a REDEPLOY rather than a wrong
    // file: an employer's contract changes address and every payslip issued by
    // the previous one keeps naming it. The figures are still true; the
    // commitment they open lives somewhere else now. Saying only "a different
    // contract" sends someone hunting through their downloads for a file that
    // does not exist yet.
    const short = (v: string) => `${v.slice(0, 8)}…${v.slice(-6)}`;
    throw new Error(
      `That payslip was issued by payroll ${short(payslip.contract.replace(/^0x/, ""))}, ` +
        `but your termination is on ${short(payrollAddress)}. If your employer ` +
        "redeployed, ask them for a fresh payslip for that month — they can " +
        "regenerate it from the chain with their payroll passphrase."
    );
  }
  if (payslip.period !== leaf.finalPeriod) {
    throw new Error(
      `The bundle claims against ${leaf.finalPeriod}, but that payslip is for ${payslip.period}. ` +
        "The final period is named by your employer and cannot be swapped."
    );
  }
  if (payslip.slot !== bundle.slot) {
    throw new Error("That payslip is for a different employee than the bundle.");
  }

  onProgress("Reading the payroll contract…");
  const payrollContract = await loadContract("payroll");
  const chainState = await fetchContractState(networkId, payrollAddress);
  if (!chainState) throw new Error("That payroll contract has no state on chain.");
  const ledger = decodePayrollLedger(payrollContract, chainState.data);
  if (!ledger) throw new Error("That payroll contract's state could not be decoded.");

  const period = BigInt(leaf.finalPeriod);
  if (!ledger.paramsHashFor.member(period)) {
    throw new Error(`No tax rule set is recorded for ${leaf.finalPeriod} on that contract.`);
  }
  const paramsHash = ledger.paramsHashFor.lookup(period);
  const employerBytes = ledger.employer.bytes;

  const circuits = (payrollContract as any).pureCircuits;

  // This bundle is hers. `claim` checks the same thing against ownPublicKey(),
  // so a mismatch here is a claim that would be refused after proving.
  const payeeBinding = bytesToHex(
    circuits.payeeHash({ bytes: fromHex(keyToHex(coinPublicKey)) }, period, fromHex(payrollAddress))
  );
  if (payeeBinding !== leaf.payeeBinding.toLowerCase()) {
    throw new Error(
      "This bundle was not filed for the connected wallet. Connect the wallet your " +
        "employer used for you, or ask them which key they filed."
    );
  }

  // The figures open the commitment. Checked before proving because a payslip
  // edited by one cent produces a hash that matches nothing, and the circuit
  // would say only that an assertion failed.
  const gross = BigInt(payslip.gross);
  const commitment = bytesToHex(
    circuits.commitmentFor(
      gross,
      BigInt(payslip.tax),
      BigInt(payslip.social),
      BigInt(payslip.net),
      BigInt(payslip.weeks),
      period,
      { bytes: employerBytes },
      paramsHash,
      fromHex(payslip.nonce)
    )
  );
  if (commitment !== leaf.commitment.toLowerCase()) {
    throw new Error(
      "Those payslip figures do not open the commitment your employer published " +
        "for that month. Check you are using the payslip for this period."
    );
  }


  const params = paramsForVersion(bundle.paramsVersion!);
  const benefit = benefitFor(gross, params);

  // The benefit is taxable income, withheld under the SAME schedule her final
  // month was filed under — the circuit pins that by hashing what we pass here
  // against the `paramsHash` bound into her salary commitment. Checked off
  // circuit first so a schedule mismatch names itself.
  const fundContract = (await loadContract("fund")) as any;
  const schedule = fundContract.pureCircuits.taxParamsHash(toCircuitTaxParams(DUTCH_V1));
  if (bytesToHex(schedule) !== bytesToHex(paramsHash)) {
    throw new Error(
      "The tax rules in this build are not the ones that period was filed under. " +
        "Someone has edited tax-params.ts, or this payroll was filed under another version."
    );
  }
  const withheld = computeLine(benefit.quotient, DUTCH_V1);
  if (withheld.netMinor <= 0n) {
    throw new Error("Withholding leaves nothing of the benefit.");
  }

  const coin = bundle.poolCoin!;
  if (BigInt(coin.value) < withheld.netMinor) {
    throw new Error(
      `The fund coin in this bundle holds less than the benefit due. The fund needs a ` +
        `larger deposit before this claim can be paid.`
    );
  }

  onProgress("Connecting to the fund…");
  const { deployed } = await connectContract({
    api,
    networkId,
    contractAddress: bundle.fund!,
    contractName: "fund",
    provingMode: options.provingMode ?? "local",
    onProgress,
  });

  onProgress("Proving the claim — this takes a few minutes…");
  // The one failure that cannot be pre-checked here. `claim` refuses a window
  // whose nullifier is already spent, and that nullifier is derived from the
  // claimant's secret claim key — so the check needs the key, which means it
  // can only happen inside the circuit. Everything else this function verifies
  // up front; this one is translated on the way out instead.
  let tx: any;
  try {
    tx = await deployed.callTx.claim(
    {
      leaf: fromHex(bundle.leafDigest),
      path: bundle.path.map((entry) => ({
        sibling: { field: BigInt(entry.sibling) },
        goes_left: entry.goesLeft,
      })),
    },
    {
      commitment: fromHex(leaf.commitment),
      payeeBinding: fromHex(leaf.payeeBinding),
      finalPeriod: BigInt(leaf.finalPeriod),
      monthsWorked: BigInt(leaf.monthsWorked),
      instance: fromHex(leaf.instance),
    },
    gross,
    BigInt(payslip.tax),
    BigInt(payslip.social),
    BigInt(payslip.net),
    BigInt(payslip.weeks),
    { bytes: employerBytes },
    paramsHash,
    fromHex(payslip.nonce),
    BigInt(window),
    toCircuitParams(params),
    toCircuitTaxParams(DUTCH_V1),
    benefit.quotient,
    withheld.taxMinor,
    withheld.contribMinor,
    {
      nonce: fromHex(coin.nonce),
      color: fromHex(coin.color),
      value: BigInt(coin.value),
      mt_index: BigInt(coin.mtIndex),
    }
    );
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    if (/already claimed/i.test(message)) {
      throw new Error(
        `You have already claimed for ${window}. Each period can be claimed once — ` +
          "the fund keeps a set of spent nullifiers and refuses a repeat. Nothing " +
          "in that set identifies you; it is the image of your claim key, not the key."
      );
    }
    throw cause;
  }

  return {
    txHash: String(tx?.public?.txHash ?? ""),
    grossBenefitMinor: benefit.quotient,
    taxMinor: withheld.taxMinor,
    socialMinor: withheld.contribMinor,
    benefitMinor: withheld.netMinor,
    window,
  };
}

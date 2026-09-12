// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";
import { fromHex, type Payslip } from "./payslip";
import { connectContract, toCircuitTaxParams, type ProvingMode } from "./submitPayroll";
import {
  benefitFor,
  claimCalendar,
  entitlementPeriods,
  monthStartSeconds,
  recordedParams,
  toCircuitParams,
} from "../generated/benefit-params";
import { DUTCH_V1, computeLine } from "../generated/tax-params";
import { periodName } from "../generated/roster";

/**
 * Claiming one month's benefit, from the claimant's own browser.
 *
 * It has to be her browser. `claim` asserts that the leaf's `payeeBinding`
 * reproduces from `ownPublicKey()`, so the transaction must be signed by the
 * wallet payroll filed as payee — not by the fund, not by a relay, not by an
 * agency acting for her. That assertion is what stops an employer collecting on
 * their own leavers, so it cannot be relaxed for convenience.
 *
 * She needs two things she cannot produce alone:
 *
 *   - the CLAIM BUNDLE: her leaf, its path, the fund's address and a pool coin.
 *     The path proves membership of a tree over everyone terminated that
 *     month, which is what makes claiming safe to do. `assembleClaim` builds it
 *     from the chain and her wallet; only the coin comes from the service;
 *   - her PAYSLIP from the employer: the figures that open the commitment. The
 *     nonce in it is derived from the employer's passphrase, so there is no
 *     other route to it.
 *
 * Everything else is read from the chain here rather than trusted from a file
 * — including which benefit rules apply, since the platform pins them to her
 * final period on the fund.
 *
 * One claim pays three shielded coins: the net to her, the withheld tax and
 * contribution to the two treasuries. The treasuries' coins are encrypted to
 * their ENCRYPTION keys, which the `callTx` shorthand cannot carry — so this
 * goes through `submitCallTx`, as `payPeriod` and `remit` do.
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
  /**
   * Advisory only. The rules a claim is computed under are the ones the
   * platform recorded for the final period, read from the fund at claim time.
   */
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
  /** The calendar month this claim paid, YYYYMM. A second claim for it is refused on chain. */
  month: number;
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
  if (!bundle.fund || !bundle.poolCoin) {
    throw new Error(
      "That bundle was written before the relay carried the fund address and " +
        "pool coin. Re-run the relay for this period to get a current one."
    );
  }
  return bundle;
}

/** The treasuries' encryption public keys, from the build. */
function treasuryEncryptionKeys(): { tax: string; social: string } {
  const tax = String(import.meta.env.VITE_TAX_TREASURY_ENC_KEY ?? "").trim();
  const social = String(import.meta.env.VITE_SOCIAL_TREASURY_ENC_KEY ?? "").trim();
  if (!tax || !social) {
    throw new Error(
      "This build has no treasury encryption keys configured, so the withheld tax " +
        "and contribution would be sent where the treasuries could never find them. " +
        "Set VITE_TAX_TREASURY_ENC_KEY and VITE_SOCIAL_TREASURY_ENC_KEY and rebuild."
    );
  }
  return { tax, social };
}

export async function submitClaim(options: {
  api: ConnectedAPI;
  networkId: string;
  bundle: ClaimBundle;
  payslip: Payslip;
  /** The connected wallet's coin public key, Bech32m or hex. */
  coinPublicKey: string;
  /**
   * The calendar month being claimed, YYYYMM.
   *
   * One claim per month per WALLET: the nullifier is
   * `hash(ownPublicKey, month, fund)`. `claim` also asserts the month is one of
   * the `durationMonths` after the final period and has already begun, so which
   * months exist is the recorded rule set's answer and not the caller's.
   */
  month: number;
  provingMode?: ProvingMode;
  onProgress?: ClaimProgress;
}): Promise<ClaimResult> {
  const { api, networkId, bundle, payslip, month, coinPublicKey } = options;
  const onProgress = options.onProgress ?? (() => {});

  const leaf = bundle.leaf;
  const payrollAddress = leaf.instance;
  const fundAddress = bundle.fund;
  if (!fundAddress || !bundle.poolCoin) {
    throw new Error("This claim has no fund address or fund coin — the service could not supply one.");
  }

  // Every check below exists to fail here, with a sentence, rather than inside
  // a circuit after minutes of proving with "assertion failed".
  if (payslip.contract.replace(/^0x/, "").toLowerCase() !== payrollAddress.toLowerCase()) {
    // Names both, because the usual cause is a REDEPLOY rather than a wrong
    // file: an employer's contract changes address and every payslip issued by
    // the previous one keeps naming it.
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
  // The key that FILED the period, which is what the commitment binds — not the
  // current seat holder, which a revoke or a key rotation moves.
  const employerBytes = ledger.employerFor?.member(period)
    ? ledger.employerFor.lookup(period).bytes
    : ledger.employer.bytes;

  const circuits = (payrollContract as any).pureCircuits;
  const myKey = fromHex(keyToHex(coinPublicKey));

  // This bundle is hers. `claim` checks the same thing against ownPublicKey(),
  // so a mismatch here is a claim that would be refused after proving.
  const payeeBinding = bytesToHex(circuits.payeeHash({ bytes: myKey }, period, fromHex(payrollAddress)));
  if (payeeBinding !== leaf.payeeBinding.toLowerCase()) {
    throw new Error(
      "This bundle was not filed for the connected wallet. Connect the wallet your " +
        "employer used for you, or ask them which key they filed."
    );
  }

  // The figures open the commitment. Checked before proving because a payslip
  // edited by one cent produces a hash that matches nothing.
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

  onProgress("Reading the fund…");
  const fundContract = (await loadContract("fund")) as any;
  const fundState = await fetchContractState(networkId, fundAddress);
  if (!fundState) throw new Error("The fund contract has no state on chain.");
  let fundLedger: any;
  try {
    fundLedger = fundContract.ledger(fundState.data);
    void fundLedger.paramsHashFor.size();
    void fundLedger.benefitToken;
  } catch {
    throw new Error("The fund's state could not be read with this build of the contract.");
  }

  // The rules the platform recorded for her final period — `claim` refuses any
  // other published version, so a more generous one is not hers to choose.
  if (!fundLedger.paramsHashFor.member(period)) {
    throw new Error(
      `No benefit rules are recorded on the fund for ${periodName(leaf.finalPeriod)} yet. ` +
        "The platform records them per month, and no claim can be made before it has."
    );
  }
  const params = recordedParams(fundLedger.paramsHashFor.lookup(period), (p) =>
    fundContract.pureCircuits.benefitParamsHash(p)
  );
  if (!params) {
    throw new Error(
      `The fund has benefit rules recorded for ${periodName(leaf.finalPeriod)} that this ` +
        "build does not know the figures of. It needs updating before this claim can be built."
    );
  }

  // The month: one of the entitlement months, and already begun.
  const months = entitlementPeriods(leaf.finalPeriod, params.durationMonths);
  if (!months.includes(month)) {
    throw new Error(
      `${periodName(month)} is not one of the months your termination entitles you to ` +
        `(${months.map(periodName).join(", ")}).`
    );
  }
  if (Date.now() / 1000 < monthStartSeconds(month)) {
    throw new Error(
      `${periodName(month)} has not started yet. The fund refuses a month before its first day (UTC).`
    );
  }
  const nullifier = fundContract.pureCircuits.claimNullifier(
    { bytes: myKey },
    BigInt(month),
    fromHex(fundAddress.replace(/^0x/, ""))
  );
  if (fundLedger.spent.member(nullifier)) {
    throw new Error(`You have already claimed for ${periodName(month)}.`);
  }

  const benefit = benefitFor(gross, params);

  // The benefit is taxable income, withheld under the SAME schedule her final
  // month was filed under — the circuit pins that by hashing what we pass here
  // against the `paramsHash` bound into her salary commitment.
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

  const coin = bundle.poolCoin;
  if (bytesToHex(fromHex(coin.color)) !== bytesToHex(fundLedger.benefitToken)) {
    throw new Error("The fund coin in this bundle is not in the token this fund pays in.");
  }
  // MORE than the whole benefit: the net and both withholdings leave in this one
  // claim, and the circuit insists on change after the last of them.
  if (BigInt(coin.value) <= benefit.quotient) {
    throw new Error(
      "The fund coin in this bundle does not hold more than the benefit due, " +
        "withholding included. The fund needs a larger deposit before this claim can be paid."
    );
  }

  const encryption = treasuryEncryptionKeys();
  const taxTreasury = bytesToHex(fundLedger.taxTreasury.bytes).toLowerCase();
  const socialTreasury = bytesToHex(fundLedger.socialTreasury.bytes).toLowerCase();

  onProgress("Connecting to the fund…");
  const { providers, compiledContract } = await connectContract({
    api,
    networkId,
    contractAddress: fundAddress,
    contractName: "fund",
    provingMode: options.provingMode ?? "local",
    onProgress,
  });

  onProgress("Proving the claim — this takes a few minutes…");
  let tx: any;
  try {
    tx = await submitCallTx(providers as any, {
      compiledContract,
      contractAddress: fundAddress,
      circuitId: "claim",
      args: [
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
        claimCalendar(leaf.finalPeriod, month),
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
        },
      ],
      additionalCoinEncPublicKeyMappings: new Map([
        [taxTreasury, encryption.tax],
        [socialTreasury, encryption.social],
      ]),
    } as any);
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : String(cause);
    // Checked above, but a claim landing for the same month in between is still
    // possible — translated rather than surfaced as an assertion.
    if (/already claimed/i.test(message)) {
      throw new Error(`You have already claimed for ${periodName(month)}.`);
    }
    if (/has not started yet/i.test(message)) {
      throw new Error(
        `${periodName(month)} has not started yet by the chain's clock. Try again once it has.`
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
    month,
  };
}

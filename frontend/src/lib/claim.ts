import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { fetchContractState } from "./chain";
import { deriveClaimKey } from "./claimKey";
import { decodePayrollLedger, loadContract } from "./contracts";
import { bytesToHex, keyToHex } from "./keys";
import { fromHex, type Payslip } from "./payslip";
import { connectContract, type ProvingMode } from "./submitPayroll";
import { benefitFor, paramsForVersion, toCircuitParams } from "../generated/benefit-params";

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
 *   - her PASSPHRASE, which is the one input nobody else can supply.
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
    claimKeyHash: string;
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
  /** Minor units. What the fund paid, and the figure the nullifier now covers. */
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
    const opening = bundle as unknown as { claimKeyHash?: string; finalPeriod?: number };
    if (opening?.claimKeyHash && opening?.finalPeriod) {
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
  passphrase: string;
  /** The connected wallet's coin public key, Bech32m or hex. */
  coinPublicKey: string;
  /**
   * The benefit window being claimed for, YYYYMM. One claim per window per
   * claim key: the nullifier is `hash(claimKey, window, fund)` and the fund
   * keeps the spent set, so re-claiming a window is refused on chain rather
   * than merely discouraged.
   */
  window: number;
  provingMode?: ProvingMode;
  onProgress?: ClaimProgress;
}): Promise<ClaimResult> {
  const { api, networkId, bundle, payslip, passphrase, window, coinPublicKey } = options;
  const onProgress = options.onProgress ?? (() => {});

  const leaf = bundle.leaf;
  const payrollAddress = leaf.instance;

  // Every check below exists to fail here, with a sentence, rather than inside
  // a circuit after two minutes of proving with "assertion failed".
  if (payslip.contract.replace(/^0x/, "").toLowerCase() !== payrollAddress.toLowerCase()) {
    throw new Error("That payslip is from a different payroll contract than the bundle.");
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

  onProgress("Deriving your claim key…");
  const claimKey = await deriveClaimKey(passphrase, coinPublicKey);
  const fundContract = (await loadContract("fund")) as any;
  const derivedAnchor = bytesToHex(fundContract.pureCircuits.claimKeyHash(claimKey));
  if (derivedAnchor !== leaf.claimKeyHash.toLowerCase()) {
    // The single most likely failure in the whole flow, and the one worth
    // naming precisely: the anchor is write-once, so it is either the wrong
    // passphrase or a hash derived under a different wallet.
    throw new Error(
      "That passphrase does not produce the claim key your employer anchored. It " +
        "must be the same passphrase, derived with this same wallet connected — " +
        "the anchor was written once and cannot be changed."
    );
  }

  const params = paramsForVersion(bundle.paramsVersion!);
  const benefit = benefitFor(gross, params);
  const coin = bundle.poolCoin!;
  if (BigInt(coin.value) < benefit.quotient) {
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
  const tx = await deployed.callTx.claim(
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
      claimKeyHash: fromHex(leaf.claimKeyHash),
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
    claimKey,
    BigInt(window),
    toCircuitParams(params),
    benefit.quotient,
    {
      nonce: fromHex(coin.nonce),
      color: fromHex(coin.color),
      value: BigInt(coin.value),
      mt_index: BigInt(coin.mtIndex),
    }
  );

  return {
    txHash: String(tx?.public?.txHash ?? ""),
    benefitMinor: benefit.quotient,
    window,
  };
}

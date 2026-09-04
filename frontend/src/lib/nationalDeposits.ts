// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { loadContract } from "./contracts";
import { forNetwork, loadDeployments } from "./deployments";
import { bytesToHex } from "./keys";

/**
 * How much of a period's withholding has reached the national contracts.
 *
 * The employer's month has two hops, and only the first is visible on the
 * payroll contract. `remitTax` and `remitSocial` empty the pools into the two
 * treasury WALLETS, at which point the payroll contract's own state says the
 * month is settled — and it is, as far as that contract is concerned. Whether
 * the money then reached the benefit fund and the tax vault is recorded on
 * THOSE contracts, under the period it covers, and nowhere else.
 *
 * So the last step of the month cannot be answered by the contract the rest of
 * the month is answered by. This asks the other two.
 *
 * `null` is not zero. A contract that is not deployed on this network, or whose
 * state could not be read, must not render as "nothing has arrived" — that is
 * the same shape as a deposit that never happened, and the step above would
 * then tell an employer to redo work that may already be done.
 */
export interface NationalDeposits {
  /** Contributions recorded by `fund.contributedFor[period]`, in minor units. */
  contributionsMinor: bigint | null;
  /** Wage tax recorded by `taxvault.receivedFor[period]`, in minor units. */
  taxMinor: bigint | null;
  fundAddress: string | null;
  taxvaultAddress: string | null;
}

const EMPTY: NationalDeposits = {
  contributionsMinor: null,
  taxMinor: null,
  fundAddress: null,
  taxvaultAddress: null,
};

/**
 * Reads one period's arrivals at both contracts.
 *
 * Each side is read and decoded independently: a fund deployed from an older
 * contract shape must not take the tax figure down with it, because the two
 * deposits are separate transactions and either can be outstanding alone.
 */
export async function readNationalDeposits(
  networkId: string,
  period: number
): Promise<NationalDeposits> {
  const here = forNetwork(await loadDeployments(), networkId);
  const fund = here.find(([, d]) => d.contractName === "fund")?.[1] ?? null;
  const taxvault = here.find(([, d]) => d.contractName === "taxvault")?.[1] ?? null;
  if (!fund && !taxvault) return EMPTY;

  const key = BigInt(period);
  const lookup = async (
    contractName: "fund" | "taxvault",
    address: string,
    field: "contributedFor" | "receivedFor"
  ): Promise<bigint | null> => {
    try {
      const contract = await loadContract(contractName);
      const state = await fetchContractState(networkId, address);
      if (!state) return null;
      const ledger = contract.ledger(state.data) as Record<
        string,
        { member(k: bigint): boolean; lookup(k: bigint): bigint }
      >;
      const map = ledger[field];
      if (!map) return null;
      return map.member(key) ? map.lookup(key) : 0n;
    } catch {
      // An instance predating this build, or an indexer that did not answer.
      // Unknown, which is what `null` says — see the note on the interface.
      return null;
    }
  };

  const [contributionsMinor, taxMinor] = await Promise.all([
    fund ? lookup("fund", fund.contractAddress, "contributedFor") : Promise.resolve(null),
    taxvault
      ? lookup("taxvault", taxvault.contractAddress, "receivedFor")
      : Promise.resolve(null),
  ]);

  return {
    contributionsMinor,
    taxMinor,
    fundAddress: fund?.contractAddress ?? null,
    taxvaultAddress: taxvault?.contractAddress ?? null,
  };
}

/**
 * What each national contract holds and has ever held, across all periods.
 *
 * The lifetime view beside `readNationalDeposits`'s per-period one. An operator
 * about to spend a treasury wants both: whether October landed, and whether the
 * contract's running total matches what has been sent it.
 *
 * ⚠️ **The fund has no balance here, and that is not an omission.** What it
 * holds is a shielded coin, so nothing on chain publishes it — the fund is
 * deliberately not publicly solvent, and it cannot be made so without also
 * revealing what each claimant received, since successive balances give away
 * the differences between them. `contributedTotal` is money IN and must never
 * be rendered as money HERE: benefits have left against it and their amounts
 * are private. The tax vault is the opposite case — it never pays out privately,
 * so its `heldTotal` is a real public balance.
 */
export interface NationalTotals {
  fund: {
    address: string;
    /** Every contribution ever deposited, over how many deposits. Not a balance. */
    contributedMinor: bigint;
    contributionCount: number;
    /** How many benefits were paid. Never how much — see the header. */
    claimsPaid: number;
    /** Withheld from those benefits: still here, and already sent onward. */
    taxHeldMinor: bigint;
    taxRemittedMinor: bigint;
    socialHeldMinor: bigint;
    socialRemittedMinor: bigint;
  } | null;
  taxvault: {
    address: string;
    /** A genuine public balance: everything received, less everything withdrawn. */
    heldMinor: bigint;
    receivedMinor: bigint;
    withdrawnMinor: bigint;
    depositCount: number;
    withdrawalCount: number;
    /** The only key that can withdraw, frozen at deploy. */
    authority: string;
  } | null;
  /** Which of the two could not be read at all, as opposed to read as zero. */
  unreadable: string[];
}

export async function readNationalTotals(networkId: string): Promise<NationalTotals> {
  const here = forNetwork(await loadDeployments(), networkId);
  const fundDeployment = here.find(([, d]) => d.contractName === "fund")?.[1] ?? null;
  const vaultDeployment = here.find(([, d]) => d.contractName === "taxvault")?.[1] ?? null;
  const unreadable: string[] = [];

  /**
   * Reads one contract and extracts what is wanted, INSIDE the try.
   *
   * ⚠️ This used to return the ledger and let the caller read fields off it,
   * which looked equivalent and was not. A generated ledger is lazy: `ledger()`
   * succeeds on any state, and each getter decodes its own field on access. So
   * a mismatch between the module and the deployed contract throws from the
   * property read — outside the try — as an unhandled promise rejection.
   *
   * The cost was not just a console error. `totals` was never set, so the page
   * sat on "reading…" forever and both cards showed a dash: the exact failure
   * `unreadable` exists to report, reported as nothing at all.
   */
  const read = async <T>(
    contractName: "fund" | "taxvault",
    address: string,
    extract: (ledger: Record<string, any>) => T
  ): Promise<T | null> => {
    try {
      const contract = await loadContract(contractName);
      const state = await fetchContractState(networkId, address);
      if (!state) return null;
      return extract(contract.ledger(state.data) as Record<string, any>);
    } catch {
      // An instance predating this build, an address pointing at a DIFFERENT
      // contract, or an indexer that did not answer. Reported as unreadable
      // rather than as zeroes — a contract that cannot be read and one holding
      // nothing are not the same fact.
      return null;
    }
  };

  const [fund, taxvault] = await Promise.all([
    fundDeployment
      ? read("fund", fundDeployment.contractAddress, (l) => ({
          address: fundDeployment.contractAddress,
          contributedMinor: (l.contributedTotal ?? 0n) as bigint,
          contributionCount: Number(l.contributionCount ?? 0),
          claimsPaid: Number(l.claimsPaid ?? 0),
          taxHeldMinor: (l.taxPool ?? 0n) as bigint,
          taxRemittedMinor: (l.taxRemitted ?? 0n) as bigint,
          socialHeldMinor: (l.socialPool ?? 0n) as bigint,
          socialRemittedMinor: (l.socialRemitted ?? 0n) as bigint,
        }))
      : Promise.resolve(null),
    vaultDeployment
      ? read("taxvault", vaultDeployment.contractAddress, (l) => ({
          address: vaultDeployment.contractAddress,
          heldMinor: (l.heldTotal ?? 0n) as bigint,
          receivedMinor: (l.receivedTotal ?? 0n) as bigint,
          withdrawnMinor: (l.withdrawnTotal ?? 0n) as bigint,
          depositCount: Number(l.depositCount ?? 0),
          withdrawalCount: Number(l.withdrawalCount ?? 0),
          authority: bytesToHex(l.authority?.bytes ?? new Uint8Array()),
        }))
      : Promise.resolve(null),
  ]);

  if (fundDeployment && !fund) unreadable.push("benefit fund");
  if (vaultDeployment && !taxvault) unreadable.push("tax vault");

  return { fund, taxvault, unreadable };
}

/** One period an operator could settle, with both sides of the hop. */
export interface SettlementPeriod {
  period: number;
  /** What the payroll contracts assessed for this period, in minor units. */
  taxAssessed: bigint;
  socialAssessed: bigint;
  /** What has arrived at the national contracts, or null when unreadable. */
  taxArrived: bigint | null;
  contributionsArrived: bigint | null;
}

/**
 * Every period worth settling, with what is outstanding on each side.
 *
 * The period field used to be typed, and a typed period is a guess: nothing on
 * the page said which months had money in flight, so the operator either
 * remembered or went and read a contract. This is that answer, read from both
 * ends of the hop — assessed by payroll, arrived at the national contracts —
 * so the difference is visible before anything is spent.
 *
 * Periods come from the payroll contracts' own `periods` set, unioned with any
 * period the national contracts already hold something for. The union matters:
 * a deposit recorded against a month no payroll contract on this build can
 * decode still has to be visible, or it looks like it never happened.
 */
export async function readSettlementPeriods(
  networkId: string
): Promise<SettlementPeriod[]> {
  const here = forNetwork(await loadDeployments(), networkId);
  const payrolls = here.filter(([, d]) => d.contractName === "payroll" && !d.retired);
  const fund = here.find(([, d]) => d.contractName === "fund")?.[1] ?? null;
  const taxvault = here.find(([, d]) => d.contractName === "taxvault")?.[1] ?? null;

  const taxAssessed = new Map<number, bigint>();
  const socialAssessed = new Map<number, bigint>();

  const payroll = await loadContract("payroll").catch(() => null);
  if (payroll) {
    for (const [, deployment] of payrolls) {
      try {
        const state = await fetchContractState(networkId, deployment.contractAddress);
        if (!state) continue;
        const ledger = payroll.ledger(state.data) as any;
        for (const period of ledger.periods as Iterable<bigint>) {
          const key = Number(period);
          // Summed across contracts on purpose: several employers can file the
          // same month, and the treasury settles the month, not the employer.
          if (ledger.totalTaxFor?.member(period)) {
            taxAssessed.set(key, (taxAssessed.get(key) ?? 0n) + ledger.totalTaxFor.lookup(period));
          }
          if (ledger.totalSocialFor?.member(period)) {
            socialAssessed.set(
              key,
              (socialAssessed.get(key) ?? 0n) + ledger.totalSocialFor.lookup(period)
            );
          }
        }
      } catch {
        // A contract this build cannot decode is already counted as unreadable
        // on the public page; it must not take the rest of the list with it.
      }
    }
  }

  const arrivals = async (
    contractName: "fund" | "taxvault",
    address: string | null,
    field: "contributedFor" | "receivedFor"
  ): Promise<Map<number, bigint> | null> => {
    if (!address) return null;
    try {
      const contract = await loadContract(contractName);
      const state = await fetchContractState(networkId, address);
      if (!state) return null;
      const ledger = contract.ledger(state.data) as any;
      const map = ledger[field];
      if (!map) return null;
      const out = new Map<number, bigint>();
      for (const [period, amount] of map as Iterable<[bigint, bigint]>) {
        out.set(Number(period), amount);
      }
      return out;
    } catch {
      return null;
    }
  };

  const [contributions, tax] = await Promise.all([
    arrivals("fund", fund?.contractAddress ?? null, "contributedFor"),
    arrivals("taxvault", taxvault?.contractAddress ?? null, "receivedFor"),
  ]);

  const periods = new Set<number>([
    ...taxAssessed.keys(),
    ...socialAssessed.keys(),
    ...(contributions?.keys() ?? []),
    ...(tax?.keys() ?? []),
  ]);

  return [...periods]
    .sort((a, b) => b - a)
    .map((period) => ({
      period,
      taxAssessed: taxAssessed.get(period) ?? 0n,
      socialAssessed: socialAssessed.get(period) ?? 0n,
      taxArrived: tax ? (tax.get(period) ?? 0n) : null,
      contributionsArrived: contributions ? (contributions.get(period) ?? 0n) : null,
    }));
}

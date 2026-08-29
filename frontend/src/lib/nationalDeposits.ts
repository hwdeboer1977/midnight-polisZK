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

  const read = async (contractName: "fund" | "taxvault", address: string) => {
    try {
      const contract = await loadContract(contractName);
      const state = await fetchContractState(networkId, address);
      if (!state) return null;
      return contract.ledger(state.data) as Record<string, any>;
    } catch {
      // An instance predating this build, or an indexer that did not answer.
      // Reported as unreadable rather than as zeroes — a contract that cannot
      // be read and one holding nothing are not the same fact.
      return null;
    }
  };

  const [fundLedger, vaultLedger] = await Promise.all([
    fundDeployment ? read("fund", fundDeployment.contractAddress) : Promise.resolve(null),
    vaultDeployment ? read("taxvault", vaultDeployment.contractAddress) : Promise.resolve(null),
  ]);

  if (fundDeployment && !fundLedger) unreadable.push("benefit fund");
  if (vaultDeployment && !vaultLedger) unreadable.push("tax vault");

  return {
    fund:
      fundDeployment && fundLedger
        ? {
            address: fundDeployment.contractAddress,
            contributedMinor: fundLedger.contributedTotal ?? 0n,
            contributionCount: Number(fundLedger.contributionCount ?? 0),
            claimsPaid: Number(fundLedger.claimsPaid ?? 0),
            taxHeldMinor: fundLedger.taxPool ?? 0n,
            taxRemittedMinor: fundLedger.taxRemitted ?? 0n,
            socialHeldMinor: fundLedger.socialPool ?? 0n,
            socialRemittedMinor: fundLedger.socialRemitted ?? 0n,
          }
        : null,
    taxvault:
      vaultDeployment && vaultLedger
        ? {
            address: vaultDeployment.contractAddress,
            heldMinor: vaultLedger.heldTotal ?? 0n,
            receivedMinor: vaultLedger.receivedTotal ?? 0n,
            withdrawnMinor: vaultLedger.withdrawnTotal ?? 0n,
            depositCount: Number(vaultLedger.depositCount ?? 0),
            withdrawalCount: Number(vaultLedger.withdrawalCount ?? 0),
            authority: bytesToHex(vaultLedger.authority?.bytes ?? new Uint8Array()),
          }
        : null,
    unreadable,
  };
}

import { fetchContractState } from "./chain";
import { loadContract } from "./contracts";
import { forNetwork, loadDeployments } from "./deployments";

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

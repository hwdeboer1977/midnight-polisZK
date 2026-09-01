// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract } from "./contracts";
import { forNetwork, loadDeployments } from "./deployments";
import { bytesToHex, keyToHex, sameKey } from "./keys";

/**
 * Which payroll periods name a given wallet, read from public state.
 *
 * `payeeFor` publishes a hash of the payee's coin public key bound to the
 * period and the contract, so the wallet holding that key can recognise its own
 * slots and nobody else's. Nothing is fetched from a server that could be lying
 * and nothing needs a login — the scan is the recognition.
 *
 * Shared by the Employee page, which shows these as an employment record, and
 * by the Claim page, which uses them as a pre-flight check before a claim.
 * Having one copy matters more than the lines it saves: the payee hash is
 * computed with the contract's own pure circuit, and a second implementation
 * that drifted from Compact's struct encoding would make one page report
 * periods the other could not see.
 */
export interface Attestation {
  period: number;
  slot: number;
  employer: string;
  contractAddress: string;
  paid: boolean;
  funded: boolean;
  /**
   * Whether the employer has attested that this was the final period.
   *
   * Public state — `terminationFor` has a key per terminated slot — so an
   * employee can learn from the chain that their employment ended, rather than
   * only from being told. What it commits to stays private: the months worked
   * and the claim-key hash are inside the commitment, not beside it.
   */
  ended: boolean;
  /** The commitment published for this slot — opaque without the opening. */
  commitment: string;
  /**
   * The other two public inputs to that commitment: who filed it, and under
   * which rule set. Captured here so a payslip can be checked without a second
   * pass over the chain — and public precisely so an employee can do it.
   */
  employerKey: Uint8Array;
  paramsHash: Uint8Array;
}

export interface AttestationScan {
  rows: Attestation[];
  /**
   * The instance this wallet is the EMPLOYER of, if any.
   *
   * "No periods found" has two very different causes and only one is a problem:
   * an employer's own wallet matches no payee hash and never will.
   */
  employerOf: string | null;
}

/**
 * What to call the payroll contract a period was filed on.
 *
 * ⚠️ This returned an EMPTY STRING for the base deployment, which is now the
 * only one onboarding ever assigns: `instance` is undefined there, and
 * stripping `payroll` off a name that is exactly "payroll" leaves nothing. The
 * `?? name` fallback never fired, because `""` is not nullish — so the employee
 * page rendered a blank column and looked like it had lost the data.
 */
function employerLabel(name: string, instance?: string): string {
  const stripped = name.replace(/^.*payroll:?/, "");
  return instance || stripped || name;
}

export async function findAttestations(
  networkId: string,
  coinPublicKey: string
): Promise<AttestationScan> {
  const deployments = await loadDeployments();
  const payrolls = forNetwork(deployments, networkId).filter(
    // `retired` is checked before the fetch; `decodePayrollLedger` below still
    // checks after it, and both are wanted. The flag saves a round trip for a
    // contract already known to be unreadable; the decode catches one nobody has
    // marked yet, which is every one of them until someone does.
    ([, d]) => d.contractName === "payroll" && !d.retired
  );
  if (payrolls.length === 0) return { rows: [], employerOf: null };

  const contract = await loadContract("payroll");
  const circuits = (contract as any).pureCircuits;

  // Bound to the period and the contract, so it is one value per slot rather
  // than one per person — which is the point: equal hashes across months no
  // longer reveal that the same worker is behind them. The cost is that this
  // cannot be computed once up front.
  const myKey = fromHex(keyToHex(coinPublicKey));
  const bindingFor = (period: bigint, address: string) =>
    bytesToHex(
      circuits.payeeHash({ bytes: myKey }, period, fromHex(address.replace(/^0x/, "")))
    );

  const rows: Attestation[] = [];
  let employerOf: string | null = null;

  for (const [name, deployment] of payrolls) {
    const state = await fetchContractState(networkId, deployment.contractAddress);
    if (!state) continue;

    const ledger = decodePayrollLedger(contract, state.data);
    if (!ledger) continue;

    if (
      ledger.employerAssigned &&
      sameKey(bytesToHex(ledger.employer.bytes), coinPublicKey)
    ) {
      employerOf = employerLabel(name, deployment.instance);
    }

    for (const period of [...ledger.periods]) {
      if (!ledger.payeeFor.member(period)) continue;
      const payees = ledger.payeeFor.lookup(period);
      const count = ledger.employeeCountFor.member(period)
        ? Number(ledger.employeeCountFor.lookup(period))
        : 0;

      for (let slot = 0; slot < count; slot += 1) {
        const key = BigInt(slot);
        if (!payees.member(key)) continue;
        if (
          bytesToHex(payees.lookup(key)) !==
          bindingFor(period, deployment.contractAddress)
        ) {
          continue;
        }

        rows.push({
          period: Number(period),
          slot,
          employer: employerLabel(name, deployment.instance),
          contractAddress: deployment.contractAddress,
          paid:
            ledger.paidFor.member(period) && ledger.paidFor.lookup(period).member(key)
              ? ledger.paidFor.lookup(period).lookup(key)
              : false,
          funded:
            ledger.fundedFor.member(period) && ledger.fundedFor.lookup(period).member(key)
              ? ledger.fundedFor.lookup(period).lookup(key)
              : false,
          ended:
            ledger.terminationFor?.member(period) === true &&
            ledger.terminationFor.lookup(period).member(key),
          commitment:
            ledger.commitmentsFor.member(period) &&
            ledger.commitmentsFor.lookup(period).member(key)
              ? bytesToHex(ledger.commitmentsFor.lookup(period).lookup(key))
              : "",
          // Who filed the period, which is what the commitment binds — not the
          // key in the seat now, which a revoke zeroes and a rotation replaces.
          employerKey: ledger.employerFor.member(period)
            ? ledger.employerFor.lookup(period).bytes
            : ledger.employer.bytes,
          paramsHash: ledger.paramsHashFor.member(period)
            ? ledger.paramsHashFor.lookup(period)
            : new Uint8Array(32),
        });
      }
    }
  }

  rows.sort((a, b) => b.period - a.period);
  return { rows, employerOf };
}

function fromHex(value: string): Uint8Array {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

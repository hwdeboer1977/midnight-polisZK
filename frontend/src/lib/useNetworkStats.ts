import { useEffect, useState } from "react";
import { fetchContractState } from "./chain";
import { loadContract, type PayrollLedger, type PeurLedger } from "./contracts";
import { forNetwork, loadDeployments, type Deployment } from "./deployments";

/**
 * Everything the public page says about the system, read from the chain.
 *
 * No figure here is supplied by a server, a database or this file: each one is
 * summed from public contract state that anyone can read the same way. That is
 * the whole point of the page — a number a visitor has to take on trust is
 * worse than no number, because the claim being made is precisely that the
 * aggregates are verifiable while the individuals are not.
 *
 * Which is also why the figures a real social-protection system would show —
 * fund balance, contributions received, benefits paid, claims settled — are not
 * here. There is no fund contract and no claims contract yet, so there is
 * nothing to read and nothing honest to print.
 */
export interface NetworkStats {
  /** Payroll contracts on this network that have an employer assigned. */
  employers: number;
  /** Payroll contracts deployed, assigned or not. */
  contracts: number;
  /** Employees on the most recent period of each employer, summed. */
  workersCovered: number;
  /** Every period ever filed, across every employer. */
  periodsFiled: number;
  /** Periods where every slot is marked paid. */
  periodsSettled: number;
  /** Sum of `totalPayrollFor` over every period, in pEUR minor units. */
  payrollFiled: bigint;
  /**
   * Gross over periods where every slot is marked paid.
   *
   * Separate from `payrollFiled` on purpose: filing proves a figure was
   * committed to, settling proves the money moved. They are equal only when
   * nothing is outstanding, and collapsing them would claim settlement the
   * chain has not recorded.
   */
  payrollSettled: bigint;
  /** One opaque commitment per employee per period — the privacy mechanism, counted. */
  commitments: number;
  /** pEUR in circulation, from the token contract's own ledger. */
  peurSupply: bigint | null;
  /** Contracts to link to, in the order a reviewer should read them. */
  deployed: { label: string; name: string; deployment: Deployment }[];
}

const EMPTY: NetworkStats = {
  employers: 0,
  contracts: 0,
  workersCovered: 0,
  periodsFiled: 0,
  periodsSettled: 0,
  payrollFiled: 0n,
  payrollSettled: 0n,
  commitments: 0,
  peurSupply: null,
  deployed: [],
};

export function useNetworkStats(networkId: string) {
  const [stats, setStats] = useState<NetworkStats>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const deployments = await loadDeployments();
        const here = forNetwork(deployments, networkId);
        const payrolls = here.filter(([, d]) => d.contractName === "payroll");
        const peur = here.find(([, d]) => d.contractName === "peur");

        const next: NetworkStats = {
          ...EMPTY,
          contracts: payrolls.length,
          // pEUR first: the settlement asset is read out on its own, and the
          // payroll contracts are the list a reviewer walks.
          deployed: [
            ...(peur ? [{ label: "pEUR issuer", name: peur[0], deployment: peur[1] }] : []),
            ...payrolls.map(([name, deployment]) => ({
              label: "Employer payroll",
              name,
              deployment,
            })),
          ],
        };

        if (peur) {
          const contract = await loadContract("peur");
          const state = await fetchContractState(networkId, peur[1].contractAddress);
          if (state) {
            try {
              next.peurSupply = (contract.ledger(state.data) as PeurLedger).totalSupply;
            } catch {
              // An instance from an older contract shape: leave it unread rather
              // than failing the whole page over one deployment.
            }
          }
        }

        if (payrolls.length > 0) {
          const contract = await loadContract("payroll");
          for (const [, deployment] of payrolls) {
            const state = await fetchContractState(networkId, deployment.contractAddress);
            if (!state) continue;

            let ledger: PayrollLedger;
            try {
              ledger = contract.ledger(state.data) as PayrollLedger;
            } catch {
              continue;
            }

            if (ledger.employerAssigned) next.employers += 1;

            const periods = [...ledger.periods];
            next.periodsFiled += periods.length;

            for (const period of periods) {
              if (ledger.totalPayrollFor.member(period)) {
                next.payrollFiled += ledger.totalPayrollFor.lookup(period);
              }

              // Settled means every slot paid, not "some money moved". A
              // half-paid month is not a month anyone should be counting.
              const count = ledger.employeeCountFor.member(period)
                ? Number(ledger.employeeCountFor.lookup(period))
                : 0;
              let paid = 0;
              if (ledger.paidFor.member(period)) {
                const flags = ledger.paidFor.lookup(period);
                for (let i = 0; i < count; i += 1) {
                  if (flags.member(BigInt(i)) && flags.lookup(BigInt(i))) paid += 1;
                }
              }
              if (count > 0 && paid === count) {
                next.periodsSettled += 1;
                if (ledger.totalPayrollFor.member(period)) {
                  next.payrollSettled += ledger.totalPayrollFor.lookup(period);
                }
              }

              if (ledger.commitmentsFor.member(period)) {
                next.commitments += Number(ledger.commitmentsFor.lookup(period).size());
              }
            }

            // Headcount from the latest period only. Summing every period would
            // count the same ten people once per month they were paid.
            if (ledger.latestPeriod > 0n && ledger.employeeCountFor.member(ledger.latestPeriod)) {
              next.workersCovered += Number(ledger.employeeCountFor.lookup(ledger.latestPeriod));
            }
          }
        }

        if (!cancelled) setStats(next);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [networkId]);

  return { stats, loading, error };
}

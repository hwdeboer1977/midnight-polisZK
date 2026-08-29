// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract, type PeurLedger } from "./contracts";
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
 * The social-protection figures are now readable, with one exception that is not
 * an omission: **the fund's balance.** It is a shielded coin, so it is not
 * published — the fund is deliberately not publicly solvent, and that cannot be
 * fixed without also revealing what each claimant received, since successive
 * balances would give away the differences between them. Benefits paid, claims
 * settled and withholding totals are all real reads.
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
  /** The other three terms of the identity, each read as its own published total. */
  taxFiled: bigint;
  socialFiled: bigint;
  netFiled: bigint;
  /** Withheld money still held across every employer, and what has gone onward. */
  taxHeld: bigint;
  socialHeld: bigint;
  taxRemitted: bigint;
  socialRemitted: bigint;
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
  /**
   * The unemployment fund, or null if none is deployed on this network.
   *
   * Counts and withholding totals only. The fund's BALANCE is deliberately
   * absent, and not because it was hard to read: it is a shielded coin, so it
   * is not published at all. A dashboard cannot show a fund's solvency here,
   * and saying so is more honest than leaving a gap where a figure belongs.
   */
  fund: {
    claimsPaid: number;
    ruleSets: number;
    claimTrees: number;
    /**
     * Every contribution that has actually REACHED the fund, over how many
     * deposits. Money in — never a balance.
     *
     * The figure the public page leads its social-protection section with, and
     * the one that answers "what happened to the contributions?". `socialFiled`
     * cannot answer it: that is what payroll ASSESSED, and it sits in an
     * employer's wallet until two separate hops move it. What is left after
     * benefits have been paid is not published and cannot be — see the note on
     * this interface.
     */
    contributed: bigint;
    contributionCount: number;
    /** Withheld from benefits, held and remitted. Public by design. */
    taxHeld: bigint;
    taxRemitted: bigint;
    socialHeld: bigint;
    socialRemitted: bigint;
  } | null;
  /**
   * Payroll contracts whose on-chain layout does not match this build.
   *
   * Deployed before the current contract version. Their figures are missing
   * from every total above, which is worth saying out loud: a quietly smaller
   * number is worse than a visible gap.
   */
  unreadable: number;
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
  taxFiled: 0n,
  socialFiled: 0n,
  netFiled: 0n,
  taxHeld: 0n,
  socialHeld: 0n,
  taxRemitted: 0n,
  socialRemitted: 0n,
  payrollSettled: 0n,
  commitments: 0,
  peurSupply: null,
  fund: null,
  unreadable: 0,
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
        // Retired records are counted, not queried. The gap has to stay visible —
        // their figures are missing from every total below, and a quietly
        // smaller number is worse than a stated one — but the answer is already
        // known, so paying for the fetch to rediscover it every page load is
        // pure cost.
        const allPayrolls = here.filter(([, d]) => d.contractName === "payroll");
        const payrolls = allPayrolls.filter(([, d]) => !d.retired);
        const peur = here.find(([, d]) => d.contractName === "peur");
        const fund = here.find(([, d]) => d.contractName === "fund");

        const next: NetworkStats = { ...EMPTY };
        next.unreadable = allPayrolls.length - payrolls.length;

        // Payroll contracts this build can actually decode, filled in by the
        // loop below. The listed contracts and the counted ones are the same
        // set on purpose: listing five addresses beside a count of two was the
        // page contradicting itself, and a reviewer checking the list against
        // the totals would have been right to distrust both.
        const readable: { label: string; name: string; deployment: Deployment }[] = [];

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

        if (fund) {
          const contract = await loadContract("fund");
          const state = await fetchContractState(networkId, fund[1].contractAddress);
          if (state) {
            try {
              const ledger = contract.ledger(state.data) as any;
              next.fund = {
                claimsPaid: Number(ledger.claimsPaid),
                ruleSets: Number(ledger.latestVersion),
                claimTrees: [...ledger.rootFor].length,
                contributed: ledger.contributedTotal ?? 0n,
                contributionCount: Number(ledger.contributionCount ?? 0),
                taxHeld: ledger.taxPool ?? 0n,
                taxRemitted: ledger.taxRemitted ?? 0n,
                socialHeld: ledger.socialPool ?? 0n,
                socialRemitted: ledger.socialRemitted ?? 0n,
              };
            } catch {
              // A fund from an earlier contract shape. Left null rather than
              // reported as an empty one — the difference matters here, because
              // "no claims" and "cannot read" look identical as a zero.
            }
          }
        }

        if (payrolls.length > 0) {
          const contract = await loadContract("payroll");
          for (const [name, deployment] of payrolls) {
            const state = await fetchContractState(networkId, deployment.contractAddress);
            if (!state) continue;

            // Null means the deployment predates this build, not that the read
            // failed — counted so the page can say so instead of showing zeroes.
            const ledger = decodePayrollLedger(contract, state.data);
            if (!ledger) {
              next.unreadable += 1;
              continue;
            }
            readable.push({ label: "Employer payroll", name, deployment });

            if (ledger.employerAssigned) next.employers += 1;

            // Pool figures are per contract, not per period.
            next.taxHeld += ledger.taxPool ?? 0n;
            next.socialHeld += ledger.socialPool ?? 0n;
            next.taxRemitted += ledger.taxRemitted ?? 0n;
            next.socialRemitted += ledger.socialRemitted ?? 0n;

            const periods = [...ledger.periods];
            next.periodsFiled += periods.length;

            for (const period of periods) {
              if (ledger.totalPayrollFor.member(period)) {
                next.payrollFiled += ledger.totalPayrollFor.lookup(period);
              }
              // Read, never derived: the whole point is that the four can be
              // checked against each other by anyone.
              if (ledger.totalTaxFor?.member(period)) {
                next.taxFiled += ledger.totalTaxFor.lookup(period);
              }
              if (ledger.totalSocialFor?.member(period)) {
                next.socialFiled += ledger.totalSocialFor.lookup(period);
              }
              if (ledger.totalNetFor?.member(period)) {
                next.netFiled += ledger.totalNetFor.lookup(period);
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

        // Assembled last, from what decoded. pEUR first: the settlement asset
        // is read out on its own, and the payroll contracts are the list a
        // reviewer walks.
        next.contracts = readable.length;
        next.deployed = [
          ...(peur ? [{ label: "pEUR issuer", name: peur[0], deployment: peur[1] }] : []),
          ...(fund ? [{ label: "Unemployment fund", name: fund[0], deployment: fund[1] }] : []),
          ...readable,
        ];

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

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { DashHero, type DashMetric } from "../components/DashHero";
import { EmployerTable } from "../components/EmployerTable";
import { FundDeposit } from "../components/FundDeposit";
import { NationalTotals } from "../components/NationalTotals";
import { ServiceReset } from "../components/ServiceReset";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { formatPeur, formatPeurTile } from "../lib/format";
import { readNationalTotals, type NationalTotals as Totals } from "../lib/nationalDeposits";
import { useNetworkStats } from "../lib/useNetworkStats";
import { usePayrollInstances, type PayrollInstance } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/**
 * The platform's own console.
 *
 * Not a version of the public page for insiders. Public explains the protocol;
 * this operates it, so it is built to answer one question on arrival — is there
 * anything to do — and then to make doing it obvious. Clean and authoritative
 * rather than handsome.
 *
 * ── Why the last payroll hop lives here ────────────────────────────────────
 *
 * `FundDeposit` used to sit inside the employer's month stepper as step five.
 * It was never the employer's step. That hop spends the TREASURY wallets — the
 * seeds live in this service, not in any browser — and it pays into the benefit
 * fund and the tax vault, which the platform deployed and governs. An employer
 * pressing it would be spending money that had already left their contract, on
 * behalf of an institution they are not.
 *
 * ── What the gate is worth ─────────────────────────────────────────────────
 *
 * `isPlatform` is read off the contracts rather than from a configured address,
 * so a rotated platform key needs no code change. It hides controls; it secures
 * nothing. A coin public key is public, so anyone can claim to be this one — the
 * server refuses on the platform token, and the chain refuses on the signature.
 * Everything gated here is gated again by one of those two.
 */
export function Operator() {
  const { networkId, account } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});
  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const { instances, loading, refresh } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );
  const isPlatform = instances.some((instance) => instance.isPlatform);
  /**
   * The treasury this key is, if any.
   *
   * A third role, and a recent one. The treasuries used to be seeds the service
   * held, so the only person who could act here was the platform. Now they are
   * wallets the operator holds — and a shielded balance can be read only by the
   * key that owns it, so the platform key literally cannot see what a treasury
   * holds, let alone spend it.
   *
   * Gating this page on `isPlatform` alone therefore locked the settlement card
   * away from the only keys that can use it: connect a treasury and the page
   * said "not the platform of any contract"; connect the platform and the card
   * could neither read a balance nor pay.
   */
  const treasuryRole =
    instances.map((instance) => instance.treasuryRole).find(Boolean) ?? null;

  // Read regardless of the gate below, so the summary is populated the moment
  // the wallet resolves rather than a beat afterwards. Both are public reads
  // and `fetchContractState` caches, so this costs nothing an unauthorised
  // visitor could not have done from the public page.
  const { stats } = useNetworkStats(networkId);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [totalsNonce, setTotalsNonce] = useState(0);
  const [readingTotals, setReadingTotals] = useState(false);
  const reReadTotals = useCallback(() => setTotalsNonce((n) => n + 1), []);
  useEffect(() => {
    let cancelled = false;
    setReadingTotals(true);
    void readNationalTotals(networkId)
      .then((result) => {
        if (!cancelled) setTotals(result);
      })
      .finally(() => {
        if (!cancelled) setReadingTotals(false);
      });
    return () => {
      cancelled = true;
    };
  }, [networkId, totalsNonce]);

  if (!account) {
    return (
      <>
        <DashHero eyebrow="Operator" title="Manage treasury settlement and employer access." />
        <section className="op-head">
          <p className="note" style={{ marginTop: 0 }}>
            Connect the key that deployed these contracts. Every control here is
            checked again by the service or by the chain, so connecting the
            wrong one shows nothing rather than doing anything.
          </p>
        </section>
        <WalletPicker heading="Connect the platform key" subject="platform key" />
      </>
    );
  }

  if (!isPlatform && !treasuryRole) {
    return (
      <>
      <DashHero
        eyebrow="Operator"
        title={
          loading
            ? "Reading the contracts…"
            : `This key is not the platform of any contract on ${networkId}.`
        }
      />
      <section className="op-head">
        {loading ? null : (
          <p className="note">
            Every payroll contract records the key that deployed it, and this is
            not it. If you are an employer, your own contract is under{" "}
            <Link to="/employer">Employer</Link>.
          </p>
        )}
        <CopyRow label="Connected key" value={account.coinPublicKey} />
      </section>
      </>
    );
  }

  const pending = pendingSettlement(
    totals,
    stats.taxRemitted + stats.socialRemitted
  );

  return (
    <>
      {/* The dark zone. Title and standing figures together, because they are
          one statement — who you are and what is outstanding — and because a
          console needs somewhere the eye lands first. Everything below it is
          progressively lighter, so the page reads as depth rather than as a
          stack of equally important boxes. */}
      <DashHero
        eyebrow="Operator"
        title="Manage treasury settlement and employer access."
        metrics={operatorMetrics(instances, totals, pending)}
      />

      {/* The purple zone: the one action owed on a schedule. Everything else
          here is occasional — a company joins, a company leaves — while this is
          owed every month, and until it runs the money sits in a keypair with
          no contract behind it. The tint is the page saying so. */}
      <section className="work-zone">
        <h2 className="eyebrow">Treasury settlement</h2>
        <ProcessStrip pending={pending} />
        <FundDeposit
          networkId={networkId}
          onDeposited={reReadTotals}
          treasuryRole={treasuryRole}
        />
      </section>

      {/* White again, and read-only: this is where the operator checks rather
          than acts. Shown to a treasury key too — the national totals are public
          and are what a treasury is settling against. */}
      <section className="band">
        <h2 className="eyebrow">National contracts</h2>
        <NationalTotals
          totals={totals}
          networkId={networkId}
          reading={readingTotals}
          onReRead={reReadTotals}
        />
      </section>

      <section className="band">
        <h2 className="eyebrow">Employers</h2>
        <p className="note">
          Each contract can only file months the platform has opened on it, under
          the published rule set —{" "}
          <Link to="/app/rules">which months those are, per contract</Link>.
        </p>
        <EmployerTable instances={instances} networkId={networkId} onChanged={refresh} />
      </section>

      {/* Last, and behind a disclosure. It deletes this service's own files and
          is the one control here that nothing else undoes — and it is a preview
          convenience rather than part of how this system is meant to be run,
          which is a thing an operator should be told before they find the
          button rather than after. */}
      <section className="band">
        <details className="details advanced">
          <summary>Testing tools</summary>
          <p className="note">
            Not part of normal operation. This service keeps two local files —
            the deployment record and the fund's coin pool — and resetting
            forgets them. It does not undo anything on chain: the contracts stay
            deployed, the employers stay assigned, and the money stays where it
            is. What is lost is this machine's ability to find any of it.
          </p>
          <ServiceReset />
        </details>
      </section>
    </>
  );
}

/**
 * How much has left for the treasuries and not yet reached a contract.
 *
 * The one derived number on this page, and the reason it is derived rather than
 * read: what is actually spendable sits in two shielded treasury wallets, and a
 * shielded balance cannot be read without the spending key and a wallet sync.
 * Nothing on a page load can know it.
 *
 * What CAN be known is the gap between the two hops, from public state on both
 * sides: every payroll contract publishes `taxRemitted` and `socialRemitted` —
 * what left for the treasuries — and the two receiving contracts publish what
 * arrived. The difference is money in flight, and it is the operator's to move.
 *
 * An upper bound rather than a balance, and labelled as one wherever it is
 * shown. A platform top-up lands in a contract without a matching remittance,
 * so the receiving side can legitimately exceed the sending side; `null` for
 * "not read yet" and a `toppedUp` flag keep that case from rendering as a
 * negative figure, which would read as money gone missing.
 */
function pendingSettlement(
  totals: Totals | null,
  remitted: bigint
): { minor: bigint; toppedUp: boolean } | null {
  if (totals === null) return null;
  const arrived =
    (totals.fund?.contributedMinor ?? 0n) + (totals.taxvault?.receivedMinor ?? 0n);
  return {
    minor: remitted > arrived ? remitted - arrived : 0n,
    toppedUp: arrived > remitted,
  };
}

/**
 * Where the money is in the two-hop journey, and which hop is this page's.
 *
 * The flow used to be three words and two arrows at note size, which said the
 * right thing and carried no weight — a caption for a diagram that was not
 * there. As a strip it does the work a diagram should: the middle node is
 * highlighted because that is where the operator is standing and where the
 * money waits, and it carries the figure, so the strip is a reading of the
 * system rather than a picture of it.
 */
function ProcessStrip({ pending }: { pending: { minor: bigint; toppedUp: boolean } | null }) {
  return (
    <div className="process-strip">
      <div className="process-node">
        <span className="process-label">Payroll</span>
        <span className="process-sub">withholding assessed and remitted</span>
      </div>
      <span className="process-arrow" aria-hidden="true">→</span>
      <div className="process-node current">
        <span className="process-label">Treasury wallets</span>
        <span className="process-sub">
          {pending === null
            ? "reading…"
            : pending.toppedUp
              ? "nothing in flight"
              : pending.minor === 0n
                ? "nothing waiting"
                : `€${formatPeurTile(pending.minor)} waiting`}
        </span>
      </div>
      <span className="process-arrow" aria-hidden="true">→</span>
      <div className="process-node">
        <span className="process-label">National contracts</span>
        <span className="process-sub">benefit fund · tax vault</span>
      </div>
    </div>
  );
}

/** Whether anything needs attention, in four figures. */
function operatorMetrics(
  instances: PayrollInstance[],
  totals: Totals | null,
  pending: { minor: bigint; toppedUp: boolean } | null
): DashMetric[] {
  const mine = instances.filter((instance) => instance.isPlatform);
  const active = mine.filter((instance) => instance.state?.employerAssigned).length;
  const vacant = mine.length - active;
  const money = (value: bigint) => `€${formatPeurTile(value)}`;
  const exact = (value: bigint) => `Exactly €${formatPeur(value)}`;

  return [
    {
      value: String(active),
      label: active === 1 ? "Active employer" : "Active employers",
      note: vacant > 0 ? `${vacant} seat${vacant === 1 ? "" : "s"} vacant` : "every seat filled",
    },
    {
      value: totals?.fund ? money(totals.fund.contributedMinor) : "—",
      exact: totals?.fund ? exact(totals.fund.contributedMinor) : undefined,
      label: "Benefit fund",
      note: "contributions received",
    },
    {
      value: totals?.taxvault ? money(totals.taxvault.heldMinor) : "—",
      exact: totals?.taxvault ? exact(totals.taxvault.heldMinor) : undefined,
      label: "Tax vault",
      note: "held now",
    },
    {
      value: pending === null ? "…" : money(pending.minor),
      exact: pending === null ? undefined : exact(pending.minor),
      label: "Pending remittance",
      note:
        pending === null
          ? "reading"
          : pending.toppedUp
            ? "topped up beyond what payroll remitted"
            : pending.minor === 0n
              ? "All withholding settled ✓"
              : "remitted by employers, not yet arrived",
      attention: pending !== null && pending.minor > 0n,
    },
  ];
}

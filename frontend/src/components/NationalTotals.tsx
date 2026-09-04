// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { CopyRow } from "./CopyRow";
import { formatPeur, formatPeurTile } from "../lib/format";
import type { NationalTotals as Totals } from "../lib/nationalDeposits";

/**
 * What the two receiving contracts hold, side by side.
 *
 * State first, plumbing second. This was a list of labelled lines with the
 * shielded-balance argument, the withdrawal authority and two contract
 * addresses interleaved — everything true, and reading like a log rather than a
 * position. An operator opens this to answer "did the money arrive"; the
 * cryptography is why the answer takes the shape it does, not the answer.
 *
 * The two carry different accents on purpose — indigo for the fund, slate for
 * the vault. They were visually identical, which invited reading them as two
 * columns of one table; they are two institutions with opposite disclosure
 * properties, and the accent is the cheapest way to stop the eye treating them
 * as interchangeable.
 *
 * ⚠️ One of these two is not a balance and says so. The tax vault's `heldTotal`
 * is one: everything received less everything withdrawn, and it pays out only
 * to one frozen authority, in public. The benefit fund's is not published in
 * any form — it holds a shielded coin, benefits leave against it privately, and
 * successive balances would give away what each claimant received.
 * `contributedTotal` is money IN, and a heading like "held" over it would be a
 * solvency claim the contract does not make.
 */
export function NationalTotals({
  totals,
  networkId,
  reading,
  onReRead,
}: {
  totals: Totals | null;
  networkId: string;
  reading: boolean;
  onReRead: () => void;
}) {
  if (!totals) return <p className="note">Reading the national contracts…</p>;

  const { fund, taxvault } = totals;
  const money = (value: bigint) => `€${formatPeurTile(value)}`;
  const exact = (value: bigint) => `Exactly €${formatPeur(value)}`;
  const plural = (n: number, one: string) => `${n} ${one}${n === 1 ? "" : "s"}`;

  return (
    <>
      <div className="contract-pair">
        <div className="contract-card fund">
          <h3>
            Social protection fund
            {fund === null ? null : (
              <span className="contract-state" title="Deployed and answering">
                <span className="live-dot" aria-hidden="true" /> Active
              </span>
            )}
          </h3>
          {fund === null ? (
            <p className="muted">
              {totals.unreadable.includes("benefit fund")
                ? "Deployed, but its ledger does not match this build."
                : `Not deployed on ${networkId}.`}
            </p>
          ) : (
            <>
              <div className="contract-value" title={exact(fund.contributedMinor)}>
                {money(fund.contributedMinor)}
              </div>
              <div className="contract-value-label">Total received</div>
              {/* The distinction the two cards exist to draw, stated on the
                  face of each rather than in a caveat below. One has a balance
                  and publishes it; the other holds a shielded coin and cannot. */}
              <div className="contract-balance private">Balance: private</div>
              <ul className="contract-lines">
                <li>{plural(fund.contributionCount, "deposit")}</li>
                <li>{plural(fund.claimsPaid, "claim")} settled</li>
                <li
                  title={exact(
                    fund.taxHeldMinor +
                      fund.taxRemittedMinor +
                      fund.socialHeldMinor +
                      fund.socialRemittedMinor
                  )}
                >
                  {money(
                    fund.taxHeldMinor +
                      fund.taxRemittedMinor +
                      fund.socialHeldMinor +
                      fund.socialRemittedMinor
                  )}{" "}
                  withheld from benefits
                </li>
              </ul>
              <p className="contract-caveat">
                A shielded coin, so no balance is published — publishing one
                would give away what each claimant received.
              </p>
            </>
          )}
        </div>

        <div className="contract-card vault">
          <h3>
            Tax vault
            {taxvault === null ? null : (
              <span className="contract-state" title="Deployed and answering">
                <span className="live-dot" aria-hidden="true" /> Active
              </span>
            )}
          </h3>
          {taxvault === null ? (
            <p className="muted">
              {totals.unreadable.includes("tax vault")
                ? "Deployed, but its ledger does not match this build."
                : `Not deployed on ${networkId}.`}
            </p>
          ) : (
            <>
              <div className="contract-value" title={exact(taxvault.receivedMinor)}>
                {money(taxvault.receivedMinor)}
              </div>
              <div className="contract-value-label">Total received</div>
              <div className="contract-balance" title={exact(taxvault.heldMinor)}>
                Balance: <strong>{money(taxvault.heldMinor)}</strong> held now
              </div>
              <ul className="contract-lines">
                <li>{plural(taxvault.depositCount, "deposit")}</li>
                <li title={exact(taxvault.withdrawnMinor)}>
                  {money(taxvault.withdrawnMinor)} withdrawn over{" "}
                  {plural(taxvault.withdrawalCount, "withdrawal")}
                </li>
              </ul>
              <p className="contract-caveat">
                Public and unshielded: this contract never pays out privately,
                so its balance is a real one.
              </p>
            </>
          )}
        </div>
      </div>

      <details className="details">
        <summary>Contract details</summary>
        {fund ? <CopyRow label="Benefit fund" value={fund.address} /> : null}
        {taxvault ? (
          <>
            <CopyRow label="Tax vault" value={taxvault.address} />
            <CopyRow label="Withdrawal authority" value={taxvault.authority} />
          </>
        ) : null}
        <p className="note">
          <strong>The fund's balance is not published at all.</strong> It holds
          a shielded coin, so nothing on chain says what is left — and it cannot,
          without also revealing what each claimant received, since successive
          balances give away the differences between them. The figure above is
          money in: benefits have left against it.
        </p>
        <p className="note">
          The tax vault is the opposite case. It never pays out privately — only
          to the authority frozen at its deploy, in public — so received less
          withdrawn is genuinely what is there.
        </p>
        <p className="note">
          The fund's own withholding runs the other way from everything else on
          this page: it is tax and contributions taken <em>from benefits paid
          out</em>, not contributions arriving. Public by necessity — a contract
          that owes tax has to know how much.
        </p>
        <button type="button" className="ghost" disabled={reading} onClick={onReRead}>
          {reading ? "Reading…" : "Re-read the contracts"}
        </button>
      </details>
    </>
  );
}

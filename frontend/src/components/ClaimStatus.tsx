// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { FilePicker } from "./FilePicker";
import { parseClaimKeyFile } from "../lib/claimKey";
import { forNetwork, loadDeployments } from "../lib/deployments";
import { periodName } from "../generated/roster";
import { readClaimHistory, type ClaimHistory } from "../lib/claimStatus";

/**
 * "Have I already claimed?" — answered, where it used to say it could not be.
 *
 * The old copy told her no: checking would mean deriving her claim key, and
 * nothing on the page held her passphrase. The premise was right and the
 * conclusion was not. Her nullifiers are unguessable to everyone ELSE, which is
 * the property `fund.compact` gives up a public-key-derived nullifier to buy —
 * but she is the one person who holds the key, and the spent set is public. All
 * that was missing was a pure circuit to compute the hash with.
 *
 * It asks for her claim-key file rather than working from the connected wallet,
 * and that is not a shortcut we failed to take. If the wallet alone could
 * answer this, so could anyone holding her coin public key — which is an
 * address she hands out to be paid, so it would be every employer she ever had.
 * The file is the point.
 *
 * Nothing is uploaded and nothing is asked of an indexer. The whole spent set
 * is read and searched in the page: querying for one nullifier would disclose
 * the very link this construction denies, even though the answer is public.
 */
export function ClaimStatus({
  networkId,
  finalPeriod,
}: {
  networkId: string;
  /** The month her employer attested as final. Where the scan starts. */
  finalPeriod: number;
}) {
  const [history, setHistory] = useState<ClaimHistory | null>(null);
  const [keyName, setKeyName] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function check(text: string, name: string) {
    setError(null);
    setHistory(null);
    setKeyName(name);
    setBusy(true);
    try {
      const identity = await parseClaimKeyFile(text);

      const deployments = await loadDeployments();
      const fund = forNetwork(deployments, networkId).find(([name]) => name === "fund");
      if (!fund) {
        throw new Error(`No fund is deployed on ${networkId}, so there is nothing to check.`);
      }

      setHistory(
        await readClaimHistory({
          networkId,
          fundAddress: fund[1].contractAddress,
          claimKey: identity.claimKey,
          finalPeriod,
        })
      );
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    /* A section rather than a disclosure.
       
       It began as a <details>, inheriting the shape of the note it replaced —
       which said the question could not be answered. That was the right shape
       for an explanation of a limit and the wrong one for a control that now
       answers it: collapsed, it is indistinguishable from the apology it
       replaced. "How many months do I have left" is a first-order question for
       someone who has just lost their job, so it renders open. */
    // A utility, not a result. It wore the same lavender as the eligibility
    // outcome above it, which gave "have you already claimed?" the same weight
    // as "you are eligible" — one is the answer someone came for, the other is
    // a lookup they may never need.
    <section className="card utility">
      <h2>Have you already claimed?</h2>

      <p className="note" style={{ marginTop: 0 }}>
        You can check, and nobody else can. Each claim is recorded as a
        nullifier built from your claim key, and the fund's list of them is
        public — but finding yours in it needs the key. Load your file.
      </p>

      <FilePicker
        label="Choose your claim key…"
        loaded={history ? "Claim key" : null}
        filename={keyName}
        disabled={busy}
        onFile={async (file) => check(await file.text(), file.name)}
      />

      {busy ? <p className="status">Reading the fund…</p> : null}
      {error ? <p className="problems">{error}</p> : null}

      {history ? (
        <>
          {/* The three numbers, before the detail. Someone opening this wants
              "how many left", and a table of months makes them count. */}
          <div className="row">
            <div className="k">Months claimed</div>
            <div className="v">
              {history.claimedCount} of {history.entitlementMonths}
            </div>
          </div>
          <div className="row">
            <div className="k">Months remaining</div>
            <div className="v">
              {history.remaining === 0 ? (
                <span className="muted">none — your benefit is used up</span>
              ) : (
                <strong>{history.remaining}</strong>
              )}
            </div>
          </div>

          <table className="roster">
            <thead>
              <tr>
                <th>Month</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.windows.map((entry) => (
                <tr key={entry.window}>
                  <td>{periodName(entry.window)}</td>
                  <td>
                    {entry.claimed ? (
                      <span className="ok-line">✓ Claimed</span>
                    ) : (
                      <span className="muted">Not claimed</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Surfaced rather than assumed impossible. Nothing in `claim`
              constrains `window`, so a claim outside the entitlement is
              something the chain permits — and a panel that only ever looked at
              three months would be the last place it showed up. */}
          {history.outside.length > 0 ? (
            <p className="problems">
              <strong>
                {history.outside.length} claim
                {history.outside.length === 1 ? "" : "s"} outside your{" "}
                {history.entitlementMonths} months
              </strong>{" "}
              — {history.outside.map((entry) => periodName(entry.window)).join(", ")}.
              That should not be possible under the scheme and the contract does
              not currently prevent it. Report this.
            </p>
          ) : null}

          {/* The pilot figure named as one. It is app policy, not contract
              policy, and a claimant reading "3" deserves to know which. */}
          <p className="note warn">
            <strong>Three months is a pilot simplification.</strong> Everyone
            gets the same, whatever their employment history — the real scheme
            works it out from how long you worked. It is also what this page
            applies, not what the fund enforces: the contract does not yet limit
            how many months can be claimed.
          </p>

          <p className="note">
            Checked against the {history.claimsOnFund} claim
            {history.claimsOnFund === 1 ? "" : "s"} the fund has paid in total,
            to everyone. Which of them were yours is exactly what nobody without
            your claim key can work out — including this page, a moment ago.
          </p>
        </>
      ) : null}

      <p className="note">
        Nothing is uploaded, and nothing is asked of anyone. The whole list is
        read and searched here in your browser — asking a server whether one
        particular entry is yours would give away the answer this is designed to
        keep.
      </p>
    </section>
  );
}

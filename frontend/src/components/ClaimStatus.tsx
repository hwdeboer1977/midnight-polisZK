// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState, useEffect } from "react";
import { forNetwork, loadDeployments } from "../lib/deployments";
import { periodName } from "../generated/roster";
import { openingDate, readClaimHistory, type ClaimHistory } from "../lib/claimStatus";
import { useWallet } from "../wallet/WalletContext";

/**
 * "Which months have I claimed, and which can I claim now?"
 *
 * Runs on its own from the connected wallet: the nullifier is
 * `hash(ownPublicKey, month, fund)`, so there is nothing else to ask for. The
 * trade that makes that possible is stated on the page — anyone holding her
 * payment address can run the same check.
 *
 * Nothing is uploaded and nothing is asked of an indexer. The whole spent set
 * is read and searched in the page: querying for one nullifier would disclose
 * the very link it answers, even though the answer is public.
 */
export function ClaimStatus({
  networkId,
  finalPeriod,
}: {
  networkId: string;
  /** The month her employer attested as final. The entitlement starts after it. */
  finalPeriod: number;
}) {
  const { account } = useWallet();
  const [history, setHistory] = useState<ClaimHistory | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    setError(null);
    setBusy(true);
    void (async () => {
      try {
        const deployments = await loadDeployments();
        const fund = forNetwork(deployments, networkId).find(([name]) => name === "fund");
        if (!fund) {
          throw new Error(`No fund is deployed on ${networkId}, so there is nothing to check.`);
        }
        const result = await readClaimHistory({
          networkId,
          fundAddress: fund[1].contractAddress,
          coinPublicKey: account.coinPublicKey,
          finalPeriod,
        });
        if (!cancelled) setHistory(result);
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [account, networkId, finalPeriod]);

  return (
    // A utility, not a result: "have you already claimed?" is a lookup, and it
    // should not wear the same weight as "you are eligible" above it.
    <section className="card utility">
      <h2>Have you already claimed?</h2>

      <p className="note" style={{ marginTop: 0 }}>
        Each claim is recorded as a nullifier built from your wallet and the
        month it pays, and the fund's list of them is public. Yours are computed
        here from the wallet you have connected — no file needed. Anyone you
        have given your payment address to could run the same check, which is
        the cost of not needing one.
      </p>

      {busy ? <p className="status">Reading the fund…</p> : null}
      {error ? <p className="problems">{error}</p> : null}

      {history ? (
        <>
          {!history.rulesKnown ? (
            <p className="problems">
              No benefit rules this page recognises are recorded on the fund for{" "}
              {periodName(finalPeriod)} yet. The months below assume the pilot's{" "}
              {history.entitlementMonths}, and a claim cannot be made until the
              platform records the rules for that month.
            </p>
          ) : null}

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
              {history.months.map((entry) => (
                <tr key={entry.period}>
                  <td>{periodName(entry.period)}</td>
                  <td>
                    {entry.claimed ? (
                      <span className="ok-line">✓ Claimed</span>
                    ) : entry.started ? (
                      <strong>Claimable now</strong>
                    ) : (
                      <span className="muted">Opens {openingDate(entry.opensAt)}</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* The pilot figure named as one — and, now, as the contract's rule
              too: `claim` refuses a month outside these, or one not yet begun. */}
          <p className="note warn">
            <strong>{history.entitlementMonths} months is a pilot simplification.</strong>{" "}
            Everyone gets the same, whatever their employment history — the real
            scheme works it out from how long you worked. The fund enforces it:
            a month outside these, or one that has not started yet, is refused on
            chain.
          </p>

          <p className="note">
            Checked against the {history.claimsOnFund} claim
            {history.claimsOnFund === 1 ? "" : "s"} the fund has paid in total,
            to everyone. Which of them were yours can be worked out only from
            your payment address.
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

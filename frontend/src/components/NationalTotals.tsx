import { useEffect, useState } from "react";
import { CopyRow } from "./CopyRow";
import { formatPeur } from "../lib/format";
import { readNationalTotals, type NationalTotals } from "../lib/nationalDeposits";

/**
 * What the two receiving contracts hold, across every period.
 *
 * Read on mount and without a button, unlike the treasury wallets above it —
 * and the asymmetry is the whole privacy story in one panel. These figures are
 * ledger fields anyone can query from the indexer, so asking costs a read. A
 * treasury's balance is a shielded coin, so nobody but the holder of its
 * spending key can decrypt it at all, and answering means building and syncing
 * a wallet.
 *
 * ⚠️ One of these four boxes is deliberately not a balance. The tax vault's
 * `heldTotal` is one: everything it received less everything withdrawn, and it
 * pays out only to one frozen authority, in public. The benefit fund's is not
 * published in any form — what it holds is a shielded coin, benefits leave
 * against it privately, and successive balances would give away what each
 * claimant received. `contributedTotal` is money IN, and showing it under a
 * heading like "held" would be a solvency claim the contract does not make.
 */
export function NationalTotals({ networkId }: { networkId: string }) {
  const [totals, setTotals] = useState<NationalTotals | null>(null);
  const [nonce, setNonce] = useState(0);
  const [reading, setReading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReading(true);
    void readNationalTotals(networkId)
      .then((result) => {
        if (!cancelled) setTotals(result);
      })
      .finally(() => {
        if (!cancelled) setReading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [networkId, nonce]);

  if (!totals) {
    return <p className="note">Reading the national contracts…</p>;
  }

  const { fund, taxvault } = totals;

  return (
    <div className="national-totals">
      <div className="contract-balance">
        <h3>Benefit fund</h3>
        {fund === null ? (
          <p className="muted">
            {totals.unreadable.includes("benefit fund")
              ? "Deployed, but its ledger does not match this build — an earlier contract shape."
              : `No fund deployed on ${networkId}.`}
          </p>
        ) : (
          <>
            <ul className="plain">
              <li>
                Contributions received: <strong>€{formatPeur(fund.contributedMinor)}</strong>
                <span className="faint">
                  {" "}
                  over {fund.contributionCount}{" "}
                  {fund.contributionCount === 1 ? "deposit" : "deposits"}
                </span>
              </li>
              <li>
                Benefits paid: <strong>{fund.claimsPaid}</strong>
                <span className="faint">
                  {" "}
                  {fund.claimsPaid === 1 ? "claim" : "claims"} — the count is public, the
                  amounts are not
                </span>
              </li>
              <li>
                Withheld from those benefits: €
                {formatPeur(fund.taxHeldMinor + fund.socialHeldMinor)} held, €
                {formatPeur(fund.taxRemittedMinor + fund.socialRemittedMinor)} sent on
              </li>
            </ul>
            {/* Stated rather than left as a gap. A panel headed "balances" that
                simply omits one is read as a figure that failed to load. */}
            <p className="note">
              <strong>Balance: not published.</strong> The fund holds a shielded
              coin, so nothing on chain says what is left — and it cannot,
              without also revealing what each claimant received. The first line
              is money in, not money here: benefits have left against it.
            </p>
            <CopyRow label="Contract" value={fund.address} />
          </>
        )}
      </div>

      <div className="contract-balance">
        <h3>Tax vault</h3>
        {taxvault === null ? (
          <p className="muted">
            {totals.unreadable.includes("tax vault")
              ? "Deployed, but its ledger does not match this build — an earlier contract shape."
              : `No tax vault deployed on ${networkId}.`}
          </p>
        ) : (
          <>
            <ul className="plain">
              <li>
                Held now: <strong>€{formatPeur(taxvault.heldMinor)}</strong>
              </li>
              <li>
                Received: €{formatPeur(taxvault.receivedMinor)}
                <span className="faint">
                  {" "}
                  over {taxvault.depositCount}{" "}
                  {taxvault.depositCount === 1 ? "deposit" : "deposits"}
                </span>
              </li>
              <li>
                Withdrawn: €{formatPeur(taxvault.withdrawnMinor)}
                <span className="faint">
                  {" "}
                  over {taxvault.withdrawalCount}{" "}
                  {taxvault.withdrawalCount === 1 ? "withdrawal" : "withdrawals"}
                </span>
              </li>
            </ul>
            {/* A real balance, and worth saying why this one can be shown when
                the fund's cannot: the vault pays out in public, to one key. */}
            <p className="note">
              A genuine balance — the vault only ever pays out to the authority
              frozen at its deploy, in public, so received less withdrawn is what
              is there.
            </p>
            <CopyRow label="Contract" value={taxvault.address} />
            <CopyRow label="Withdrawal authority" value={taxvault.authority} />
          </>
        )}
      </div>

      <button
        type="button"
        className="ghost"
        disabled={reading}
        onClick={() => setNonce((n) => n + 1)}
      >
        {reading ? "Reading…" : "Re-read the contracts"}
      </button>
    </div>
  );
}

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { useWallet } from "../wallet/WalletContext";
import { readPublishedClaimKeys } from "../lib/publishedClaimKeys";
import { keyToHex } from "../lib/keys";
import {
  collectionStatus,
  forgetClaimKeyHash,
  recordClaimKeyHash,
} from "../lib/collected";

/**
 * Benefit key hashes collected, and from whom.
 *
 * This is the outstanding task an employer is least likely to discover on their
 * own and least able to fix late: the hash goes inside a write-once termination
 * attestation, so an employee who has not sent one by their last day can never
 * claim a benefit. Nothing on chain says whether it has been collected — the
 * attestation is the first record of it, and by then the window has closed.
 *
 * So it is tracked here, and the panel is honest about what that means: this is
 * what the browser has been told, not what is true. It can only undercount, and
 * an undercounted reminder is the safe direction to be wrong in.
 */
export function ClaimKeyCollection({
  contractAddress,
  rows,
  onSaved,
  compact,
}: {
  contractAddress: string;
  /** The roster currently loaded, or null when none is. */
  rows: { fullName: string; coinPublicKey: string }[] | null;
  /**
   * Fired after a hash is stored, so a caller reading the same store re-reads.
   *
   * The store is `localStorage`, which nothing subscribes to — this component's
   * own `bump` re-renders itself and nothing else, so a row rendering the status
   * beside this field kept showing "Missing" until the page was reloaded.
   */
  onSaved?: () => void;
  /**
   * One person, in their own row's panel.
   *
   * The roster form says "Ask these employees" over a counted header, which is
   * right for a whole payroll and absurd beside one name — "0 of 1 collected"
   * restates the status word already in that person's row, and the plural
   * instruction is addressed to a group of one.
   */
  compact?: boolean;
}) {
  const [, bump] = useState(0);
  const [entry, setEntry] = useState<Record<string, string>>({});

  /**
   * Hashes employees have published, ready to pick up.
   *
   * A SUGGESTION, never a source of truth. The employer anchors this value in a
   * write-once statement and a wrong one is only detectable at claim time — so
   * it pre-fills the field and the field stays editable, and a pasted value
   * always wins. The employee sees the same row on their own page, which is
   * where a mismatch gets caught while it can still be fixed.
   */
  const { networkId } = useWallet();
  const [published, setPublished] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void readPublishedClaimKeys(networkId).then((rows) => {
      if (!cancelled) setPublished(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId]);
  /**
   * What a row's field shows: what the employer typed, else what the employee
   * published. Typed always wins — the employer is the one signing.
   */
  /** Bech32m or hex in, hex out — the two sides of this store the same key
      differently, and a bech32 string never equals a hex one. */
  const hexKey = (key: string): string => {
    try {
      return keyToHex(key);
    } catch {
      return key.toLowerCase();
    }
  };
  const valueFor = (coinPublicKey: string): string =>
    entry[coinPublicKey] ?? published[hexKey(coinPublicKey)] ?? "";
  const isSuggested = (coinPublicKey: string): boolean =>
    entry[coinPublicKey] === undefined && Boolean(published[hexKey(coinPublicKey)]);

  const status = collectionStatus(contractAddress, rows);

  if (status.total === null) {
    return (
      <div className="row">
        <div className="k">Benefit key hashes</div>
        <div className="v muted">
          {status.withHash > 0
            ? `${status.withHash} recorded — load a workbook to see who is missing`
            : "Load a workbook to track who has sent one"}
        </div>
      </div>
    );
  }

  const done = status.missing.length === 0;

  if (compact) {
    // No counter and no plural instruction: the row above already showed the
    // status, and there is exactly one field.
    return done ? null : (
      <div className="collect">
        {status.missing.map((row) => (
          <div className="collect-row" key={row.coinPublicKey}>
            <span className="collect-who">
              Claim-key hash
              {isSuggested(row.coinPublicKey) ? (
                <span className="from-employee">sent by them</span>
              ) : null}
            </span>
            <input
              value={valueFor(row.coinPublicKey)}
              placeholder="paste the 64-character hash they sent you"
              onChange={(event) =>
                setEntry((was) => ({ ...was, [row.coinPublicKey]: event.target.value.trim() }))
              }
            />
            <button
              type="button"
              className="primary"
              disabled={!/^[0-9a-f]{64}$/i.test(valueFor(row.coinPublicKey))}
              onClick={() => {
                recordClaimKeyHash(
                  contractAddress,
                  row.coinPublicKey,
                  valueFor(row.coinPublicKey).toLowerCase()
                );
                setEntry((was) => ({ ...was, [row.coinPublicKey]: "" }));
                bump((n) => n + 1);
                onSaved?.();
              }}
            >
              Save
            </button>
          </div>
        ))}
        <p className="note" style={{ marginTop: 6 }}>
          They create it on their own Employee page and send it to you. It is
          public and gives you no way to claim anything. Stored in this browser
          only.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="row">
        <div className="k">Benefit key hashes</div>
        <div className="v">
          {done ? (
            <span className="ok-line">{status.withHash} of {status.total}</span>
          ) : (
            <span className="warn-inline">
              {status.withHash} of {status.total} collected
            </span>
          )}
        </div>
      </div>

      {done ? null : (
        <div className="collect">
          <p className="note" style={{ marginTop: 0 }}>
            <strong>Ask these employees for their claim-key hash.</strong> They
            create it on the Employee page and send you the hash — it is public
            and gives you no way to claim anything. You need it{" "}
            <strong>before</strong> you end their employment: the statement you
            sign is write-once and the hash goes inside it.
          </p>
          {status.missing.map((row) => (
            <div className="collect-row" key={row.coinPublicKey}>
              <span className="collect-who">
                {row.fullName || row.coinPublicKey.slice(0, 12)}
                {isSuggested(row.coinPublicKey) ? (
                  <span className="from-employee">sent by them</span>
                ) : null}
              </span>
              <input
                value={valueFor(row.coinPublicKey)}
                placeholder="paste their claim-key hash"
                onChange={(event) =>
                  setEntry((was) => ({ ...was, [row.coinPublicKey]: event.target.value.trim() }))
                }
              />
              <button
                type="button"
                className="ghost"
                disabled={!/^[0-9a-f]{64}$/i.test(valueFor(row.coinPublicKey))}
                onClick={() => {
                  recordClaimKeyHash(
                    contractAddress,
                    row.coinPublicKey,
                    valueFor(row.coinPublicKey).toLowerCase()
                  );
                  setEntry((was) => ({ ...was, [row.coinPublicKey]: "" }));
                  bump((n) => n + 1);
                  // After the write, never before: the caller re-reads the same
                  // store and would otherwise read it one save behind.
                  onSaved?.();
                }}
              >
                Save
              </button>
            </div>
          ))}
          <p className="note">
            Stored in this browser only, so a hash recorded elsewhere shows as
            missing here. Nothing is sent anywhere, and a hash is not a secret.
          </p>
        </div>
      )}

      {done && rows ? (
        <p className="note">
          All {status.total} recorded in this browser.{" "}
          <button
            type="button"
            className="ghost"
            onClick={() => {
              for (const row of rows) forgetClaimKeyHash(contractAddress, row.coinPublicKey);
              bump((n) => n + 1);
            }}
          >
            Clear
          </button>
        </p>
      ) : null}
    </>
  );
}

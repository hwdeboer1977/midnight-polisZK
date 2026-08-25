import { useState } from "react";
import {
  collectionStatus,
  forgetClaimKeyHash,
  recordClaimKeyHash,
} from "../lib/collected";

/**
 * Claim-key hashes collected, and from whom.
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
}: {
  contractAddress: string;
  /** The roster currently loaded, or null when none is. */
  rows: { fullName: string; coinPublicKey: string }[] | null;
}) {
  const [, bump] = useState(0);
  const [entry, setEntry] = useState<Record<string, string>>({});
  const status = collectionStatus(contractAddress, rows);

  if (status.total === null) {
    return (
      <div className="row">
        <div className="k">Claim-key hashes</div>
        <div className="v muted">
          {status.withHash > 0
            ? `${status.withHash} recorded — load a workbook to see who is missing`
            : "Load a workbook to track who has sent one"}
        </div>
      </div>
    );
  }

  const done = status.missing.length === 0;

  return (
    <>
      <div className="row">
        <div className="k">Claim-key hashes</div>
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
            derive it on the Employee page and send you the hash — it is public
            and gives you no way to claim anything. You need it{" "}
            <strong>before</strong> you end their employment: the statement you
            sign is write-once and the hash goes inside it.
          </p>
          {status.missing.map((row) => (
            <div className="collect-row" key={row.coinPublicKey}>
              <span className="collect-who">{row.fullName || row.coinPublicKey.slice(0, 12)}</span>
              <input
                value={entry[row.coinPublicKey] ?? ""}
                placeholder="paste their claim-key hash"
                onChange={(event) =>
                  setEntry((was) => ({ ...was, [row.coinPublicKey]: event.target.value.trim() }))
                }
              />
              <button
                type="button"
                className="ghost"
                disabled={!/^[0-9a-f]{64}$/i.test(entry[row.coinPublicKey] ?? "")}
                onClick={() => {
                  recordClaimKeyHash(
                    contractAddress,
                    row.coinPublicKey,
                    (entry[row.coinPublicKey] ?? "").toLowerCase()
                  );
                  setEntry((was) => ({ ...was, [row.coinPublicKey]: "" }));
                  bump((n) => n + 1);
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

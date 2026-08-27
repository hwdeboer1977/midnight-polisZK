import { useState } from "react";
import { FilePicker } from "./FilePicker";
import { useServiceJob } from "../lib/useServiceJob";

/**
 * Turning termination openings into claim bundles, without a terminal.
 *
 * The relay used to be `npm run relay -- <period> --publish`, which put the one
 * step between an employer ending someone's employment and that person being
 * able to claim behind a checkout of this repo. The work itself never needed a
 * terminal — it reads public payroll state, checks each opening against the
 * attestation already on chain, and submits one transaction.
 *
 * ── Why the server still does it ────────────────────────────────────────────
 *
 * Building the tree would port to the browser — `claim-tree.ts` is pure and the
 * fund module is already here. The pool coin each bundle carries would not:
 * `fund-pool.ts` is a file-backed record of the fund's deposits, a page cannot
 * read it, and the deposits are not on chain in a form a page could rebuild. So
 * this posts to `/api/relay` and the existing, tested code runs unchanged.
 *
 * ── What the employer is trusted with, which is nothing ─────────────────────
 *
 * The openings are uploaded, not authored: `runRelay` recomputes each one's
 * commitment and refuses any that does not reproduce what is on chain. An
 * employer cannot publish a leaf they never attested to, which is the property
 * that makes this safe to hand them rather than keep behind the operator's
 * token.
 */

interface RelayBundle {
  period: number;
  instance: string;
  slot: number;
  root: string;
  poolCoin: { value: string } | null;
}

interface RelayResult {
  period: number;
  root: string | null;
  bundles: RelayBundle[];
  skipped: { instance: string; slot: number; reason: string }[];
  warnings: string[];
  published: boolean;
  txHash: string | null;
}

export function RelayPanel({ period }: { period: number | null }) {
  const [openings, setOpenings] = useState<{ name: string; body: unknown }[]>([]);
  const [publish, setPublish] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { job, submitting, start } = useServiceJob<RelayResult>("/api/relay");

  const busy = submitting || job?.status === "running";
  const result = job?.status === "done" ? job.result : null;

  function download(bundle: RelayBundle) {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `claim-bundle-${bundle.instance}-${bundle.period}-slot-${bundle.slot + 1}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="card">
      <h2>Publish claims for this period</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Upload the termination openings you downloaded when you ended someone's
        employment. Each one becomes a claim bundle to hand to that person — it
        is what lets them prove a benefit claim is theirs. Nothing here reveals a
        salary: an opening carries a final month, months worked and a hash.
      </p>

      <FilePicker
        label="Add a termination opening…"
        loaded={openings.length > 0 ? `${openings.length} opening(s) ready` : null}
        filename={openings.at(-1)?.name ?? null}
        disabled={busy}
        onFile={async (file) => {
          setError(null);
          try {
            const parsed = JSON.parse(await file.text());
            // Accepted as an array too, because an employer with several
            // leavers has several files and may well have merged them.
            const entries = Array.isArray(parsed) ? parsed : [parsed];
            for (const entry of entries) {
              if (typeof entry?.claimKeyHash !== "string" || typeof entry?.nonce !== "string") {
                throw new Error(
                  `${file.name} is not a termination opening — it has no claim-key hash and nonce. ` +
                    "A claim bundle or a payslip will not do: they travel the other way."
                );
              }
            }
            setOpenings((current) => [
              ...current.filter((o) => o.name !== file.name),
              ...entries.map((body) => ({ name: file.name, body })),
            ]);
          } catch (cause) {
            setError(cause instanceof Error ? cause.message : String(cause));
          }
        }}
      />

      {openings.length > 0 ? (
        <ul className="problems">
          {openings.map((o, index) => (
            <li key={`${o.name}-${index}`}>
              {o.name}
              {" · "}
              <button
                type="button"
                className="linkish"
                disabled={busy}
                onClick={() => setOpenings((c) => c.filter((_, i) => i !== index))}
              >
                remove
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className="prove-here">
        <input
          type="checkbox"
          checked={publish}
          disabled={busy}
          onChange={(event) => setPublish(event.target.checked)}
        />{" "}
        Publish the root to the fund
        <span className="muted">
          {" "}
          — without it the bundles are built but no claim can be checked against
          them yet. Publishing is permissionless, so anyone can do it later; it
          costs one transaction and a few minutes of proving.
        </span>
      </label>

      <button
        type="button"
        className="primary"
        disabled={busy || openings.length === 0 || !period}
        onClick={() =>
          void start({ period, publish, openings: openings.map((o) => o.body) })
        }
      >
        {busy ? "Building the claim tree…" : `Build claim bundles for ${period ?? "—"}`}
      </button>

      {job?.status === "running" && job.log.length > 0 ? (
        <pre className="log">{job.log.join("\n")}</pre>
      ) : null}

      {job?.status === "failed" ? <p className="status error">{job.error}</p> : null}
      {error ? <p className="status error">{error}</p> : null}

      {result ? (
        <>
          {result.bundles.length === 0 ? (
            <p className="status error">
              No bundles were built. Every opening was skipped — see below.
            </p>
          ) : (
            <>
              <p className="ok-line">
                ✓ {result.bundles.length}{" "}
                {result.bundles.length === 1 ? "bundle" : "bundles"} built
                {result.published ? " and the root published" : " (root not published)"}
              </p>
              <ul className="problems">
                {result.bundles.map((bundle) => (
                  <li key={`${bundle.instance}-${bundle.slot}`}>
                    slot {bundle.slot + 1}
                    {bundle.poolCoin ? "" : " — no fund coin attached, this cannot be claimed yet"}
                    {" · "}
                    <button type="button" className="linkish" onClick={() => download(bundle)}>
                      Download
                    </button>
                  </li>
                ))}
              </ul>
              <p className="note">
                Send each person their own file. It is not secret — it proves
                membership of a public tree — but it is theirs, and two people
                handed the same one would race for the same fund coin.
              </p>
            </>
          )}

          {/* Surfaced, never swallowed: a refused opening is the case where an
              employer thinks someone can claim and they cannot. */}
          {result.skipped.length > 0 ? (
            <>
              <p className="note">Not included:</p>
              <ul className="problems">
                {result.skipped.map((s, i) => (
                  <li key={i}>
                    {s.instance} slot {s.slot + 1} — {s.reason}
                  </li>
                ))}
              </ul>
            </>
          ) : null}

          {result.warnings.map((w, i) => (
            <p key={i} className="note">
              ⚠️ {w}
            </p>
          ))}

          {result.txHash ? <p className="note">tx {result.txHash}</p> : null}
        </>
      ) : null}
    </section>
  );
}

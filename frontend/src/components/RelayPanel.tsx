// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { FilePicker } from "./FilePicker";
import { rebuildTerminationOpening } from "../lib/rebuildOpening";
import { useServiceJob } from "../lib/useServiceJob";

/**
 * Publishing a period's claim tree, without a terminal.
 *
 * ⚠️ This was "turning termination openings into claim bundles", and the
 * bundles were the deliverable — an employer built one per leaver and sent it.
 * They are a by-product now: a claimant assembles their own from the chain, the
 * period's public digests and their wallet. What only this can produce is the
 * pair nothing else can:
 *
 *   · the ROOT on chain, which `claim` asserts membership against
 *   · the DIGEST list, which is what a claimant builds their path from
 *
 * Neither is derivable elsewhere, because the leaves are not on chain — this is
 * the only place the full leaf set ever exists.
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

export interface RelayBundle {
  period: number;
  instance: string;
  slot: number;
  root: string;
  poolCoin: { value: string } | null;
}

export interface RelayResult {
  period: number;
  root: string | null;
  bundles: RelayBundle[];
  skipped: { instance: string; slot: number; reason: string }[];
  warnings: string[];
  published: boolean;
  txHash: string | null;
}

export function RelayPanel({
  period,
  defaultPublish = true,
  bare,
  rebuild,
}: {
  period: number | null;
  /**
   * Everything needed to rebuild this person's opening from the passphrase.
   *
   * Supplied by the row that knows who it is about. Absent, the panel is the
   * upload-only tool it has always been — which is still the right shape for a
   * period with several leavers, where no single employee is "the" subject.
   */
  rebuild?: {
    networkId: string;
    contractAddress: string;
    instance: string;
    payee: string;
  };
  /**
   * Whether to publish the root as well as build the bundles.
   *
   * Defaulted OFF when rebuilding a bundle for a period whose root is already
   * on chain: the same openings produce the same root, so publishing again is a
   * transaction and a few minutes of proving that change nothing. Still a
   * checkbox, because a period whose root was never published needs it.
   */
  defaultPublish?: boolean;
  /** Rendered without its own card, for embedding in a row that supplies one. */
  bare?: boolean;
}) {
  const [openings, setOpenings] = useState<{ name: string; body: unknown }[]>([]);
  const [publish, setPublish] = useState(defaultPublish);
  const [error, setError] = useState<string | null>(null);
  const [passphrase, setPassphrase] = useState("");
  const [deriving, setDeriving] = useState(false);

  /**
   * Whether this period's root is already on chain.
   *
   * ⚠️ This used to be a checkbox the employer had to reason about, with a
   * paragraph explaining when to tick it. That is a question the page can
   * answer: `rootFor` is public, so read it. An employer who ticks it wrongly
   * either wastes a transaction or leaves a claimant unable to prove anything,
   * and neither is a decision worth delegating to someone reading a note.
   *
   * `null` while unknown — publishing is then offered rather than assumed,
   * which is the safe direction: republishing the same opening reproduces the
   * same root and costs a transaction, while not publishing costs a claim.
   */
  const [rootPublished, setRootPublished] = useState<boolean | null>(null);
  /** Bumped when a run finishes, so the answer above is re-read from chain. */
  const [refreshRoot, setRefreshRoot] = useState(0);
  useEffect(() => {
    if (period === null) return;
    let cancelled = false;
    void (async () => {
      try {
        const [{ fetchContractState }, { loadContract }, { loadDeployments, forNetwork }] =
          await Promise.all([
            import("../lib/chain"),
            import("../lib/contracts"),
            import("../lib/deployments"),
          ]);
        const networkId = rebuild?.networkId ?? "";
        const deployments = await loadDeployments();
        const fundRecord = forNetwork(deployments, networkId).find(([n]) => n === "fund");
        if (!fundRecord) return;
        const state = await fetchContractState(networkId, fundRecord[1].contractAddress);
        if (!state) return;
        const fund = (await loadContract("fund")) as any;
        const ledger = fund.ledger(state.data);
        if (!cancelled) setRootPublished(Boolean(ledger.rootFor.member(BigInt(period))));
      } catch {
        // Unknown stays unknown; the action below offers to publish either way.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, rebuild?.networkId, refreshRoot]);

  /**
   * Derive the opening AND publish, as one act.
   *
   * They were two buttons, and the first was never a decision — an employer who
   * wants to publish a tree has no reason to want the opening on its own. What
   * the split actually produced was a panel where the obvious button did half
   * the job and left the other half looking optional.
   */
  async function publishTree() {
    if (period === null) return;
    let ready = openings.map((o) => o.body);
    if (ready.length === 0) {
      const derived = await deriveOpening();
      if (!derived) return;
      ready = [derived];
    }
    await start({ period, publish: rootPublished !== true, openings: ready });
    setRefreshRoot((n) => n + 1);
  }

  /**
   * Rebuilds the opening instead of asking for the file.
   *
   * Everything in it is derivable: the nonce from the passphrase, the slot and
   * months worked from the chain. Nothing has to be collected from the employee
   * — that dependency left with the claim key. `runRelay` still checks the
   * result against the attestation on chain, so a wrong passphrase is caught
   * here rather than months later by a claimant who cannot open it.
   */
  async function deriveOpening(): Promise<unknown | null> {
    if (!rebuild || period === null) return null;
    setError(null);
    setDeriving(true);
    try {
      const opening = await rebuildTerminationOpening({
        networkId: rebuild.networkId,
        contractAddress: rebuild.contractAddress,
        instance: rebuild.instance,
        payee: rebuild.payee,
        period,
        passphrase,
      });
      setPassphrase("");
      setOpenings([{ name: "rebuilt from your passphrase", body: opening }]);
      return opening;
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      return null;
    } finally {
      setDeriving(false);
    }
  }
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

  const Frame = bare ? "div" : "section";
  return (
    <Frame className={bare ? "relay-bare" : "card"}>
      {bare ? null : <h2>Publish this period's claim tree</h2>}
      {/* Suppressed when embedded: the row that opens this has just said the
          same thing about one named person, and saying it twice makes the
          second copy look like a different instruction. */}
      {bare ? null : (
        <p className="note" style={{ marginTop: 0 }}>
          Upload the termination openings you downloaded when you ended someone's
          employment. Together they become that month's claim tree: the root
          goes on chain, and the leaf digests let each of those people build
          their own proof — nothing has to be sent to them. Nothing here reveals
          a salary: an opening carries a final month and months worked.
        </p>
      )}

      {rebuild ? (
        <div className="rebuild-derive">
          {/* One line, then one field, then one button.
              
              This was four paragraphs, a passphrase, a "Rebuild opening"
              button, a file picker and a publish checkbox — five things to read
              and three to press, for what is one act: publish this month's
              claim tree. The opening is a means, not a decision; whether to
              publish is a fact the page can read off `rootFor` rather than a
              question to put to the employer. What is left is the act. */}
          <p className="note" style={{ marginTop: 0 }}>
            {rootPublished === true ? (
              <>
                <strong>✓ Already published.</strong> Republishing reproduces the
                same root from the same opening — only needed if you have reason
                to think it is wrong.
              </>
            ) : (
              <>
                <strong>Not published yet.</strong> Until this month's tree is on
                chain, nobody terminated in it can prove a claim.
              </>
            )}
          </p>

          <div className="collect-row">
            <input
              type="password"
              value={passphrase}
              placeholder="your payroll passphrase"
              autoComplete="off"
              disabled={busy || deriving}
              onChange={(event) => setPassphrase(event.target.value)}
            />
            <button
              type="button"
              className="primary"
              disabled={(!passphrase && openings.length === 0) || busy || deriving}
              onClick={() => void publishTree()}
            >
              {deriving
                ? "Rebuilding…"
                : busy
                  ? "Publishing…"
                  : rootPublished === true
                    ? "Republish the claim tree"
                    : "Publish the claim tree"}
            </button>
          </div>

          <details className="details" style={{ marginTop: 8 }}>
            <summary>How this works, and the other way to do it</summary>
            <p className="note">
              Ending someone's employment publishes the month's tree in the same
              step, so this is only needed when that failed.
            </p>
            <p className="note">
              <strong>No file needed.</strong> The nonce inside a termination is
              derived from your payroll passphrase, and the slot and months
              worked are read from the chain — so the opening is rebuilt rather
              than found. Everything is checked against the attestation already
              on chain before anything is published.
            </p>
            <p className="note">
              A claimant proves membership of this tree and builds their own
              proof from it. <strong>Nothing is sent to them.</strong>
            </p>
            <p className="note">Or upload the opening you downloaded at the time:</p>
            <FilePicker
              label="Add a termination opening…"
              loaded={openings.length > 0 ? `${openings.length} opening(s) ready` : null}
              filename={openings.at(-1)?.name ?? null}
              disabled={busy}
              onFile={async (file) => {
                setError(null);
                try {
                  const parsed = JSON.parse(await file.text());
                  const entries = Array.isArray(parsed) ? parsed : [parsed];
                  for (const entry of entries) {
                    if (typeof entry?.nonce !== "string" || typeof entry?.slot !== "number") {
                      throw new Error(
                        `${file.name} is not a termination opening — it has no slot and nonce. ` +
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
          </details>
        </div>
      ) : (
        <>
          {/* The standalone panel keeps the upload-and-tick shape: a period with
              several leavers has no single employee it is "about", so there is
              no passphrase rebuild to offer and no one root state to read. */}
          <FilePicker
            label="Add a termination opening…"
            loaded={openings.length > 0 ? `${openings.length} opening(s) ready` : null}
            filename={openings.at(-1)?.name ?? null}
            disabled={busy}
            onFile={async (file) => {
              setError(null);
              try {
                const parsed = JSON.parse(await file.text());
                const entries = Array.isArray(parsed) ? parsed : [parsed];
                for (const entry of entries) {
                  if (typeof entry?.nonce !== "string" || typeof entry?.slot !== "number") {
                    throw new Error(
                      `${file.name} is not a termination opening — it has no slot and nonce. ` +
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
            {busy ? "Building the claim tree…" : `Publish the claim tree for ${period ?? "—"}`}
          </button>
        </>
      )}

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
              <p className={result.published ? "ok-line" : "problems"}>
                {result.published
                  ? `✓ Claim tree published — ${result.bundles.length} ` +
                    `${result.bundles.length === 1 ? "termination" : "terminations"} in it. ` +
                    "Nothing to send: each person builds their own proof from it."
                  : `Tree built over ${result.bundles.length} ` +
                    `${result.bundles.length === 1 ? "termination" : "terminations"}, ` +
                    "but the root was NOT published — until it is, no claim can be " +
                    "checked against it. Re-run with the publish box ticked."}
              </p>
              {/* Kept as a disclosure, not an instruction. The download used
                  to be the point of this panel and is now a fallback for a
                  claimant whose browser cannot reach the service — so it is
                  reachable and no longer reads as a step somebody owes. */}
              <details className="details">
                <summary>Download a bundle anyway ({result.bundles.length})</summary>
                <p className="note">
                  Not needed. A claimant assembles this themselves from the tree
                  above — this is here for one who cannot reach the service.
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
              </details>
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
    </Frame>
  );
}

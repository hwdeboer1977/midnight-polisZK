// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useState } from "react";
import { periodName } from "../generated/roster";
import { recoverPayslips } from "../lib/recoverPayslips";
import { namesBySlot } from "../lib/collected";
import type { Payslip } from "../lib/payslip";
import { Payslips } from "./Payslips";

/**
 * Getting a period's payslips back, at any time after it was filed.
 *
 * Deliberately not a stored list. The panel that appears right after filing is
 * in memory and gone on reload, which is the correct lifetime for a document
 * holding everyone's salary — persisting it would put the payroll at rest in
 * the browser for the convenience of not typing a passphrase.
 *
 * Nothing is lost by that, because the openings are on chain and the passphrase
 * decrypts them. The passphrase is the cost, and it is the same one filing
 * already asks for.
 */
export function PayslipRecovery({
  contractAddress,
  networkId,
  periods,
  bare,
  names,
  sessionPassphrase,
}: {
  contractAddress: string;
  networkId: string;
  /** Filed periods, newest first. */
  periods: number[];
  /**
   * Rendered without its own card, for use inside a step.
   *
   * The month's last step had no control at all unless you happened to have
   * filed in the same session — reload the page and the only way to hand out a
   * payslip was to find another panel. Recovering them needs the passphrase and
   * nothing else, so the step can own it.
   */
  bare?: boolean;
  /**
   * Employee names by slot, from the loaded workbook.
   *
   * A recovered payslip cannot know them: the sealed opening holds the four
   * amounts, the weeks and the nonce — no name, deliberately, because a name on
   * chain is the one thing that would make a slot identifiable. So recovered
   * slips read "Employee 1" unless the workbook that produced them is open,
   * which is exactly when the employer is about to hand them out.
   */
  names?: (string | undefined)[];
  /**
   * The passphrase this session already holds, when it holds one.
   *
   * Step four does this by not rendering its passphrase block while a workbook
   * is open, and step five asking again in the same breath was the seam an
   * employer walked straight into: file, fund, pay, withhold — all on one
   * passphrase — then be asked to type it a fourth time to hand out the
   * payslips the same run just produced.
   *
   * Read on every render rather than seeded into state, so a passphrase typed
   * AFTER this mounts still reaches it. Empty or absent — the reload case — and
   * the field comes back, because then it genuinely is the only way in.
   */
  sessionPassphrase?: string;
}) {
  const [period, setPeriod] = useState<number | null>(periods[0] ?? null);
  const [typed, setTyped] = useState("");
  const inherited = (sessionPassphrase ?? "").length > 0;
  const passphrase = inherited ? sessionPassphrase! : typed;
  const setPassphrase = setTyped;
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slips, setSlips] = useState<Payslip[] | null>(null);
  const [unsealed, setUnsealed] = useState<number[]>([]);

  if (periods.length === 0) return null;

  async function run() {
    if (period === null || !passphrase) return;
    setBusy(true);
    setError(null);
    setSlips(null);
    try {
      const result = await recoverPayslips({
        networkId,
        contractAddress,
        period,
        passphrase,
      });
      // Names from the workbook if one is open, otherwise recognised from what
      // this browser remembers — so a payslip recovered on the History page
      // reads the same as one recovered beside the roster.
      const bySlot = names
        ? Object.fromEntries(names.map((name, slot) => [slot, name]).filter(([, n]) => n))
        : await namesBySlot(networkId, contractAddress, period!);
      setSlips(
        result.payslips.map((slip) => ({
          ...slip,
          employee: slip.employee ?? (bySlot as Record<number, string>)[slip.slot],
        }))
      );
      setUnsealed(result.unsealed);
      // Held no longer than the derivation needs it.
      setPassphrase("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const body = (
    <>

      {/* One row, read left to right: which month, the passphrase that opens
          it, and the act. It was a select, a password box and a button in a
          generic action row, which said "three controls" rather than "one
          thing to do". */}
      <div className="payslip-row">
        <label className="settle-field period">
          <span>Period</span>
          <select
          value={period ?? ""}
          disabled={busy}
          onChange={(event) => {
            setPeriod(Number(event.target.value));
            setSlips(null);
            setError(null);
          }}
        >
            {periods.map((value) => (
              <option key={value} value={value}>
                {periodName(value)}
              </option>
            ))}
          </select>
        </label>

        {/* Hidden, not disabled-and-filled. A password box showing dots the
            employer did not just type invites them to clear it and start over,
            which is the opposite of the point. */}
        {inherited ? null : (
          <label className="settle-field passphrase">
            <span>Payroll passphrase</span>
            <input
              type="password"
              value={passphrase}
              disabled={busy}
              placeholder="Enter payroll passphrase"
              autoComplete="off"
              onChange={(event) => setPassphrase(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void run();
              }}
            />
          </label>
        )}

        <button
          type="button"
          className="button primary payslip-go"
          disabled={busy || !passphrase || period === null}
          onClick={() => void run()}
        >
          {busy ? "Opening…" : "Get payslips"}
        </button>
      </div>

      {/* The instruction, and then the reason it is slow — which is a fact
          about PBKDF2 rather than about payslips, so it folds away. Explaining
          the derivation on every render is the page talking about itself. */}
      {inherited ? (
        <p className="note">
          Rebuilt from the sealed openings on chain, using the passphrase this
          session already has.
        </p>
      ) : null}
      <details className="details">
        <summary>Why this takes a moment</summary>
        <p className="note">
          The key is derived from the passphrase deliberately slowly, so a
          guessed passphrase costs the guesser the same wait it costs you. The
          openings are sealed under that key and nothing else can open them —
          which is also why a forgotten passphrase cannot be reset.
        </p>
        <p className="note">
          Rebuilt from the openings your filing sealed on chain — no
          transaction, and nothing here disturbs a period that has already been
          paid. Use this rather than re-filing a month: re-filing replaces its
          commitments and marks every employee unpaid.
        </p>
      </details>

      {error ? <p className="status error">{error}</p> : null}

      {slips ? (
        slips.length > 0 ? (
          <>
            <Payslips slips={slips} />
            {unsealed.length > 0 ? (
              <p className="note">
                No opening was sealed for{" "}
                {unsealed.map((slot) => `employee ${slot + 1}`).join(", ")} — that
                period predates sealed openings, so those payslips cannot be
                rebuilt from the chain.
              </p>
            ) : null}
          </>
        ) : (
          <p className="note">
            Nothing to rebuild: no sealed openings exist for that period.
          </p>
        )
      ) : null}
    </>
  );

  return bare ? (
    body
  ) : (
    /* The tinted panel this page's other half deliberately is not.
       "Filed payroll periods" is the public record — what the chain holds about
       every month. This is the private half: the documents only the employer
       can produce, from openings nothing else can read. A grey pill made the
       most distinctive thing on the page look like a utility parked underneath
       the real content. */
    <section className="payslip-zone">
      <div className="band-head">
        <div>
          <h2 className="section-title">Payslips</h2>
          <p className="band-sub">
            Retrieve private payslips for a filed payroll period.
          </p>
        </div>
        <span className="privacy-cue">
          <span aria-hidden="true">🔒</span> Sealed on chain — only this
          passphrase opens them
        </span>
      </div>
      {body}
    </section>
  );
}

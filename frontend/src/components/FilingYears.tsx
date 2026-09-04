// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { platformActions } from "../lib/origin";
import { readTaxRules, type ContractWindow } from "../lib/taxRules";
import { useServiceJob } from "../lib/useServiceJob";

interface OpenYearResult {
  year: number;
  contractAddress: string;
  recorded: number[];
  already: number[];
  txHash: string | null;
}

/** How much of a year a contract holds: 0, 12, or something in between. */
function monthsOpen(window: ContractWindow | null, year: number): number {
  if (!window) return 0;
  return window.months.filter((period) => Math.floor(period / 100) === year).length;
}

/** "payroll:acme" -> "acme"; the base contract has no instance. */
function instanceOf(label: string): string | undefined {
  const colon = label.indexOf(":");
  return colon === -1 ? undefined : label.slice(colon + 1);
}

/**
 * Which years to show: what is on chain, plus the near future.
 *
 * The past is included because a year already open is the answer to "did I do
 * this?", and a card that only ever lists work outstanding cannot answer it.
 */
function yearsToShow(window: ContractWindow | null, now: number): number[] {
  const onChain = new Set((window?.months ?? []).map((p) => Math.floor(p / 100)));
  const years = new Set([...onChain, now - 1, now, now + 1, now + 2]);
  return [...years].sort((a, b) => a - b).slice(-6);
}

/**
 * The years this deployment can file, and the one control that opens another.
 *
 * The employer cannot do this — the circuit is platform-gated — and until a
 * year is opened, every month of it is refused with an error about a rule set
 * they have never heard of. It was a terminal command; on 1 January that is the
 * wrong place for it.
 *
 * Shown as a card per year rather than a button and a sentence, because the
 * question is not "open a year" but "which years are open" — a disabled button
 * next to a green line answered it only if you read the line. State first,
 * action second.
 *
 * There is no close. A month's rule set is written once and the contract has no
 * circuit that removes one, which is the property the whole registry exists for:
 * the rules a period was filed under cannot be revised afterwards.
 */
export function FilingYears({ networkId }: { networkId: string }) {
  const [windows, setWindows] = useState<ContractWindow[] | null>(null);
  const [target, setTarget] = useState<string | null>(null);
  const [custom, setCustom] = useState<string | null>(null);
  const { job, submitting, start, unavailable } =
    useServiceJob<OpenYearResult>("/api/payroll/open-year");

  const done = job?.status === "done";
  const now = new Date().getUTCFullYear();

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const rules = await readTaxRules(networkId);
        if (cancelled) return;
        setWindows(rules.windows);
        setTarget((current) => current ?? rules.windows[0]?.label ?? null);
      } catch {
        // A failed read leaves the card without state to show, not without
        // function: opening a year is still the same call.
        if (!cancelled) setWindows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [networkId, done]);

  const chosen = useMemo(
    () => windows?.find((w) => w.label === target) ?? null,
    [windows, target]
  );
  const years = useMemo(() => yearsToShow(chosen, now), [chosen, now]);

  const open = (year: number) =>
    void start({
      year,
      instance: chosen ? instanceOf(chosen.label) : undefined,
    });

  /**
   * Whether this page can OPEN a year, as opposed to report on one.
   *
   * Only the action needs the platform key. Which years are open is public
   * on-chain state and belongs on every copy of this page — gating the whole
   * card on this left the hosted site with an explanatory note where the
   * readout should have been, and no way to see what was open at all.
   */
  const canOpen = platformActions;

  const customYear = Number(custom);
  const customValid =
    custom !== null &&
    Number.isInteger(customYear) &&
    customYear >= 2000 &&
    customYear <= 2999 &&
    monthsOpen(chosen, customYear) < 12;

  return (
    <div className="filing-years">
      <div className="band-head">
        <div>
          <h2 className="eyebrow">Filing years</h2>
          <p className="band-sub">
            Open a year once its schedule is decided — a month's rules are written
            once and cannot be changed afterwards.
          </p>
        </div>
        <div className="band-head-actions">
          {windows && windows.length > 1 ? (
            <select
              className="year-contract"
              value={target ?? ""}
              onChange={(e) => setTarget(e.target.value)}
              disabled={submitting}
            >
              {windows.map((w) => (
                <option key={w.label} value={w.label}>
                  {w.label}
                </option>
              ))}
            </select>
          ) : null}
          {canOpen ? (
            <button
              type="button"
              className="button secondary compact"
              onClick={() => setCustom((c) => (c === null ? String(now + 1) : null))}
              disabled={submitting}
            >
              {custom === null ? "+ Open new year" : "Cancel"}
            </button>
          ) : null}
        </div>
      </div>

      {canOpen && custom !== null ? (
        <div className="year-custom">
          <span className="try-input">
            <input
              inputMode="numeric"
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 4))}
              aria-label="Calendar year to open"
              disabled={submitting}
            />
            <span className="try-pencil" aria-hidden="true">✎</span>
          </span>
          <button
            className="button compact"
            disabled={!customValid || submitting}
            onClick={() => open(customYear)}
          >
            {submitting ? "Opening…" : `Open ${custom || "…"}`}
          </button>
          {custom !== "" && !customValid ? (
            <span className="note" style={{ margin: 0 }}>
              {monthsOpen(chosen, customYear) === 12
                ? "That year is already open."
                : "A year is four digits, 2000–2999."}
            </span>
          ) : null}
        </div>
      ) : null}

      {chosen === null ? (
        <p className="note">No payroll contract on this network to open a year on.</p>
      ) : (
        <div className="year-grid">
          {years.map((year) => {
            const count = monthsOpen(chosen, year);
            const full = count === 12;
            const state = full ? "open" : count > 0 ? "partial" : "shut";
            return (
              <article key={year} className={`year-card ${state}`}>
                <div className="year-card-head">
                  <span className="year-number">{year}</span>
                  {year === now ? <span className="badge">Current</span> : null}
                </div>
                <p className="year-range">1 Jan – 31 Dec {year}</p>
                {full ? (
                  <p className="year-state ok">
                    ✓ Open on chain <span>12 months under the published schedule</span>
                  </p>
                ) : count > 0 ? (
                  <p className="year-state partial">
                    ◐ Partly open <span>{count} of 12 months</span>
                  </p>
                ) : (
                  <p className="year-state shut">
                    Not open <span>no month can be filed</span>
                  </p>
                )}
                {full ? (
                  <Link className="year-link" to="/app/rules">
                    View tax parameters →
                  </Link>
                ) : canOpen ? (
                  <button
                    className="button compact"
                    disabled={submitting}
                    onClick={() => open(year)}
                  >
                    {submitting ? "Opening…" : `Open ${year}`}
                  </button>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      {canOpen ? null : (
        <p className="note">
          This is the published state, readable by anyone. Opening a year is the
          platform's act and needs its key, which lives in the local service —
          run <code>npm run server</code> and open this page from there, or from
          a terminal <code>YEARS={now + 1} npm run deploy:tax</code>.
        </p>
      )}

      {unavailable ? (
        <p className="status error">
          The local service is not reachable — start it with <code>npm run server</code>.
        </p>
      ) : null}

      {job ? (
        <div className="job-log">
          {job.log.map((line, i) => (
            <p key={i} className="status">
              {line}
            </p>
          ))}
          {job.status === "failed" ? <p className="status error">{job.error}</p> : null}
          {job.status === "done" ? (
            <p className="ok-line">
              ✓ {job.result.year}{" "}
              {job.result.recorded.length > 0
                ? `opened — ${job.result.recorded.length} month(s) recorded`
                : "was already open"}
              {job.result.txHash ? `, tx ${job.result.txHash.slice(0, 16)}…` : ""}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

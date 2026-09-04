// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Where an employer is in this month's payroll, and what each step costs.
 *
 * A status strip, not a wizard. The controls stay in `RosterUpload` below it —
 * decomposing that component into four pieces would move a lot of working code
 * to gain a border. What this adds is the thing that was missing: an employer
 * never had to work out where they were, because nothing told them.
 *
 * Two of the four states come from the chain and survive a reload — filed is
 * `commitmentsFor`, paid is every slot in `paidFor`. The other two cannot:
 * whether a workbook is open is session state, and **whether payslips were sent
 * is not recorded anywhere at all.** Step four therefore never completes, and
 * that is deliberate rather than unfinished — nothing on chain or in this app
 * knows that a file reached a person, so a tick there would be a claim the
 * system cannot support.
 */
import { useState } from "react";
import { Link } from "react-router-dom";

export type StepState = "done" | "now" | "todo";

export interface MonthStep {
  title: string;
  detail: string;
  /** What it costs, shown before the spinner rather than after. */
  cost: string;
  state: StepState;
  /**
   * Shown under a completed step — the filename, the totals, who gets paid.
   *
   * A node rather than a string because step one collapses the moment a
   * workbook is loaded, so this line is the ONLY thing visible between loading
   * and filing. A summary that can only be prose cannot name the wallets, and
   * naming them is the difference between finding a wrong payee now and finding
   * it after payday, when the coins are already spent.
   */
  result?: React.ReactNode;
  /**
   * The control for this step, rendered inside it.
   *
   * The strip used to describe the month while a separate panel below performed
   * it, which meant the page explained filing twice in two different
   * structures — and step one had no button at all. A step that says what to do
   * and cannot do it is a caption, not a step.
   */
  action?: React.ReactNode;
  /**
   * What the disclosure on a COMPLETED step is called.
   *
   * Defaults to "Correct this", which is right for a step whose action would
   * redo chain work — re-filing, re-paying — and wrong for step one. Loading the
   * workbook again is not a correction: it is the PREREQUISITE for funding,
   * paying and payslips, because salaries live in the file and never on chain.
   * With one hardcoded label, the only route to funding an unpaid month was a
   * button named after the most destructive thing any step could do, and the
   * sentence explaining that was hidden behind it.
   */
  redoLabel?: string;
}

export function MonthSteps({ steps }: { steps: MonthStep[] }) {
  return (
    <>
      <StepStrip steps={steps} />
      <ol className="month-steps">
        {steps.map((step, index) => (
          <MonthStepRow key={step.title} step={step} index={index} />
        ))}
      </ol>
    </>
  );
}

/**
 * The whole month on one line, above the steps themselves.
 *
 * The list below already collapses a finished step to a row, which was the
 * right fix for "the riskiest button is the most prominent one" and did nothing
 * for the question asked first: how far through am I. Five collapsed rows still
 * have to be read one at a time to answer it.
 *
 * So the shape of the month comes first and the detail second. The titles are
 * shortened here — "Load this month's figures" becomes "Figures" — because this
 * is a position indicator, not a second set of instructions, and the full title
 * is one line down.
 */
function StepStrip({ steps }: { steps: MonthStep[] }) {
  return (
    <ol className="step-strip">
      {steps.map((step, index) => (
        <li key={step.title} className={`step-pip ${step.state}`}>
          <span className="step-pip-n">{step.state === "done" ? "✓" : index + 1}</span>
          <span className="step-pip-t">{shortTitle(step.title)}</span>
        </li>
      ))}
    </ol>
  );
}

/**
 * A step's name at strip length.
 *
 * Matched on the distinguishing word rather than by index, because the list is
 * not fixed: the withholding-repair step only appears when a period was funded
 * the old way, so position 4 is not always the same step. An unmatched title
 * falls back to its first two words rather than to a number.
 */
function shortTitle(title: string): string {
  const rules: [RegExp, string][] = [
    [/^Load/, "Figures"],
    [/^File/, "Filed"],
    [/^Fund and pay/, "Paid"],
    [/^Move withholding/, "Withheld"],
    [/withholding to the treasuries/, "Remitted"],
    [/^Send payslips/, "Payslips"],
  ];
  for (const [pattern, short] of rules) if (pattern.test(title)) return short;
  return title.split(" ").slice(0, 2).join(" ");
}

/**
 * A finished step collapses to one line.
 *
 * Leaving every step's controls live once the month was done meant an employer
 * could not tell whether they were mid-flow or finished — and the most
 * prominent thing still on offer was **Re-file**, which replaces the month's
 * commitments and marks everyone unpaid. The riskiest button on the page was
 * being presented as the natural next step.
 *
 * Correcting a filed month is a real need, so it is not removed: it is one
 * disclosure away, which is the difference between available and suggested.
 */
function MonthStepRow({ step, index }: { step: MonthStep; index: number }) {
  const [correcting, setCorrecting] = useState(false);
  const collapsed = step.state === "done" && !correcting;

  return (
    <li className={`month-step ${step.state}${collapsed ? " collapsed" : ""}`}>
      <span className="month-step-n">{step.state === "done" ? "✓" : index + 1}</span>
      <div className="month-step-main">
        <div className="month-step-t">{step.title}</div>
        {collapsed ? (
          <>
            <div className="month-step-result">{step.result ?? "Done"}</div>
            {step.action ? (
              <button
                type="button"
                className="ghost month-step-redo"
                onClick={() => setCorrecting(true)}
              >
                {step.redoLabel ?? "Correct this"}
              </button>
            ) : null}
          </>
        ) : (
          <>
            <div className="month-step-d">{step.detail}</div>
            {step.result ? <div className="month-step-result">{step.result}</div> : null}
            {step.action ? <div className="month-step-action">{step.action}</div> : null}
            <div className="month-step-cost">{step.cost}</div>
            {step.state === "done" && correcting ? (
              <button
                type="button"
                className="ghost month-step-redo"
                onClick={() => setCorrecting(false)}
              >
                Never mind
              </button>
            ) : null}
          </>
        )}
      </div>
    </li>
  );
}

export interface Prereq {
  label: string;
  ok: boolean;
  /** Why it is not satisfied. Shown on hover, so the chip stays one line. */
  detail?: string;
  /**
   * Where the missing thing is obtained.
   *
   * A prerequisite that reports a shortfall and offers no route to fixing it
   * leaves someone to guess which tab holds the answer — and the answer to "no
   * pEUR" is on a different page from the one reporting it.
   */
  action?: { to: string; label: string };
}

/**
 * The conditions a month's payroll needs, checked before it is attempted.
 *
 * Each of these otherwise fails part way through a transaction, which is the
 * worst place to discover them: proving has already run, the wallet has already
 * asked, and the error names a balancer rather than the thing that is missing.
 */
export function Prereqs({ items }: { items: Prereq[] }) {
  return (
    <div className="prereqs">
      {items.map((item) => (
        <span
          key={item.label}
          className={item.ok ? "chip-pre ok" : "chip-pre no"}
          title={item.detail}
        >
          {item.ok ? "✓" : "!"} {item.label}
          {item.action ? (
            <Link className="chip-action" to={item.action.to}>
              {item.action.label} →
            </Link>
          ) : null}
        </span>
      ))}
    </div>
  );
}

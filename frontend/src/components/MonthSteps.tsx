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

export type StepState = "done" | "now" | "todo";

export interface MonthStep {
  title: string;
  detail: string;
  /** What it costs, shown before the spinner rather than after. */
  cost: string;
  state: StepState;
  /** Shown under a completed step — the filename, the totals. */
  result?: string | null;
  /**
   * The control for this step, rendered inside it.
   *
   * The strip used to describe the month while a separate panel below performed
   * it, which meant the page explained filing twice in two different
   * structures — and step one had no button at all. A step that says what to do
   * and cannot do it is a caption, not a step.
   */
  action?: React.ReactNode;
}

export function MonthSteps({ steps }: { steps: MonthStep[] }) {
  return (
    <ol className="month-steps">
      {steps.map((step, index) => (
        <MonthStepRow key={step.title} step={step} index={index} />
      ))}
    </ol>
  );
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
                Correct this
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
        </span>
      ))}
    </div>
  );
}

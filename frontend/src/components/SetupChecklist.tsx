// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { Link } from "react-router-dom";

/**
 * Setup as a status readout, not a set of instructions.
 *
 * This lives on Payroll, which is a workspace permanently — before setup is
 * finished it reports how far along you are, and afterwards it reports payroll.
 * The full instructions live on Setup, which is the navigation item for them;
 * three large explanatory cards on Payroll duplicated that tab and made the
 * page look like a wizard it is not.
 *
 * Note what the third step is and is not. Adding employees is an ongoing
 * business operation — people join and leave — so the roster is not
 * configuration. What belongs to onboarding is the *first* employee, because
 * that is the last thing standing between an employer and a payroll run.
 *
 * Step three is marked done by a filed period, which is the only on-chain
 * evidence a roster was ever assembled — nothing here stores an employee
 * record. Step four needs that period fully settled, so the two do not tick at
 * the same moment.
 */
export interface SetupState {
  registered: boolean;
  contract: boolean;
  employees: boolean;
  settled: boolean;
}

/**
 * Four steps, mapping onto the tabs: Settings, Settings, Payroll, Payroll.
 * Step three used to say "import your roster and file a period for it", which
 * described two stages in one line and undid the separation the pages exist to
 * draw. Adding a person and paying them are different acts.
 */
const STEPS: { title: string; blurb: string; to: string }[] = [
  {
    // "Register organization" with a tick beside it, for any connected wallet,
    // told an employee's wallet it had registered as an employer. The flag
    // behind it only ever meant "a wallet is connected", so the label now says
    // that and registration moved to step two, where the on-chain evidence is.
    title: "Connect a wallet",
    blurb: "Any Midnight wallet. This key becomes your organization's signing key.",
    to: "/employer/settings",
  },
  {
    title: "Register and receive a payroll contract",
    blurb: "The platform deploys one and assigns your key as its employer.",
    to: "/employer/settings",
  },
  {
    title: "Add first employee",
    blurb: "Create or import your private employee roster.",
    // Payroll, where RosterUpload is. Employees shows who is ON the payroll,
    // which is assembled from a filed period — so sending someone there to add
    // their first employee pointed at a page that could only ever say "none
    // yet", and whose own button pointed back here.
    to: "/employer",
  },
  {
    // Payroll, not History. This pointed at the read-only record of past
    // periods — a page whose only message to a new employer is "no periods
    // filed yet", with nothing to press. Running one happens on Payroll.
    title: "Run first payroll",
    blurb: "File and settle your first private payroll period.",
    to: "/employer",
  },
];

export function SetupChecklist({ state }: { state: SetupState }) {
  const done = [state.registered, state.contract, state.employees, state.settled];
  const complete = done.every(Boolean);
  // The first unfinished step is where "continue" should land.
  const next = done.findIndex((d) => !d);

  return (
    <section className="card">
      <h2>Setup</h2>
      <ol className="checklist">
        {STEPS.map((step, i) => (
          <li key={step.title} className={done[i] ? "done" : next === i ? "next" : undefined}>
            <span className="check">{done[i] ? "✓" : "○"}</span>
            <span className="n">{i + 1}</span>
            <div>
              <strong>{step.title}</strong>
              <p className="note" style={{ margin: "2px 0 0" }}>
                {step.blurb}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {complete ? null : (
        <div className="actions">
          <Link className="button" to={STEPS[next]!.to}>
            {next === 3 ? "Run first payroll" : "Continue setup"}
          </Link>
        </div>
      )}
    </section>
  );
}

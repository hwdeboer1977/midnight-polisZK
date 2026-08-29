import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { DashHero, type DashMetric } from "../components/DashHero";
import { Prereqs } from "../components/MonthSteps";
import { RosterUpload } from "../components/RosterUpload";
import { SetupChecklist } from "../components/SetupChecklist";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { periodName, type ParsedRoster } from "../generated/roster";
import { collectionStatus } from "../lib/collected";
import { bytesToHex as hex } from "../lib/keys";
import { formatPeur, formatPeurTile, group } from "../lib/format";
import { DUTCH_V1, computeLine } from "../generated/tax-params";
import { useRegistrations } from "../lib/useRegistrations";
import { usePayrollInstances } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/**
 * The employer's dashboard, permanently.
 *
 * It used to become a setup wizard before registration, which duplicated the
 * Setup tab sitting right beside it in the navigation. Now it answers one
 * question in both states — what is happening? — and before setup is complete
 * the answer is simply how far along you are.
 */
export function EmployerPayroll() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});
  const [read, setRead] = useState(false);

  useEffect(() => {
    void loadDeployments().then((loaded) => {
      setDeployments(loaded);
      setRead(true);
    });
  }, []);

  const { instances, loading, refresh } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );

  /** The workbook open in `RosterUpload` below, if one is. */
  const [roster, setRoster] = useState<ParsedRoster | null>(null);

  const mine = instances.filter((instance) => instance.role === "employer");
  const checking = !read || loading;
  const instance = mine[0] ?? null;
  const state = instance?.state ?? null;

  const periods = state
    ? [...state.periods].sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    : [];
  const latest = state && state.latestPeriod > 0n ? state.latestPeriod : null;

  const countFor = (period: bigint) =>
    state?.employeeCountFor.member(period) ? Number(state.employeeCountFor.lookup(period)) : 0;
  const columnFor = (
    map: { member(k: bigint): boolean; lookup(k: bigint): bigint } | undefined,
    period: bigint
  ) => (map?.member(period) ? map.lookup(period) : 0n);
  const grossFor = (period: bigint) => columnFor(state?.totalPayrollFor, period);
  const paidCount = (period: bigint) => {
    if (!state?.paidFor.member(period)) return 0;
    const flags = state.paidFor.lookup(period);
    let n = 0;
    for (let i = 0; i < countFor(period); i += 1) {
      if (flags.member(BigInt(i)) && flags.lookup(BigInt(i))) n += 1;
    }
    return n;
  };

  const grossFiled = periods.reduce((sum, period) => sum + grossFor(period), 0n);

  // The month the stepper is about: whichever workbook is open, falling back to
  // the last one filed. The page has no opinion of its own about which month it
  // is — that comes from the sheet, and inventing "this month" here would let
  // the header and the workbook disagree.
  //
  // When the last filed month is finished, the open month is the next one — a
  // header reading "January 2026, filed and settled" above four unticked steps
  // told an employer nothing about whether they had work to do. Finished means
  // filed, paid AND withheld: withholding is part of a month, so a month with
  // its pools still empty is not done.
  const nextAfter = (period: number): number => {
    const month = period % 100;
    return month >= 12 ? (Math.floor(period / 100) + 1) * 100 + 1 : period + 1;
  };
  const completed = (period: bigint): boolean =>
    state?.commitmentsFor.member(period) === true &&
    countFor(period) > 0 &&
    paidCount(period) === countFor(period) &&
    state?.withheldFor?.member(period) === true &&
    state.withheldFor.lookup(period) === true;

  const latestDone = latest !== null && completed(latest);
  const loadedPeriod =
    roster?.period ?? (latest ? (latestDone ? nextAfter(Number(latest)) : Number(latest)) : null);
  const loadedKey = loadedPeriod === null ? null : BigInt(loadedPeriod);
  const filedLoaded = loadedKey !== null && state?.commitmentsFor.member(loadedKey) === true;
  const withheldLoaded =
    loadedKey !== null &&
    state?.withheldFor?.member(loadedKey) === true &&
    state.withheldFor.lookup(loadedKey) === true;
  const paidLoaded =
    loadedKey !== null &&
    filedLoaded &&
    countFor(loadedKey) > 0 &&
    paidCount(loadedKey) === countFor(loadedKey);

  // What paying this month will move out of the employer's wallet.
  //
  // The NET, not the gross: funding puts one coin per employee carrying exactly
  // that employee's committed net, and the withheld tax and contribution never
  // leave. Taken from the chain once a period is filed, and computed from the
  // workbook before that — the same arithmetic the circuit will redo, so the
  // figure shown is the figure that will be required.
  const netNeeded: bigint | null = (() => {
    if (loadedKey !== null && filedLoaded && state?.totalNetFor?.member(loadedKey)) {
      return state.totalNetFor.lookup(loadedKey);
    }
    if (!roster) return null;
    return roster.rows.reduce(
      (sum, row) => sum + computeLine(row.salaryMinor, DUTCH_V1).netMinor,
      0n
    );
  })();

  const peurTokenId = Object.values(deployments).find(
    (d) => d.contractName === "peur" && d.networkId === networkId
  )?.tokenId;
  const peurHeld =
    account && peurTokenId
      ? Object.entries(account.shieldedBalances).find(([type]) =>
          type.endsWith(peurTokenId)
        )?.[1] ?? 0n
      : null;
  const shortBy =
    netNeeded !== null && peurHeld !== null && peurHeld < netNeeded
      ? netNeeded - peurHeld
      : 0n;

  // Everything a month needs that otherwise fails part way through a
  // transaction — which is the worst place to find out, because proving has
  // already run and the error names a balancer rather than the thing missing.
  const prereqs = [
    { label: `Wallet on ${networkId}`, ok: Boolean(account) },
    {
      label: account && account.dust.balance > 0n ? "Network fuel" : "No tDUST",
      ok: Boolean(account && account.dust.balance > 0n),
      detail:
        account && account.dust.balance > 0n
          ? undefined
          : "Fees are paid in tDUST. Register tNIGHT for DUST generation, or nothing will submit.",
    },
    // Only meaningful once there is a figure to compare against, and pointless
    // once the month is paid — the money has already moved.
    ...(netNeeded !== null && !paidLoaded && !latestDone
      ? [
          {
            label:
              peurHeld === null
                ? "pEUR balance unknown"
                : shortBy > 0n
                  ? `pEUR €${formatPeurTile(shortBy)} short`
                  : "pEUR covers this month",
            ok: peurHeld !== null && shortBy === 0n,
            detail:
              peurHeld === null
                ? "No pEUR deployment recorded for this network, so the balance cannot be checked."
                : shortBy > 0n
                  ? `Paying ${periodName(loadedPeriod!)} moves €${formatPeur(netNeeded)} of net pay out of your wallet, and it holds €${formatPeur(peurHeld)}. Funding fails part way through without this.`
                  : `Holds €${formatPeur(peurHeld)}, needs €${formatPeur(netNeeded)}.`,
          },
        ]
      : []),
    // Always present once a balance can be read, so the absence of a warning is
    // itself information. It used to vanish whenever there was no figure to
    // compare against, which is precisely when an employer is about to load a
    // workbook and find out the hard way.
    ...(peurHeld !== null && (netNeeded === null || paidLoaded || latestDone)
      ? [
          {
            label: `pEUR €${formatPeurTile(peurHeld)}`,
            ok: true,
            detail: "What this wallet holds. A month's net pay comes out of it.",
          },
        ]
      : []),
    {
      label: "Proving available",
      ok: true,
      detail:
        "Either your wallet proves in the tab, or the local proof server on :6300 does.",
    },
  ];
  const settledPeriods = periods.filter(
    (period) => countFor(period) > 0 && paidCount(period) === countFor(period)
  ).length;

  // The same flags the navigation locks on, so a tab and this checklist can
  // never disagree about where an employer is.
  const setup = {
    registered: Boolean(account),
    contract: mine.length > 0,
    employees: periods.length > 0,
    settled: settledPeriods > 0,
  };
  // The dashboard replaces the checklist once a first payroll has settled —
  // before that there is nothing for it to report but zeroes.
  const ready = setup.registered && setup.contract && setup.employees;

  /**
   * Who is on the payroll and what it costs, for the month on screen.
   *
   * Read from the chain once the period is filed and from the workbook before
   * that. Both are the same figures — the circuit recomputes the second into the
   * first — so the header does not change meaning when the month is filed, it
   * only stops depending on a file being open.
   */
  const headcount =
    loadedKey !== null && countFor(loadedKey) > 0
      ? countFor(loadedKey)
      : (roster?.rows.length ?? 0);
  const monthGross =
    loadedKey !== null && filedLoaded
      ? grossFor(loadedKey)
      : (roster?.totalMinor ?? null);

  /**
   * How many people still owe a claim-key hash.
   *
   * Can only UNDERCOUNT — a workbook loaded on another machine is not in this
   * browser's record — which is the right direction for a reminder to be wrong
   * in. `null` from `collectionStatus` means no workbook is open, and that is
   * reported as nothing outstanding rather than as everyone outstanding: a
   * page with no roster loaded knows nothing, and guessing would put a warning
   * in front of an employer who has done everything.
   */
  const claimStatus = (() => {
    if (!instance) return { missing: 0 };
    const status = collectionStatus(
      instance.deployment.contractAddress,
      roster?.rows ?? null
    );
    return { missing: status.total === null ? 0 : status.missing.length };
  })();

  /**
   * What to call this employer, if anything.
   *
   * The registry knows the company name and the chain does not — it records a
   * key, never a company — so this is the platform's label rather than a fact
   * the contract carries. Absent on a contract assigned outside the signup
   * flow, and absent is fine: the header simply drops the dash.
   */
  const { registrations } = useRegistrations(networkId);
  const companyName = instance
    ? (registrations ?? []).find(
        (row) =>
          row.contractAddress.toLowerCase() ===
          instance.deployment.contractAddress.toLowerCase()
      )?.companyName ??
      instance.deployment.instance ??
      null
    : null;

  /** The hero's four figures: who, how much, which month, and is it done. */
  const monthMetrics = (): DashMetric[] => {
    const settled = filedLoaded && paidLoaded && withheldLoaded;
    return [
      {
        value: headcount > 0 ? group(BigInt(headcount)) : "—",
        label: headcount === 1 ? "Employee" : "Employees",
        note: loadedKey !== null && countFor(loadedKey) > 0 ? "on this period" : "in the workbook",
      },
      {
        value: monthGross === null ? "—" : `€${formatPeurTile(monthGross)}`,
        exact: monthGross === null ? undefined : `Exactly €${formatPeur(monthGross)}`,
        label: "Gross payroll",
        note: filedLoaded ? "filed on chain" : "from the workbook, not yet filed",
      },
      {
        value: loadedPeriod ? periodName(loadedPeriod) : "—",
        label: "Current period",
        note: latestDone && !roster ? "next month — the last one is done" : "the month in progress",
      },
      {
        value: settled ? "✓ Settled" : filedLoaded ? (paidLoaded ? "Withholding" : "Unpaid") : "Not filed",
        label: "Payroll status",
        note: settled
          ? "filed, paid and withheld"
          : !loadedPeriod
            ? "load a workbook to begin"
            : filedLoaded
              ? paidLoaded
                ? "withholding still to send"
                : "filed, not yet paid"
              : "nothing filed for this month",
        attention: Boolean(loadedPeriod) && !settled,
      },
    ];
  };

  return (
    <>
      <DashHero
        // The company, when there is a name for one. `deployment.instance` is
        // undefined on the base `payroll` deployment — onboarding stopped
        // deploying per company — and stripping "payroll" off the name then
        // leaves an empty string, so the header rendered "EMPLOYER —" with
        // nothing after the dash. A missing name is now no dash rather than a
        // dangling one.
        eyebrow={`Employer${companyName ? ` — ${companyName.toUpperCase()}` : ""}`}
        title={
          ready && instance
            ? "Run private payroll and manage employee records."
            : "Complete your setup to run your first private payroll."
        }
        // Only once there is a contract to report on. Four dashes above a setup
        // checklist is a dashboard for a system that does not exist yet.
        metrics={instance ? monthMetrics() : undefined}
      />

      {checking && account ? <p className="muted">Reading your contract…</p> : null}

      {/* A CONTRACT, not a filed period.
          
          This was `ready && latest`, and `ready` includes
          `employees: periods.length > 0` — a filed period. So the block
          containing RosterUpload, the only way to file a period, required a
          filed period to appear. A newly onboarded employer got a checklist
          saying "add first employee", a button to Roster, and no upload on
          either page: you could not file a first period until you had filed a
          first period.
          
          The confusion underneath is that "employees" here never meant
          employees. Nothing stores an employee record — a filed period is the
          only on-chain evidence a roster was ever assembled — so the flag is
          named for the thing it stands in for rather than the thing it checks.
          That is fine as a CHECKLIST signal and wrong as a gate on the tool.
          
          `latest` is no longer required either: every use of it inside is
          already behind `latestDone`, which is false when there is none. */}
      {instance ? (
        <>
          {/* What used to be a four-item "Set up once" strip, and before that a
              card of four rows.
              
              Company and payroll key are answered by a contract existing at
              all — restating them above the month's work said an employer was
              still being configured every month for the life of the account,
              which is how a working product comes to feel half-built. Employee
              keys and claim-key hashes moved to Employees, where they belong:
              both are facts about people rather than steps in configuring a
              company.
              
              What survives is the one that can block a real operation. A
              missing claim-key hash is unfixable AFTER a termination is
              written, so it is worth a line here — and only when there is one
              to report. */}
          {claimStatus.missing > 0 ? (
            <p className="inline-warn">
              ⚠ {claimStatus.missing}{" "}
              {claimStatus.missing === 1 ? "employee has" : "employees have"} not
              provided a benefit claim key.{" "}
              <Link to="/employer/employees">Review employees →</Link>
            </p>
          ) : null}

          {/* ── Every month ───────────────────────────────────────────────
              The hero workflow, in the tinted zone the design system reserves
              for the thing a page exists to do. It was a white card between two
              other white cards, which made running payroll look like one of
              three equally weighted concerns rather than the concern. */}
          <section className="work-zone">
            {/* The month, and what it costs. The STATUS that used to sit here —
                "withholding outstanding", "filed, not yet paid" — is in the hero
                now, where it is one of four standing figures. Repeating it two
                inches lower said the same thing twice and left no room for the
                thing the header could not answer: how big is this month. */}
            <div className="month-head">
              <h2 style={{ margin: 0 }}>
                {loadedPeriod ? periodName(loadedPeriod) : "No month loaded"}
              </h2>
              {monthGross !== null && headcount > 0 ? (
                <span className="month-sum" title={`Exactly €${formatPeur(monthGross)}`}>
                  €{formatPeurTile(monthGross)} gross · {group(BigInt(headcount))}{" "}
                  {headcount === 1 ? "employee" : "employees"}
                </span>
              ) : null}
            </div>

            {latestDone && !roster ? (
              <p className="note" style={{ marginTop: 0 }}>
                {periodName(Number(latest))} is filed, paid and withheld. This is
                the next month.
              </p>
            ) : null}

            <Prereqs items={prereqs} />

            <RosterUpload
              target={{
                name: instance.name,
                contractAddress: instance.deployment.contractAddress,
                operatorIsEmployer: state
                  ? hex(state.platform.bytes) === hex(state.employer.bytes)
                  : false,
              }}
              onSubmitted={refresh}
              onRoster={setRoster}
              monthState={{ filed: filedLoaded, paid: paidLoaded, withheld: withheldLoaded }}
              openPeriod={loadedPeriod}
            />
          </section>

          <p className="note">
            <Link to="/employer/history">Every period filed, and payslips</Link>
          </p>

          {/* "Someone is leaving" and "Publish claims for this period" were
              here, and both have moved to Employees.
              
              They were never about a payroll period. Ending an employment is an
              act against a PERSON, and it was reachable only from a heading
              that named the occasion rather than the employee — while their
              row, two clicks away, offered nothing. Publishing was worse: it
              was the second half of that same act, presented as a separate
              panel an employer had to know to visit, with a file they had to
              download from one panel and upload into the other. The relay now
              runs from the opening already in memory, as part of ending
              employment, because there was never a decision between the two.
              
              What is left on this page is one month. */}
        </>
      ) : null}

      {/* A connected wallet that controls no payroll contract is the most common
          confusing state here — it is what an employee's wallet looks like on
          this page, and the checklist alone reads as "you are partway through
          setting up" rather than "this is not an employer". Naming the key is
          the part that resolves it: the answer is almost always that a
          different wallet is connected. */}
      {account && !checking && !setup.contract ? (
        <section className="card pending">
          <h2>This wallet is not registered as an employer</h2>
          <p className="note" style={{ marginTop: 0 }}>
            No payroll contract on {networkId} names this key as its employer.
            Every action here is signed, and the contract checks the signer — so
            nothing on this tab will work until a contract is assigned to it.
          </p>
          <CopyRow label="Connected key" value={account.coinPublicKey} />
          <p className="note">
            If your organization is already registered, this is probably a
            different wallet than the one you registered with — switch accounts
            in your extension. If it is an employee's wallet, everything they
            need is on <Link to="/employee">Employee</Link> instead.
          </p>
          <div className="actions">
            <Link className="button" to="/employer/settings">
              Register this key
            </Link>
          </div>
        </section>
      ) : null}

      {/* The dashboard appears as soon as there is a period to report on, and
          the checklist stays until the last step is done — so an employer with a
          filed-but-unsettled period sees both: what they have, and what is left
          to finish. */}
      {setup.settled ? null : <SetupChecklist state={setup} />}

      {!account ? <WalletPicker /> : null}
    </>
  );
}

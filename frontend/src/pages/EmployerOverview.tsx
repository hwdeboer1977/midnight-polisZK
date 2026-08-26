import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { ClaimKeyCollection } from "../components/ClaimKeyCollection";
import { EndEmployment } from "../components/EndEmployment";
import { Prereqs } from "../components/MonthSteps";
import { RosterUpload } from "../components/RosterUpload";
import { SetupChecklist } from "../components/SetupChecklist";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { periodName, type ParsedRoster } from "../generated/roster";
import { bytesToHex as hex } from "../lib/keys";
import { formatPeur, formatPeurTile, group } from "../lib/format";
import { DUTCH_V1, computeLine } from "../generated/tax-params";
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
export function EmployerOverview() {
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

  return (
    <>
      <section className="area-head">
        <h1>
          {ready && instance
            ? instance.deployment.instance ?? instance.name.replace(/^.*payroll:?/, "")
            : "Employer"}
        </h1>
        {ready && instance ? (
          <p className="sub">
            Payroll contract{" "}
            <code title={instance.deployment.contractAddress}>
              {instance.deployment.contractAddress.slice(0, 4)}…
              {instance.deployment.contractAddress.slice(-4)}
            </code>
            {latest ? (
              <>
                {" · "}
                {group(BigInt(countFor(latest)))}{" "}
                {countFor(latest) === 1 ? "employee" : "employees"}
                {" · last filed "}
                {periodName(Number(latest))}
              </>
            ) : null}
          </p>
        ) : (
          <p className="lede">Complete your setup to run your first private payroll.</p>
        )}
      </section>

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
          {/* ── Set up once ────────────────────────────────────────────────
              Only what the chain can actually answer. Collecting employee keys
              and claim-key hashes belongs here too and is not tracked yet —
              adding rows that always read "unknown" would be worse than the
              two honest ones. */}
          <p className="when-label">Set up once</p>
          <section className="card">
            <div className="row">
              <div className="k">Company registered</div>
              <div className="v">
                <span className="ok-line">Done</span>
                <span className="muted"> — your wallet controls this contract</span>
              </div>
            </div>
            <div className="row">
              <div className="k">Payroll passphrase</div>
              <div className="v">
                <span className="ok-line">Chosen</span>
                <span className="muted">
                  {" "}
                  — a filed period proves one exists; it cannot be reset
                </span>
              </div>
            </div>
            <div className="row">
              <div className="k">Employee keys</div>
              <div className="v">
                {roster ? (
                  <span className="ok-line">
                    {roster.rows.filter((r) => r.coinPublicKey && r.encryptionPublicKey).length} of{" "}
                    {roster.rows.length} in the workbook
                  </span>
                ) : (
                  <span className="muted">Load a workbook to check</span>
                )}
              </div>
            </div>

            {/* The one outstanding task an employer cannot discover on their
                own: nothing on chain says whether a claim-key hash has been
                collected, and by the time a termination records one it is too
                late to ask for it. */}
            <ClaimKeyCollection
              contractAddress={instance.deployment.contractAddress}
              rows={roster?.rows ?? null}
            />

            <p className="note">
              <Link to="/employer/setup">Keys, addresses and balances</Link> ·{" "}
              <Link to="/employer/roster">who is on the payroll</Link>
            </p>
          </section>

          {/* ── Every month ─────────────────────────────────────────────── */}
          <p className="when-label">Every month</p>
          <section className="card">
            <div className="month-head">
              <h2 style={{ margin: 0 }}>
                {loadedPeriod ? periodName(loadedPeriod) : "No month loaded"}
              </h2>
              {/* Amber when something is outstanding, and grey only when it is
                  not. "Withholding outstanding" in neutral grey described the
                  very thing keeping the month open — and the same obligation
                  the public page reports as €0.00 collected. A status that
                  needs action should not read like a status that does not. */}
              {/* Finished reads as finished, rather than leaving the styling to
                  carry the whole signal: "withholding outstanding" in amber and
                  "filed, paid and withheld" in grey differed only by colour, so
                  the words said nothing a glance could use. */}
              {loadedPeriod && filedLoaded && paidLoaded && withheldLoaded ? (
                <span className="ok-line">✓ filed, paid and withheld</span>
              ) : (
                <span className={loadedPeriod ? "warn-inline" : "muted"}>
                  {!loadedPeriod
                    ? "load a workbook to begin"
                    : filedLoaded
                      ? paidLoaded
                        ? "withholding outstanding"
                        : "filed, not yet paid"
                      : "not filed yet"}
                </span>
              )}
            </div>

            {latestDone && !roster ? (
              <p className="note" style={{ marginTop: 0 }}>
                {periodName(Number(latest))} is filed, paid and withheld — nothing
                outstanding. This is the next month.
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
            <Link to="/employer/payroll">Every period filed, and payslips</Link>
          </p>

          {/* ── Only when it happens ────────────────────────────────────── */}
          <p className="when-label">Only when it happens</p>
          <details className="details rare">
            <summary>Someone is leaving</summary>
            {/* The warning leads, because the irreversible part is the
                ordering rather than the click: by the time this panel is open,
                a missing claim-key hash is already unfixable. */}
            <p className="problems" style={{ marginTop: 12 }}>
              <strong>Get their claim-key hash first.</strong> The statement you
              sign is write-once and their hash goes inside it — a claim key
              chosen afterwards is one no claim can ever use.
            </p>
            <p className="note">
              You sign one statement naming their final month. It is what stops
              anyone choosing a better month later, and it is the only fact a
              benefit claim needs that your payroll does not already publish.
              You cannot claim against it: that needs their own wallet key.
            </p>
            <EndEmployment
              contractAddress={instance.deployment.contractAddress}
              instance={instance.name.replace(/^payroll:/, "")}
              networkId={networkId}
              periods={periods.map(Number)}
              delegateProving={false}
              roster={roster}
            />
          </details>
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
            <Link className="button" to="/employer/setup">
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

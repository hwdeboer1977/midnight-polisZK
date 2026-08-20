import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { SetupChecklist } from "../components/SetupChecklist";
import { Tile } from "../components/Tile";
import { WalletPicker } from "../components/WalletPicker";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { periodName } from "../generated/roster";
import { formatPeur, group } from "../lib/format";
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

  const { instances, loading } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );

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
  const grossFor = (period: bigint) =>
    state?.totalPayrollFor.member(period) ? state.totalPayrollFor.lookup(period) : 0n;
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
        <h1>Employer overview</h1>
        {ready && instance ? (
          <div className="org">
            <strong>
              {instance.deployment.instance ?? instance.name.replace(/^.*payroll:?/, "")}
            </strong>
            <span className="org-contract">
              Payroll contract{" "}
              <code title={instance.deployment.contractAddress}>
                {instance.deployment.contractAddress.slice(0, 4)}…
                {instance.deployment.contractAddress.slice(-4)}
              </code>{" "}
              <span className="ok-line">✓</span>
            </span>
          </div>
        ) : (
          <p className="lede">Complete your setup to run your first private payroll.</p>
        )}
      </section>

      {checking && account ? <p className="muted">Reading your contract…</p> : null}

      {ready && latest ? (
        <>
          <div className="tiles">
            <Tile label="Employees" value={group(BigInt(countFor(latest)))} unit="on the latest period" />
            <Tile label="Payroll periods" value={group(BigInt(periods.length))} unit="months on chain" />
            <Tile
              label="Gross payroll filed"
              value={`€${formatPeur(grossFiled)}`}
              unit="every period, summed"
              accent
            />
            <Tile
              label="Periods settled"
              value={`${group(BigInt(settledPeriods))} of ${group(BigInt(periods.length))}`}
              unit="every slot in the period paid"
            />
          </div>

          <section className="card">
            <h2>Latest payroll</h2>
            <p className="lead-sm" style={{ margin: "0 0 14px" }}>
              <strong>{periodName(Number(latest))}</strong>{" "}
              {paidCount(latest) === countFor(latest) && countFor(latest) > 0 ? (
                <span className="ok-line">— Settled ✓</span>
              ) : (
                <span className="muted">
                  — {paidCount(latest)} of {countFor(latest)} paid
                </span>
              )}
            </p>

            <div className="row">
              <div className="k">Gross payroll</div>
              <div className="v">€{formatPeur(grossFor(latest))}</div>
            </div>
            <div className="row">
              <div className="k">Employees</div>
              <div className="v">{group(BigInt(countFor(latest)))}</div>
            </div>
            {/* The third line used to be three rows of dashes for figures the
                contract does not carry. This says what the system does instead
                of what it does not — and it is the reason the other two rows are
                the only ones that could ever be public. */}
            <div className="row">
              <div className="k">Privacy</div>
              <div className="v">Individual salaries hidden</div>
            </div>

            <div className="actions" style={{ marginTop: 16 }}>
              <Link className="button" to="/employer/payroll">
                Run new payroll
              </Link>
            </div>
          </section>
        </>
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

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { StageGate } from "../components/StageGate";
import { ROSTER_COLUMNS, ROSTER_SIZE, periodName } from "../generated/roster";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { bytesToHex, keyToHex } from "../lib/keys";
import { collectedFor } from "../lib/collected";
import { fromHex } from "../lib/payslip";
import { loadContract } from "../lib/contracts";
import { usePayrollInstances } from "../lib/usePayrollInstances";
import { useWallet } from "../wallet/WalletContext";

/** Indexed to match ROSTER_COLUMNS, so a column added there fails loudly here. */
const COLUMN_NOTES = [
  " — never leaves your machine.",
  " — never leaves your machine.",
  " — a private circuit input. Only the sum of the column is published.",
  " — published as a hash, so the chain shows a slot has a payee without showing who.",
  " — never reaches the chain at all. It is what the coin's ciphertext is encrypted to.",
];

/**
 * Who works here — employer-private, and deliberately not the same thing as a
 * payroll period.
 *
 * A worker exists across many months; their salary belongs to one of them. Kept
 * together, "roster" and "payroll" blur into each other, and the blur gets
 * worse as a period grows a tax and a contribution figure alongside the salary.
 * So this page answers "who is on the payroll", and the Payroll page answers
 * "what were they paid, this month".
 *
 * Nothing here is public. The chain holds one hash per slot, which proves a
 * period has a payee without naming one.
 */
export function EmployerRoster() {
  const { account, networkId } = useWallet();
  const [deployments, setDeployments] = useState<Deployments>({});

  useEffect(() => {
    void loadDeployments().then(setDeployments);
  }, []);

  const { instances } = usePayrollInstances(
    networkId,
    deployments,
    account?.coinPublicKey ?? null
  );

  const mine = instances.filter((instance) => instance.role === "employer");

  // Hash → name, for whoever this browser has seen on a workbook.
  //
  // The chain publishes `payeeHash(coinPublicKey, period, contract)` and never
  // the key, so a name cannot be recovered — it has to be recognised. Every
  // remembered employee is hashed against every filed period with the
  // contract's own pure circuit, and a match is a person.
  //
  // Above the early return below, and keyed on strings rather than on `mine`:
  // hooks after a conditional return crash the page when the branch is taken,
  // and an array dependency is a new value every render, so the effect never
  // stops running.
  const [names, setNames] = useState<Record<string, string>>({});
  const address = mine[0]?.deployment.contractAddress ?? null;
  const periodKey = mine[0]?.state
    ? [...mine[0].state.periods].map(String).sort().join(",")
    : "";

  useEffect(() => {
    if (!address || !periodKey) return;
    let cancelled = false;
    void (async () => {
      const known = Object.values(collectedFor(address)).filter((e) => e.fullName);
      if (known.length === 0) return;
      const contract = (await loadContract("payroll")) as any;
      const instance = fromHex(address.replace(/^0x/, ""));
      const found: Record<string, string> = {};
      for (const employee of known) {
        const bytes = fromHex(keyToHex(employee.coinPublicKey));
        for (const period of periodKey.split(",")) {
          found[
            bytesToHex(contract.pureCircuits.payeeHash({ bytes }, BigInt(period), instance))
          ] = employee.fullName!;
        }
      }
      if (!cancelled) setNames(found);
    })();
    return () => {
      cancelled = true;
    };
  }, [address, periodKey]);

  if (!account || mine.length === 0) {
    return (
      <>
        <section className="area-head">
          <h1>Roster</h1>
          <p className="lede">Who is on your payroll, and where their pay goes.</p>
        </section>
        <StageGate
          title="Setup first"
          needs={
            account
              ? "This signing key does not control a payroll contract yet. Register your organization to be assigned one, then come back and add your employees."
              : "Your roster is private to you, so it needs your company signing key. Connect and register on Setup, then come back."
          }
          to="/employer/setup"
          action="Go to Setup"
        />
      </>
    );
  }

  const state = mine[0]?.state ?? null;
  const latest = state && state.latestPeriod > 0n ? state.latestPeriod : null;

  // Employees, assembled from every period rather than the latest one.
  //
  // The identity of a worker is their payee hash: the same person keeps the
  // same one month to month, even if their slot index moves. That makes "since"
  // answerable — the earliest period their hash appears in — and status too:
  // present on the latest period means still on the payroll.
  //
  // Deliberately no salary column. A worker belongs to the roster; what they
  // earn belongs to a period. Putting an amount here would undo the separation
  // the two pages exist to draw.
  const seen = new Map<string, { first: bigint; onLatest: boolean; slot: number }>();
  if (state) {
    for (const period of [...state.periods].sort((a, b) => (a < b ? -1 : 1))) {
      if (!state.payeeFor.member(period)) continue;
      const payees = state.payeeFor.lookup(period);
      const count = state.employeeCountFor.member(period)
        ? Number(state.employeeCountFor.lookup(period))
        : 0;
      for (let i = 0; i < count; i += 1) {
        const key = BigInt(i);
        if (!payees.member(key)) continue;
        const hash = bytesToHex(payees.lookup(key));
        const existing = seen.get(hash);
        if (existing) {
          existing.onLatest = period === latest;
          existing.slot = i;
        } else {
          seen.set(hash, { first: period, onLatest: period === latest, slot: i });
        }
      }
    }
  }
  const employees = [...seen.entries()]
    .sort((a, b) => a[1].slot - b[1].slot)
    .map(([hash, meta], i) => ({
      label: names[hash] ?? `Employee ${String(i + 1).padStart(3, "0")}`,
      named: Boolean(names[hash]),
      hash,
      since: meta.first,
      active: meta.onLatest,
    }));

  return (
    <>
      <section className="area-head">
        <h1>Roster</h1>
        <p className="lede">
          Who is on your payroll, and the public keys their pay is sent to. What
          they earn belongs to a <Link to="/employer/payroll">payroll period</Link>,
          not to this page.
        </p>
        <div className="roster-head">
          <span className="count">
            {employees.length} employee{employees.length === 1 ? "" : "s"}
            {latest ? (
              <span className="muted">
                {" "}
                · {employees.filter((e) => e.active).length} on latest payroll
              </span>
            ) : null}
          </span>
          {/* Overview, not History. Filing moved to Overview when History
              became the read-only record, and these two buttons kept pointing
              at the old home — so "Add / import employees" landed on a page
              whose only message was "No periods filed on this contract yet",
              with nothing to press. */}
          <Link className="button" to="/employer">
            Add / import employees
          </Link>
        </div>
      </section>

      {employees.length === 0 ? (
        <section className="card">
          <h2>No employees yet</h2>
          <p className="note" style={{ marginTop: 0 }}>
            Your roster is assembled from the workbook you file a period with, so
            employees appear here once your first period is on chain. Collect
            each person's two public keys first — the disclosures below explain
            what to ask for.
          </p>
          <div className="actions">
            <Link className="button" to="/employer">
              Add / import employees
            </Link>
          </div>
        </section>
      ) : null}

      {employees.length > 0 ? (
        <section className="card">
          <h2>Employees</h2>
          <table className="roster">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Wallet / key</th>
                <th>Since</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <tr key={employee.hash}>
                  <td>{employee.label}</td>
                  <td className="mono" title={employee.hash}>
                    {employee.hash.slice(0, 4)}…{employee.hash.slice(-4)}
                  </td>
                  <td className="muted">{periodName(Number(employee.since))}</td>
                  <td>
                    {employee.active ? (
                      <span className="ok-line">Active</span>
                    ) : (
                      <span className="muted">Not on latest period</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* A silent fallback to slot numbers looks like missing data. It is
              not — the chain never held a name — but the difference is only
              visible if the page says which it is. */}
          {employees.length > 0 && employees.every((e) => !e.named) ? (
            <p className="note warn">
              Names are not shown because this browser has not seen your
              workbook. Open it once on <Link to="/employer">Overview</Link> and
              these rows will read as people — nothing is sent anywhere, and the
              chain is unchanged either way.
            </p>
          ) : null}
          <p className="note">
            "Wallet / key" is the hash the contract stores, not the key itself. A
            public map of the keys on your payroll would publish the employment
            relationships everything else here exists to hide — so the preimage
            stays in your workbook, and the chain only ever checks a recipient
            rather than naming one.
          </p>
          <p className="note">
            No salary column, on purpose. A worker belongs to this page; what
            they were paid belongs to a{" "}
            <Link to="/employer/payroll">payroll period</Link>.
          </p>
        </section>
      ) : null}

      <details className="details">
        <summary>Workbook format</summary>
        <p className="lead-sm">
          {ROSTER_SIZE} employees per period. Columns, in order:
        </p>
        <ol className="next">
          {ROSTER_COLUMNS.map((column, i) => (
            <li key={column}>
              <strong>{column}</strong>
              <span className="muted">{COLUMN_NOTES[i]}</span>
            </li>
          ))}
        </ol>
        <p className="note">
          A blank template is downloadable from{" "}
          <Link to="/employer">the month's first step</Link>. The two key columns
          are left blank on purpose — they are real wallet keys, one employee at
          a time.
        </p>
      </details>

      <details className="details">
        <summary>How employees provide their keys</summary>
        <p className="lead-sm">
          Send them to this app, have them connect their own wallet, and copy
          both keys from their income page. Neither key is a secret, and neither
          lets you spend anything of theirs.
        </p>
        <p className="note">
          Both, always. The coin public key names them inside the circuit; the
          encryption public key is what their coin's ciphertext is encrypted to.
          Supply only the first and the payment succeeds, the contract marks the
          slot paid, and their wallet never sees a thing.
        </p>
        <p className="note">
          A mistyped key is caught when you upload the roster — Midnight keys
          carry a Bech32m checksum. A valid key belonging to the wrong person is
          not catchable, and the salary is not recoverable, so it is worth
          comparing the truncated key shown in the upload preview against what
          the employee sent you.
        </p>
      </details>

      <details className="details">
        <summary>Why employee records are not stored</summary>
        <p className="note">
          Names, employment status and start dates are not on chain and never
          will be: the ledger holds one hash per slot, which proves a period has
          a payee without saying who. A name in the table above is therefore not
          a lookup — it is a <em>recognition</em>. Every employee this browser
          has seen on a workbook is hashed against each filed period with the
          contract's own circuit, and a match is a person.
        </p>
        <p className="note">
          So a row reads "Employee 001" until a workbook naming them has been
          opened here, and reads it again on a machine that has not seen one.
          Nothing is published, nothing is shared, and the chain is no more
          revealing either way.
        </p>
        <p className="note">
          Storing them needs a decision this project has not made. An
          employer-side database would know who works where, which is the thing
          the contract design goes out of its way to avoid; the honest options
          are local-only in this browser, or sealed on chain under your own key,
          as the salary openings already are.
        </p>
      </details>

      <details className="details">
        <summary>Your own keys</summary>
        <p className="note">
          The same two an employee would send you — useful if you are on your own
          payroll.
        </p>
        <CopyRow label="Coin public key" value={account.coinPublicKey} />
        <CopyRow label="Encryption public key" value={account.encryptionPublicKey} />
      </details>
    </>
  );
}

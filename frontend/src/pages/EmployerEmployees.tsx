// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CopyRow } from "../components/CopyRow";
import { ClaimKeyCollection } from "../components/ClaimKeyCollection";
import { EndEmployment } from "../components/EndEmployment";
import { RelayPanel } from "../components/RelayPanel";
import { StageGate } from "../components/StageGate";
import { ROSTER_COLUMNS, ROSTER_SIZE, periodName } from "../generated/roster";
import { loadDeployments, type Deployments } from "../lib/deployments";
import { bytesToHex, keyToHex } from "../lib/keys";
import { collectedFor, recordRoster } from "../lib/collected";
import { fetchSealedRoster, openRoster } from "../lib/sealedRoster";
import { readPublishedClaimKeys } from "../lib/publishedClaimKeys";
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
export function EmployerEmployees() {
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
  // Hash → the whole remembered employee, not just their name. The claim-key
  // column needs the coin public key: the store is keyed by it, and the chain
  // side of this page only ever has the hash.
  const [names, setNames] = useState<Record<string, { fullName: string; coinPublicKey: string }>>(
    {}
  );
  /**
   * Opening the sealed roster, when this browser has never seen the workbook.
   *
   * The names on this page come from `collectedFor` — what a workbook load left
   * behind locally — so a different machine shows slot numbers and cannot act
   * on anybody. The sealed copy fixes that without the platform learning who
   * works here: it holds ciphertext, and the passphrase that opens it is the
   * one the employer already types to file a period.
   */
  const [sealed, setSealed] = useState<string | null>(null);
  const [unlockPass, setUnlockPass] = useState("");
  const [unlocking, setUnlocking] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);

  /** Which row has its management panel open. One at a time, by payee hash. */
  const [managing, setManaging] = useState<string | null>(null);
  /**
   * Bumped whenever a row writes to the collected store.
   *
   * `localStorage` has nothing to subscribe to, and the claim-key status is
   * derived HERE — one read of `collectedFor` shared by every row. A row
   * re-rendering itself after a save therefore changed nothing an employer
   * could see: the ⚠ Missing beside their name is the parent's value, and it
   * stayed until the page was reloaded.
   */
  const [collectedNonce, setCollectedNonce] = useState(0);

  /**
   * Claim-key hashes employees published to the service.
   *
   * Read HERE as well as inside the collection form, because the status column
   * is what an employer looks at to decide whether anything is outstanding —
   * and it was answering from this browser's local record alone, so a hash the
   * employee had sent showed as Missing.
   */
  const [published, setPublished] = useState<Record<string, string>>({});
  useEffect(() => {
    let cancelled = false;
    void readPublishedClaimKeys(networkId).then((rows) => {
      if (!cancelled) setPublished(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId, collectedNonce]);
  const address = mine[0]?.deployment.contractAddress ?? null;
  const periodKey = mine[0]?.state
    ? [...mine[0].state.periods].map(String).sort().join(",")
    : "";

  useEffect(() => {
    if (!address) return;
    let cancelled = false;
    void fetchSealedRoster(networkId, address).then((row) => {
      if (!cancelled) setSealed(row?.sealed ?? null);
    });
    return () => {
      cancelled = true;
    };
  }, [networkId, address]);

  async function unlock() {
    if (!address || !sealed) return;
    setUnlocking(true);
    setUnlockError(null);
    try {
      const rows = await openRoster(unlockPass, address, sealed);
      // Straight into the same local store a workbook load writes, so every
      // page that already reads it — names, the claim-key column, the
      // termination form — starts working with no further wiring.
      recordRoster(address, rows);
      setUnlockPass("");
      setCollectedNonce((n) => n + 1);
    } catch (cause) {
      setUnlockError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setUnlocking(false);
    }
  }

  useEffect(() => {
    if (!address || !periodKey) return;
    let cancelled = false;
    void (async () => {
      const known = Object.values(collectedFor(address)).filter((e) => e.fullName);
      if (known.length === 0) return;
      const contract = (await loadContract("payroll")) as any;
      const instance = fromHex(address.replace(/^0x/, ""));
      const found: Record<string, { fullName: string; coinPublicKey: string }> = {};
      for (const employee of known) {
        const bytes = fromHex(keyToHex(employee.coinPublicKey));
        for (const period of periodKey.split(",")) {
          found[
            bytesToHex(contract.pureCircuits.payeeHash({ bytes }, BigInt(period), instance))
          ] = { fullName: employee.fullName!, coinPublicKey: employee.coinPublicKey };
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
          <h1>Employees</h1>
          <p className="lede">Manage the employees included in your payroll.</p>
        </section>
        <StageGate
          title="Register first"
          needs={
            account
              ? "This signing key does not control a payroll contract yet. Register your organization to be assigned one, then come back and add your employees."
              : "Your roster is private to you, so it needs your company signing key. Connect and register on Settings, then come back."
          }
          to="/employer/settings"
          action="Go to Settings"
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
  /**
   * One row per PERSON, not per person per period.
   *
   * ⚠️ This grouped by payee hash, on a comment claiming "the same person keeps
   * the same one month to month". They do not: `payeeHash` takes
   * `(coinPublicKey, period, instance)`, so the period is an input and the hash
   * is different every month by construction — which is the point of it, since
   * a stable hash would let anyone link a worker across periods.
   *
   * The visible cost was a roster that grew by its own headcount every month:
   * two employees over two periods rendered as four rows, each with its own
   * status and its own Manage panel.
   *
   * So the identity is the coin public key wherever this browser recognises
   * one, and the per-period hash only for a payee it cannot name — where there
   * is nothing better to group by, and the duplication is at least honest about
   * being an unrecognised slot rather than a person.
   */
  const seen = new Map<
    string,
    { first: bigint; onLatest: boolean; slot: number; hash: string }
  >();
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
        const identity = names[hash]?.coinPublicKey ?? hash;
        const existing = seen.get(identity);
        if (existing) {
          existing.onLatest = period === latest;
          existing.slot = i;
          existing.hash = hash;
        } else {
          seen.set(identity, {
            first: period,
            onLatest: period === latest,
            slot: i,
            hash,
          });
        }
      }
    }
  }

  /**
   * Who has sent a claim-key hash — from this browser's record, and from what
   * they published to the service.
   *
   * ⚠️ The published table was read by the collection FORM and not by this
   * column, so an employee who pressed "Send to my employer" still showed as
   * Missing here and in the warning above the table. The employer had no way to
   * see the thing that had arrived.
   */
  /**
   * The period each employee's termination was attested for, if any.
   *
   * Read from `terminationFor`, which is keyed by period and slot — the same
   * place `endEmployment` writes it. It answers the question the row needs: is
   * there a claim bundle that could be rebuilt for this person, and for which
   * month.
   */
  const endedIn = new Map<string, number>();
  if (state) {
    for (const period of [...state.periods]) {
      if (!state.terminationFor?.member(period)) continue;
      const slots = state.terminationFor.lookup(period);
      if (!state.payeeFor.member(period)) continue;
      const payees = state.payeeFor.lookup(period);
      const count = state.employeeCountFor.member(period)
        ? Number(state.employeeCountFor.lookup(period))
        : 0;
      for (let i = 0; i < count; i += 1) {
        const key = BigInt(i);
        if (!slots.member(key) || !payees.member(key)) continue;
        const hash = bytesToHex(payees.lookup(key));
        const identity = names[hash]?.coinPublicKey ?? hash;
        endedIn.set(identity, Number(period));
      }
    }
  }

  const collected = address ? collectedFor(address) : {};
  const hashFor = (coinPublicKey: string | null): boolean | null => {
    if (!coinPublicKey) return null;
    if (collected[coinPublicKey]?.claimKeyHash) return true;
    try {
      return Boolean(published[keyToHex(coinPublicKey)]);
    } catch {
      return Boolean(published[coinPublicKey.toLowerCase()]);
    }
  };

  const employees = [...seen.entries()]
    .sort((a, b) => a[1].slot - b[1].slot)
    .map(([identity, meta], i) => {
      const known = names[meta.hash];
      return {
        label: known?.fullName ?? `Employee ${String(i + 1).padStart(3, "0")}`,
        named: Boolean(known),
        coinPublicKey: known?.coinPublicKey ?? null,
        // `null` is "this browser does not recognise them", which is not the
        // same as "they have not sent one" and must not render as a warning.
        claimKey: hashFor(known?.coinPublicKey ?? null),
        endedIn: endedIn.get(identity) ?? null,
        hash: identity,
        since: meta.first,
        active: meta.onLatest,
      };
    });
  const missingClaimKeys = employees.filter((e) => e.claimKey === false);

  return (
    <>
      <section className="area-head">
        <h1>Employees</h1>
        <p className="lede">Manage the employees included in your payroll.</p>
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

      {/* Only when this browser cannot name anybody and a sealed copy exists.
          An employer whose workbook is already loaded should never see it. */}
      {sealed && employees.length > 0 && employees.every((e) => !e.named) ? (
        <section className="card">
          <h2>Unlock your roster</h2>
          <p className="note" style={{ marginTop: 0 }}>
            This browser has not seen your workbook, so the people below show as
            slot numbers. Your roster is stored sealed under your payroll
            passphrase — the same one you file periods with. This service holds
            only ciphertext and cannot read it.
          </p>
          <div className="actions" style={{ flexWrap: "wrap", gap: 8 }}>
            <input
              type="password"
              value={unlockPass}
              disabled={unlocking}
              placeholder="Payroll passphrase"
              autoComplete="off"
              style={{ minWidth: 260 }}
              onChange={(event) => setUnlockPass(event.target.value)}
            />
            <button
              type="button"
              className="primary"
              disabled={unlocking || !unlockPass}
              onClick={() => void unlock()}
            >
              {unlocking ? "Opening…" : "Unlock"}
            </button>
          </div>
          {unlockError ? <p className="status error">{unlockError}</p> : null}
          <p className="note">
            Names and public keys only — salaries are not stored anywhere but
            your workbook.
          </p>
        </section>
      ) : null}

      {/* One line, not a card. A secondary unemployment-benefit feature had a
          headed panel with a paragraph and a form above the employee table,
          which made it dominate a page about employees. The status is per
          person in the table, and each row's own Manage panel carries the field
          for fixing it — so this is a pointer, not a workflow. */}
      {missingClaimKeys.length > 0 ? (
        <p className="inline-warn">
          ⚠ {missingClaimKeys.length}{" "}
          {missingClaimKeys.length === 1 ? "employee needs" : "employees need"} a
          benefit claim key. Open <strong>Manage</strong> on their row to add it.
        </p>
      ) : null}

      {employees.length > 0 ? (
        <section className="card employees-card">
          <h2>Employees</h2>
          <table className="roster">
            <thead>
              <tr>
                <th>Employee</th>
                <th>Payment key</th>
                <th>Since</th>
                <th>Status</th>
                <th>Benefit claim key</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {employees.map((employee) => (
                <EmployeeRow
                  key={employee.hash}
                  employee={employee}
                  address={address!}
                  networkId={networkId}
                  instanceName={mine[0].name.replace(/^payroll:/, "")}
                  periods={[...(state?.periods ?? [])].map(Number).sort((a, b) => b - a)}
                  open={managing === employee.hash}
                  onToggle={() =>
                    setManaging(managing === employee.hash ? null : employee.hash)
                  }
                  onChanged={() => setCollectedNonce((n) => n + 1)}
                />
              ))}
            </tbody>
          </table>
          {/* A silent fallback to slot numbers looks like missing data. It is
              not — the chain never held a name — but the difference is only
              visible if the page says which it is. */}
          {employees.length > 0 && employees.every((e) => !e.named) ? (
            <p className="note warn">
              Names are not shown because this browser has not seen your
              workbook. Open it once on <Link to="/employer">Payroll</Link> and
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
            <Link to="/employer/history">payroll period</Link>.
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

/**
 * One employee, and everything an employer can do to them.
 *
 * The lifecycle used to be scattered: their claim-key hash was collected in a
 * setup panel on the payroll page, and ending their employment was a separate
 * global workflow at the bottom of that same page, under a heading that named
 * the occasion rather than the person. Neither was reachable from the row that
 * described them.
 *
 * Both are here now, because both are facts about ONE person rather than steps
 * in running a month. The row stays a row; the panel opens under it.
 */
function EmployeeRow({
  employee,
  address,
  networkId,
  instanceName,
  periods,
  open,
  onToggle,
  onChanged,
}: {
  employee: {
    label: string;
    named: boolean;
    coinPublicKey: string | null;
    claimKey: boolean | null;
    /** The period their termination was attested for, or null. */
    endedIn: number | null;
    hash: string;
    since: bigint;
    active: boolean;
  };
  address: string;
  networkId: string;
  instanceName: string;
  periods: number[];
  open: boolean;
  onToggle: () => void;
  /** Tells the page to re-read the store its status column comes from. */
  onChanged: () => void;
}) {
  const [ending, setEnding] = useState(false);

  return (
    <>
      <tr className={open ? "row-open" : undefined}>
        <td>{employee.label}</td>
        <td className="mono" title={employee.hash}>
          {employee.hash.slice(0, 4)}…{employee.hash.slice(-4)}
        </td>
        <td className="muted">{periodName(Number(employee.since))}</td>
        <td>
          {/* Never orange for "unknown". A person this browser has not seen on
              a workbook is not a person anyone has failed to collect from. */}
          {employee.claimKey === null ? (
            <span
              className="pill neutral"
              title="This browser has not seen a workbook naming them"
            >
              Unknown
            </span>
          ) : employee.claimKey ? (
            <span className="pill ok">✓ Collected</span>
          ) : (
            <span className="pill warn">⚠ Missing</span>
          )}
        </td>
        <td>
          {/* A termination outranks "on the latest period": someone can be
              attested as leaving in the very month they were last paid, and
              showing that as Active contradicts the panel below it. */}
          {employee.endedIn !== null ? (
            <span className="pill warn">Ended</span>
          ) : employee.active ? (
            <span className="pill ok">Active</span>
          ) : (
            <span className="pill neutral">Past</span>
          )}
        </td>
        <td>
          <button type="button" className="ghost manage" onClick={onToggle}>
            {open ? "Close" : "Manage"}
          </button>
        </td>
      </tr>
      {open ? (
        <tr className="row-detail">
          <td colSpan={6}>
            <div className="employee-panel">
              {ending ? (
                <EndEmployment
                  contractAddress={address}
                  instance={instanceName}
                  networkId={networkId}
                  periods={periods}
                  employee={
                    employee.coinPublicKey
                      ? { fullName: employee.label, coinPublicKey: employee.coinPublicKey }
                      : undefined
                  }
                  onEnded={onChanged}
                />
              ) : (
                <>
                  {/* Two facts and then one action, in that order. Both facts
                      are prerequisites for the action — a termination needs
                      their claim-key hash inside it and cannot be revised
                      afterwards — so the panel reads as a sequence rather than
                      as a status block with a button under it. */}
                  <dl className="employee-facts">
                    <div>
                      <dt>On the payroll</dt>
                      <dd>
                        {/* Agrees with the row's pill. It said "Active" beside a
                            disclosure announcing the employment had ended. */}
                        <span
                          className={
                            employee.endedIn !== null
                              ? "pill warn"
                              : employee.active
                                ? "pill ok"
                                : "pill neutral"
                          }
                        >
                          {employee.endedIn !== null
                            ? "Ended"
                            : employee.active
                              ? "Active"
                              : "Past"}
                        </span>{" "}
                        <span className="muted">
                          {employee.endedIn !== null
                            ? `${periodName(employee.endedIn)} was their final period`
                            : `since ${periodName(Number(employee.since))}`}
                        </span>
                      </dd>
                    </div>
                    <div>
                      <dt>Payment key</dt>
                      <dd>
                        {employee.coinPublicKey ? (
                          <span className="pill ok">✓ Known to this browser</span>
                        ) : (
                          <span className="pill neutral">
                            Not recognised — load the workbook
                          </span>
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>Benefit claim key</dt>
                      <dd>
                        {employee.claimKey === null ? (
                          <span className="pill neutral">Unknown</span>
                        ) : employee.claimKey ? (
                          <span className="pill ok">✓ Collected</span>
                        ) : (
                          <span className="pill warn">⚠ Missing</span>
                        )}
                      </dd>
                    </div>
                  </dl>

                  {employee.coinPublicKey && employee.claimKey === false ? (
                    <ClaimKeyCollection
                      contractAddress={address}
                      rows={[
                        { fullName: employee.label, coinPublicKey: employee.coinPublicKey },
                      ]}
                      onSaved={onChanged}
                      compact
                    />
                  ) : null}

                  {/* Available whenever a termination exists, not only after a
                      failed run.
                      
                      A bundle goes stale for reasons that have nothing to do
                      with failure: the fund's pool coin it names can be spent
                      by an earlier claimant, the file can be lost, or a second
                      claim window can need a fresh one. Hiding the rebuild
                      behind a failure left the only route through the CLI. */}
                  {employee.endedIn !== null ? (
                    <details className="details">
                      <summary>Rebuild their claim bundle</summary>
                      <p className="note">
                        Employment ended {periodName(employee.endedIn)}. Upload the
                        termination opening you downloaded then, and this rebuilds
                        the bundle against the fund's coins as they are now — which
                        is what a bundle naming a coin some other claimant has
                        since spent needs.
                      </p>
                      <p className="note">
                        The root for that month is already on chain and the same
                        opening reproduces it, so publishing again is not needed.
                      </p>
                      <RelayPanel period={employee.endedIn} defaultPublish={false} bare />
                    </details>
                  ) : null}

                  <div className="employee-action">
                    <button
                      type="button"
                      className="ghost danger-text"
                      disabled={!employee.coinPublicKey}
                      title={
                        employee.coinPublicKey
                          ? undefined
                          : "This browser does not know their key — load the workbook first"
                      }
                      onClick={() => setEnding(true)}
                    >
                      End employment
                    </button>
                    <p className="note" style={{ margin: 0 }}>
                      {employee.claimKey === false ? (
                        <>
                          <strong>Save their claim-key hash first.</strong> It
                          goes inside the statement you sign, and that statement
                          is write-once — a key collected afterwards is one no
                          claim can ever use.
                        </>
                      ) : (
                        <>
                          Creates the private record this person needs to prove
                          eligibility for unemployment benefit, and publishes the
                          month's claim tree in the same step.
                        </>
                      )}
                    </p>
                  </div>
                </>
              )}
            </div>
          </td>
        </tr>
      ) : null}
    </>
  );
}

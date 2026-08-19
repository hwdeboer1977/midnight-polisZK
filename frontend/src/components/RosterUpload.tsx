import { useState } from "react";
import type { ParsedRoster } from "../generated/roster";

// The xlsx parser drags in ~950 kB of spreadsheet library. Loading it only when
// a file is actually chosen keeps it out of the initial bundle entirely.
const loadParser = () => import("../generated/roster");

const ROSTER_COLUMNS = ["Full name", "Address", "Monthly gross salary"] as const;
const ROSTER_SIZE = 10;

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
/** 202603 -> "March 2026". */
function periodName(period: number): string {
  const month = MONTHS[(period % 100) - 1];
  return month ? `${month} ${Math.floor(period / 100)}` : String(period);
}
import { formatPeur } from "../lib/format";

/**
 * The employer's roster never leaves this machine. The file is parsed in the
 * browser, and only the salaries — as private circuit inputs — ever reach a
 * transaction. Names and addresses are shown here for confirmation and then
 * forgotten.
 */
export function RosterUpload() {
  const [roster, setRoster] = useState<ParsedRoster | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setBusy(true);
    setError(null);
    setRoster(null);
    setFileName(file.name);

    try {
      const [{ parseRosterWorkbook }, buffer] = await Promise.all([
        loadParser(),
        file.arrayBuffer(),
      ]);
      setRoster(await parseRosterWorkbook(buffer));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  const usable = roster !== null && roster.problems.length === 0;

  return (
    <section className="card">
      <h2>Upload roster</h2>

      <label className="upload">
        <input type="file" accept=".xlsx" onChange={(e) => void onFile(e)} />
        <span>{busy ? "Reading…" : "Choose an .xlsx file"}</span>
      </label>
      <p className="note">
        Year and Month above the table, then columns: {ROSTER_COLUMNS.join(" · ")}.
        Generate a starting point with <code>npm run roster:template</code>. Parsed in
        your browser — the file is never uploaded anywhere.
      </p>

      {error ? <p className="status error">Could not read {fileName}: {error}</p> : null}

      {roster ? (
        <>
          {roster.problems.length > 0 ? (
            <div className="problems">
              <strong>{fileName} is not usable yet:</strong>
              <ul>
                {roster.problems.map((problem, i) => (
                  <li key={i}>
                    {problem.row === 0 ? problem.message : `row ${problem.row}: ${problem.message}`}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {roster.period ? (
            <p className="status">
              Payroll period: <strong>{periodName(roster.period)}</strong>{" "}
              <span className="muted">({roster.period})</span>
            </p>
          ) : null}

          <table className="roster">
            <thead>
              <tr>
                <th>#</th>
                <th>Full name</th>
                <th>Address</th>
                <th className="num">Monthly gross</th>
              </tr>
            </thead>
            <tbody>
              {roster.rows.map((row) => (
                <tr key={row.index}>
                  <td className="muted">{row.index}</td>
                  <td>{row.fullName}</td>
                  <td className="muted">{row.address}</td>
                  <td className="num">{formatPeur(row.salaryMinor)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={3}>
                  Total <span className="muted">— the only figure that becomes public</span>
                </td>
                <td className="num total">{formatPeur(roster.totalMinor)}</td>
              </tr>
            </tfoot>
          </table>

          {usable ? (
            <p className="note">
              Ready: {ROSTER_SIZE} employees
              {roster.period ? ` for ${periodName(roster.period)}` : ""}. Submitting means proving a transaction, which
              runs from the CLI for now — <code>INSTANCE=&lt;employer&gt; npm run payroll</code>,
              option 3, and give it this file. Only the total and one commitment per
              employee will be published; the names and addresses above stay here.
            </p>
          ) : null}
        </>
      ) : null}
    </section>
  );
}

import { useState } from "react";
import { periodName } from "../generated/roster";
import { recoverPayslips } from "../lib/recoverPayslips";
import type { Payslip } from "../lib/payslip";
import { Payslips } from "./Payslips";

/**
 * Getting a period's payslips back, at any time after it was filed.
 *
 * Deliberately not a stored list. The panel that appears right after filing is
 * in memory and gone on reload, which is the correct lifetime for a document
 * holding everyone's salary — persisting it would put the payroll at rest in
 * the browser for the convenience of not typing a passphrase.
 *
 * Nothing is lost by that, because the openings are on chain and the passphrase
 * decrypts them. The passphrase is the cost, and it is the same one filing
 * already asks for.
 */
export function PayslipRecovery({
  contractAddress,
  networkId,
  periods,
}: {
  contractAddress: string;
  networkId: string;
  /** Filed periods, newest first. */
  periods: number[];
}) {
  const [period, setPeriod] = useState<number | null>(periods[0] ?? null);
  const [passphrase, setPassphrase] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slips, setSlips] = useState<Payslip[] | null>(null);
  const [unsealed, setUnsealed] = useState<number[]>([]);

  if (periods.length === 0) return null;

  async function run() {
    if (period === null || !passphrase) return;
    setBusy(true);
    setError(null);
    setSlips(null);
    try {
      const result = await recoverPayslips({
        networkId,
        contractAddress,
        period,
        passphrase,
      });
      setSlips(result.payslips);
      setUnsealed(result.unsealed);
      // Held no longer than the derivation needs it.
      setPassphrase("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Payslips</h2>
      <p className="note" style={{ marginTop: 0 }}>
        Rebuilt from the openings your filing sealed on chain — no transaction,
        and nothing here disturbs a period that has already been paid. Use this
        rather than re-filing a month: re-filing replaces its commitments and
        marks every employee unpaid.
      </p>

      <div className="actions" style={{ alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <select
          value={period ?? ""}
          disabled={busy}
          onChange={(event) => {
            setPeriod(Number(event.target.value));
            setSlips(null);
            setError(null);
          }}
        >
          {periods.map((value) => (
            <option key={value} value={value}>
              {periodName(value)}
            </option>
          ))}
        </select>

        <input
          type="password"
          value={passphrase}
          disabled={busy}
          placeholder="Payroll passphrase"
          autoComplete="off"
          onChange={(event) => setPassphrase(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void run();
          }}
        />

        <button
          type="button"
          className="primary"
          disabled={busy || !passphrase || period === null}
          onClick={() => void run()}
        >
          {busy ? "Opening…" : "Get payslips"}
        </button>
      </div>

      <p className="note">
        The one you filed that month with. Deriving the key from it is
        deliberately slow, so this takes a moment.
      </p>

      {error ? <p className="status error">{error}</p> : null}

      {slips ? (
        slips.length > 0 ? (
          <>
            <Payslips slips={slips} />
            {unsealed.length > 0 ? (
              <p className="note">
                No opening was sealed for{" "}
                {unsealed.map((slot) => `employee ${slot + 1}`).join(", ")} — that
                period predates sealed openings, so those payslips cannot be
                rebuilt from the chain.
              </p>
            ) : null}
          </>
        ) : (
          <p className="note">
            Nothing to rebuild: no sealed openings exist for that period.
          </p>
        )
      ) : null}
    </section>
  );
}

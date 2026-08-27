import { useState } from "react";
import { apiUrl } from "../lib/origin";

/**
 * Moving a treasury's pEUR into the benefit fund.
 *
 * The last hop, and the one nothing used to perform. `remitTax` and
 * `remitSocial` send each period's withholding to the two treasury wallets, and
 * until now nothing spent those: every deposit the fund had ever received came
 * from the PLATFORM wallet instead, so contributions accumulated in one place
 * while benefits were paid out of another. This closes that.
 *
 * Behind the platform token rather than open, unlike the relay panel, and the
 * distinction is worth keeping straight: the relay submits a transaction anyone
 * could submit, while this spends a wallet whose seed lives in the backend. The
 * token is typed at the moment of use for the same reason it is on the reset
 * control — a bundle cannot carry one.
 */
export function FundDeposit() {
  const [amount, setAmount] = useState("");
  const [from, setFrom] = useState("social-treasury");
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ txHash: string; ordinal: number } | null>(null);

  async function deposit() {
    setError(null);
    setDone(null);
    setLog([]);
    setBusy(true);
    try {
      const response = await fetch(apiUrl("/api/fund/deposit"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(token.trim() ? { authorization: `Bearer ${token.trim()}` } : {}),
        },
        body: JSON.stringify({ amount, from }),
      });
      const started = (await response.json().catch(() => ({}))) as {
        jobId?: string;
        error?: string;
      };
      if (!response.ok) throw new Error(started.error ?? `Service returned ${response.status}`);

      // Polled rather than awaited: proving takes minutes, which is far longer
      // than an HTTP request should stay open — the same reason every other
      // long operation here answers with a job id.
      const poll = async (): Promise<void> => {
        const r = await fetch(apiUrl(`/api/job/${started.jobId}`));
        const job = (await r.json()) as {
          status: string;
          log?: string[];
          error?: string;
          result?: { txHash: string; ordinal: number };
        };
        setLog(job.log ?? []);
        if (job.status === "running") {
          await new Promise((resolve) => setTimeout(resolve, 2000));
          return poll();
        }
        if (job.status === "failed") throw new Error(job.error ?? "Deposit failed");
        if (job.result) setDone(job.result);
      };
      await poll();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <h2>Fund the benefit pool</h2>
      <p className="lead-sm">
        Deposits pEUR into the fund so claims can actually be paid. The social
        treasury is where every period's contributions land, so that is what
        normally pays for benefits.
      </p>

      <div className="actions" style={{ flexWrap: "wrap", gap: 8, alignItems: "center" }}>
        <select value={from} disabled={busy} onChange={(e) => setFrom(e.target.value)}>
          <option value="social-treasury">Social treasury (contributions)</option>
          <option value="tax-treasury">Tax treasury</option>
          <option value="platform">Platform wallet (top-up)</option>
        </select>
        <input
          value={amount}
          disabled={busy}
          placeholder="Amount in EUR, e.g. 3000"
          style={{ minWidth: 200 }}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          type="password"
          value={token}
          disabled={busy}
          placeholder="Platform token"
          autoComplete="off"
          style={{ minWidth: 220 }}
          onChange={(e) => setToken(e.target.value)}
        />
        <button
          type="button"
          className="primary"
          disabled={busy || !amount.trim()}
          onClick={() => void deposit()}
        >
          {busy ? "Depositing…" : "Deposit"}
        </button>
      </div>

      <p className="note">
        The coin's nonce is written to the service's pool file before the
        transaction is sent, because that file is the only record of the fund's
        coins that exists anywhere — a coin the fund holds but cannot describe is
        a coin no claim can spend.
      </p>

      {log.length > 0 ? <pre className="log">{log.join("\n")}</pre> : null}
      {error ? <p className="status error">{error}</p> : null}
      {done ? (
        <p className="ok-line">
          ✓ Deposited — pool coin #{done.ordinal}, tx {done.txHash}
        </p>
      ) : null}
    </section>
  );
}

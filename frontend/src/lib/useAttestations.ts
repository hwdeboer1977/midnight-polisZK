import { useEffect, useState } from "react";
import { findAttestations, type Attestation } from "./attestations";
import { loadDeployments, type Deployments } from "./deployments";
import { useWallet } from "../wallet/WalletContext";

/**
 * The periods that name the connected wallet, scanned once for whoever asks.
 *
 * Extracted when Employee split into two tabs. Both of them need the same
 * answer — Salary to list what was paid, Unemployment benefit to know whether a
 * final period has been attested — and two copies of the scan could disagree
 * about the same wallet on the same chain. They very nearly did already: the
 * old Claim page ran its own copy with a different error path, so a scan that
 * failed showed an empty eligibility panel there and an error banner on
 * Employee.
 *
 * `employerOf` comes back in the same pass because "no payroll found" has two
 * very different causes and only one is a problem. An employer's own wallet
 * matches no payee hash and never will; telling them to check their keys sends
 * them looking for a mistake that is not there.
 */
export interface AttestationScan {
  rows: Attestation[];
  /** The instance this wallet is the EMPLOYER of, if any. */
  employerOf: string | null;
  deployments: Deployments | null;
  loading: boolean;
  error: string | null;
  /** True once an employer has attested a final period for this wallet. */
  ended: boolean;
  /** The first attested final period, or null. Where a benefit starts. */
  finalPeriod: number | null;
}

export function useAttestations(): AttestationScan {
  const { account, networkId } = useWallet();
  const [rows, setRows] = useState<Attestation[]>([]);
  const [employerOf, setEmployerOf] = useState<string | null>(null);
  const [deployments, setDeployments] = useState<Deployments | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account) {
      setRows([]);
      setEmployerOf(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const loaded = await loadDeployments();
        if (!cancelled) setDeployments(loaded);

        const scan = await findAttestations(networkId, account.coinPublicKey);
        if (!cancelled) {
          setRows(scan.rows);
          setEmployerOf(scan.employerOf);
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [account, networkId]);

  const endedRows = rows.filter((row) => row.ended);

  return {
    rows,
    employerOf,
    deployments,
    loading,
    error,
    ended: endedRows.length > 0,
    finalPeriod: endedRows[0]?.period ?? null,
  };
}

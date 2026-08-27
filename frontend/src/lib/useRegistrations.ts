import { useCallback, useEffect, useState } from "react";
import { apiBase, apiUrl, platformActions, servedLocally } from "./origin";

export type RegistrationStatus = "active" | "inactive";

/**
 * A company's commercial standing, which is a different question from who
 * controls their payroll contract.
 *
 * The chain answers the second and only the second: `employer` is written once
 * by `assignEmployer` and there is no circuit that unwrites it. This record
 * answers "did they sign up, and does that still stand" — so an inactive
 * registration beside a perfectly functional contract is not a contradiction,
 * it is the two questions giving their own answers.
 */
export interface Registration {
  id: number;
  companyName: string;
  instance: string;
  networkId: string;
  contractAddress: string;
  employerKey: string;
  registeredAt: string;
  termMonths: number;
  expiresAt: string;
  status: RegistrationStatus;
  /** `status`, with an elapsed term counted as inactive without a write. */
  effectiveStatus: RegistrationStatus;
}

/**
 * The registry, and the one write the operator can make against it.
 *
 * Reading is public — `/api/registrations` discloses nothing the chain does not
 * already carry, and a company name is not a secret. Writing is token-gated,
 * which is why `canWrite` exists separately from "is a service reachable": on a
 * hosted build the list loads and the buttons cannot work, and saying so before
 * the click beats a 401 after it.
 */
export function useRegistrations(networkId: string) {
  const [registrations, setRegistrations] = useState<Registration[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<string | null>(null);

  const reachable = servedLocally || apiBase !== "";

  const refresh = useCallback(async () => {
    if (!reachable) return;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(
        apiUrl(`/api/registrations?networkId=${encodeURIComponent(networkId)}`),
        { cache: "no-store" }
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
      setRegistrations(body.registrations ?? []);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
  }, [networkId, reachable]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  /**
   * Optimism would be wrong here. The row is re-read from the response rather
   * than assumed, because the server is the only thing that knows whether the
   * write landed — and a button that shows "inactive" over a failed UPDATE is
   * worse than one that shows nothing.
   */
  const setStatus = useCallback(
    async (instance: string, status: RegistrationStatus) => {
      setPending(instance);
      setError(null);
      try {
        const response = await fetch(apiUrl("/api/registrations/status"), {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ instance, status, networkId }),
        });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body?.error ?? `HTTP ${response.status}`);
        setRegistrations((current) =>
          current
            ? current.map((row) => (row.instance === instance ? body.registration : row))
            : current
        );
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        setPending(null);
      }
    },
    [networkId]
  );

  return {
    registrations,
    loading,
    error,
    pending,
    reachable,
    /** Whether the write can succeed from here at all — see `origin.ts`. */
    canWrite: platformActions,
    refresh,
    setStatus,
  };
}

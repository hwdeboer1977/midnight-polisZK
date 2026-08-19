import { useCallback, useEffect, useState } from "react";
import { fetchContractState } from "./chain";
import { loadContract, type PayrollLedger } from "./contracts";
import { forNetwork, type Deployment, type Deployments } from "./deployments";
import { bytesToHex as hex, sameKey } from "./keys";

export interface PayrollInstance {
  name: string;
  deployment: Deployment;
  state: PayrollLedger | null;
  blockHeight: number | null;
  /** How the connected key relates to this instance. */
  role: "employer" | "platform" | "none";
}


/**
 * Loads every payroll instance on the network and works out which of them the
 * connected key has anything to do with.
 *
 * The filtering has to happen after reading state, not from the deployment file:
 * ownership lives on chain, and `deployment.json` only records that a contract
 * exists. An employer must see their own contract and nobody else's, so the
 * question "is this mine?" is answered by the contract itself.
 */
export function usePayrollInstances(
  networkId: string,
  deployments: Deployments,
  coinPublicKey: string | null
) {
  const [instances, setInstances] = useState<PayrollInstance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    const candidates = forNetwork(deployments, networkId).filter(
      ([, deployment]) => deployment.contractName === "payroll"
    );

    if (candidates.length === 0) {
      setInstances([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const contract = await loadContract("payroll");
        const loaded = await Promise.all(
          candidates.map(async ([name, deployment]) => {
            const chainState = await fetchContractState(
              networkId,
              deployment.contractAddress
            );

            // Decoding is per instance, and a failure skips that one instead of
            // emptying the list. A contract deployed before the current ledger
            // shape throws here — `tried to idx, only map, array, and bmt are
            // supported` — and one stale test deployment used to take out every
            // instance including the employer's own working one.
            let state: PayrollLedger | null = null;
            if (chainState) {
              try {
                state = contract.ledger(chainState.data) as PayrollLedger;
              } catch (cause) {
                console.warn(
                  `[payroll] ${name} (${deployment.contractAddress}) could not be ` +
                    "decoded — deployed from an older contract version?",
                  cause
                );
                return null;
              }
            }

            let role: PayrollInstance["role"] = "none";
            if (state && coinPublicKey) {
              if (state.employerAssigned && sameKey(hex(state.employer.bytes), coinPublicKey)) {
                role = "employer";
              } else if (sameKey(hex(state.platform.bytes), coinPublicKey)) {
                role = "platform";
              }
            }

            return {
              name,
              deployment,
              state,
              blockHeight: chainState?.blockHeight ?? null,
              role,
            };
          })
        );

        // Undecodable instances drop out rather than appearing half-built.
        if (!cancelled) setInstances(loaded.filter((i): i is PayrollInstance => i !== null));
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [networkId, deployments, coinPublicKey, nonce]);

  return { instances, loading, error, refresh };
}

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from "react";
import { fetchContractState } from "./chain";
import { decodePayrollLedger, loadContract, type PayrollLedger } from "./contracts";
import { forNetwork, type Deployment, type Deployments } from "./deployments";
import { bytesToHex as hex, sameKey } from "./keys";

export interface PayrollInstance {
  name: string;
  deployment: Deployment;
  state: PayrollLedger | null;
  blockHeight: number | null;
  /**
   * How the connected key relates to this instance.
   *
   * One label, and employer wins — which is right for "whose contract is this?"
   * and wrong for "is this the deployer?". The two are not exclusive: a platform
   * that assigns itself as employer, which every local and test deployment does,
   * is both. Ask `isPlatform` for the second question.
   */
  role: "employer" | "platform" | "none";
  /**
   * Whether the connected key is this instance's `platform`, independent of the
   * label above.
   *
   * `role === "platform"` was standing in for this and silently answered "no"
   * whenever the deployer was also an employer — so the operator-only controls
   * disappeared for exactly the wallet that runs the service in development.
   */
  isPlatform: boolean;
  /**
   * Whether the connected key is one of THIS contract's frozen treasuries.
   *
   * Read off the ledger rather than configured, for the same reason
   * `isPlatform` is: `taxTreasury` and `socialTreasury` are public fields fixed
   * at deploy, so the chain is the authority on who they are. Since the
   * treasuries became wallets the operator holds, they are a third role that
   * can act here — and the settlement card is theirs, not the platform's.
   */
  treasuryRole: "tax" | "social" | null;
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
      // Retired records cannot name anyone as employer that this build could
      // read, so querying them can only produce the warning they already earned.
      ([, deployment]) => deployment.contractName === "payroll" && !deployment.retired
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
              // Decoding is per instance, and a failure skips that one instead
              // of emptying the list. `ledger()` is lazy, so this probes fields
              // eagerly — see decodePayrollLedger.
              state = decodePayrollLedger(contract, chainState.data);
              if (!state) {
                console.warn(
                  `[payroll] ${name} (${deployment.contractAddress}) does not match ` +
                    "this build's contract — deployed from an older version?"
                );
                return null;
              }
            }

            let role: PayrollInstance["role"] = "none";
            const isPlatform = Boolean(
              state && coinPublicKey && sameKey(hex(state.platform.bytes), coinPublicKey)
            );
            const treasuryRole: "tax" | "social" | null =
              state && coinPublicKey
                ? sameKey(hex(state.taxTreasury.bytes), coinPublicKey)
                  ? "tax"
                  : sameKey(hex(state.socialTreasury.bytes), coinPublicKey)
                    ? "social"
                    : null
                : null;
            if (state && coinPublicKey) {
              if (state.employerAssigned && sameKey(hex(state.employer.bytes), coinPublicKey)) {
                role = "employer";
              } else if (isPlatform) {
                role = "platform";
              }
            }

            return {
              name,
              deployment,
              state,
              blockHeight: chainState?.blockHeight ?? null,
              role,
              isPlatform,
              treasuryRole,
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

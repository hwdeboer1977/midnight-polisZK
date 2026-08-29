// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useCallback, useEffect, useState } from "react";
import { fetchContractState } from "./chain";
import { loadContract } from "./contracts";

interface Result<T> {
  state: T | null;
  blockHeight: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
}

/**
 * Fetches a contract's public state from the indexer and decodes it with the
 * generated `ledger()`. No wallet involved: this is public data, readable
 * whether or not anyone is connected.
 */
export function useContractState<T>(
  networkId: string,
  contractName: string,
  address: string | undefined
): Result<T> {
  const [state, setState] = useState<T | null>(null);
  const [blockHeight, setBlockHeight] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!address) {
      setState(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    void (async () => {
      try {
        const [chainState, contract] = await Promise.all([
          fetchContractState(networkId, address),
          loadContract(contractName),
        ]);
        if (cancelled) return;

        setState(chainState ? (contract.ledger(chainState.data) as T) : null);
        setBlockHeight(chainState?.blockHeight ?? null);
      } catch (cause) {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : String(cause));
          setState(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    // A network switch or address change must not be overwritten by a slower
    // in-flight request for the previous one.
    return () => {
      cancelled = true;
    };
  }, [networkId, contractName, address, nonce]);

  return { state, blockHeight, loading, error, refresh };
}

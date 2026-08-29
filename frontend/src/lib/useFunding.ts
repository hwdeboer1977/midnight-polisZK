// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { useCallback } from "react";
import { PEUR_SCALE } from "./format";
import { useServiceJob } from "./useServiceJob";

export interface ClaimResult {
  instance: string;
  coinPublicKey: string;
  /** Minor units, as a string — JSON has no bigint. */
  amount: string;
  txHash: string;
}

export interface MintResult {
  amount: string;
  totalSupply: string;
  txHash: string;
}

/** The starter allowance, mirrored from the service for display only. */
export const EMPLOYER_ALLOWANCE = 100_000n * PEUR_SCALE;

/**
 * Draws the registered employer's starter allowance.
 *
 * Both keys are sent because `mintTo` needs both: the coin public key names the
 * recipient inside the circuit, and the encryption public key is what makes the
 * coin findable by their wallet. They come straight from the connector, which is
 * safer than either key being retyped — a coin minted against a wrong encryption
 * key is undetectable by its owner and cannot be recovered.
 */
export function useClaim() {
  const { job, submitting, unavailable, start, reset } =
    useServiceJob<ClaimResult>("/api/claim");

  const claim = useCallback(
    (coinPublicKey: string, encryptionPublicKey: string) =>
      start({ coinPublicKey, encryptionPublicKey }),
    [start]
  );

  return { job, submitting, unavailable, claim, reset };
}

/**
 * The open faucet: mints pEUR to the connected wallet, any amount.
 *
 * Both keys go up for the same reason the employer claim sends both — the coin
 * public key names the recipient inside the circuit, and the encryption public
 * key is what lets their wallet find the coin at all. A mint against the wrong
 * encryption key is undetectable by its owner and cannot be recovered, so
 * neither is retyped: both come straight from the connector.
 */
export function useFaucet() {
  const { job, submitting, unavailable, start, reset } =
    useServiceJob<ClaimResult>("/api/faucet");

  const mint = useCallback(
    (coinPublicKey: string, encryptionPublicKey: string, amount: string) =>
      start({ coinPublicKey, encryptionPublicKey, amount }),
    [start]
  );

  return { job, submitting, unavailable, mint, reset };
}

/** Tops up the issuer's own holding. Pays `ownPublicKey()` in the circuit. */
export function useMint() {
  const { job, submitting, unavailable, start, reset } =
    useServiceJob<MintResult>("/api/mint");

  const mint = useCallback((amount: string) => start({ amount }), [start]);

  return { job, submitting, unavailable, mint, reset };
}

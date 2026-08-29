// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * pEUR amount handling and the supply minted right after deployment.
 *
 * The initial mint is a second transaction rather than constructor work: a
 * deploy transaction cannot carry a zswap mint, because the contract address —
 * and therefore the token type derived from it — is not fixed until the
 * transaction is built. `npm run deploy:peur` runs both steps.
 */

/**
 * pEUR is denominated to six decimals.
 *
 * Not because payroll needs micro-cents, but because nothing on chain records a
 * token's decimals: wallets fall back to Midnight's default of six, and a token
 * that picks its own scale is rendered wrong in every wallet while looking right
 * only here. Six is the number that makes an outside reader and this app agree.
 */
export const PEUR_DECIMALS = 6;

/** 1 pEUR, in minor units. */
export const PEUR_SCALE = 10n ** BigInt(PEUR_DECIMALS);

/** Default initial supply: 1,000,000.000000 pEUR, in minor units. */
export const DEFAULT_PEUR_SUPPLY = 1_000_000n * PEUR_SCALE;

/** Matches the contract's Uint<48> bound on mint amounts. */
export const MAX_PEUR_AMOUNT = (1n << 48n) - 1n;

/**
 * Deliberately free of Node globals: this module is copied into the frontend
 * bundle so both sides share one definition of a minor unit. Anything reading
 * `process.env` belongs with the CLI that calls it, not here.
 */
export function parsePeurAmount(raw: string): bigint {
  const value = raw.trim();
  if (!/^\d+$/.test(value)) {
    throw new Error(`"${raw}" is not a whole number of minor units`);
  }
  const amount = BigInt(value);
  if (amount === 0n) throw new Error("Amount must be greater than zero");
  if (amount > MAX_PEUR_AMOUNT) {
    throw new Error(`Amount exceeds the maximum (${MAX_PEUR_AMOUNT})`);
  }
  return amount;
}

/** 123456780000 -> "123,456.78" for display only; the ledger stores minor units. */
export function formatPeur(minorUnits: bigint): string {
  const negative = minorUnits < 0n;
  const abs = negative ? -minorUnits : minorUnits;
  const whole = (abs / PEUR_SCALE).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  // Trailing zeros trimmed to two, so ordinary amounts read as money rather than
  // as "1,000.000000" — but a fraction finer than a cent is never hidden.
  const fraction = (abs % PEUR_SCALE)
    .toString()
    .padStart(PEUR_DECIMALS, "0")
    .replace(/(\d{2})(0+)$/, "$1");
  return `${negative ? "-" : ""}${whole}.${fraction}`;
}

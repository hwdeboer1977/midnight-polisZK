/** 5000000000n -> "5,000,000,000". Raw ledger units are never scaled here. */
export function group(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Midnight's native units, in atomic units per whole token.
 *
 * Neither is declared anywhere in the SDK, so both were measured against a
 * wallet rather than assumed: raw 5000000000 tNIGHT renders as `5,000.0`, and a
 * raw dust balance of ~3.04e18 renders as ~3044. DUST's atomic unit is named in
 * the SDK — "DUST generation rate in SPECK per second" — which is why the tile
 * says SPECKs and not STARs.
 *
 * If a wallet ever disagrees with these, the wallet is the evidence and these
 * are the bug.
 */
export const NIGHT_DECIMALS = 6;
export const DUST_DECIMALS = 15;

/**
 * Renders an atomic-unit integer as a decimal amount.
 *
 * Truncates rather than rounds: a balance shown as larger than it is invites
 * spending money that is not there.
 */
export function formatUnits(value: bigint, decimals: number, fractionDigits = 2): string {
  const scale = 10n ** BigInt(decimals);
  const whole = group(value / scale);
  if (fractionDigits === 0) return whole;
  const fraction = (value % scale).toString().padStart(decimals, "0").slice(0, fractionDigits);
  return `${whole}.${fraction}`;
}

/** pEUR is denominated to six decimals — see src/utils/constructor-args.ts. */
export const PEUR_DECIMALS = 6;

/** 1 pEUR, in minor units. */
export const PEUR_SCALE = 10n ** BigInt(PEUR_DECIMALS);

/**
 * 1000000000000n -> "1,000,000.00". Safe to scale because pEUR's minor units are
 * defined by our own contract. tNIGHT and tDUST are deliberately not scaled: the
 * SDK defines no decimals for them, and guessing a divisor would produce
 * confidently wrong numbers.
 *
 * Trailing zeros are trimmed to two so ordinary amounts read as money, while a
 * fraction finer than a cent is still shown rather than silently rounded away.
 */
export function formatPeur(value: bigint): string {
  const fraction = (value % PEUR_SCALE)
    .toString()
    .padStart(PEUR_DECIMALS, "0")
    .replace(/(\d{2})(0+)$/, "$1");
  return `${group(value / PEUR_SCALE)}.${fraction}`;
}

/** Keeps both ends visible, which is what makes an address recognisable. */
export function truncate(value: string, head = 14, tail = 10): string {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

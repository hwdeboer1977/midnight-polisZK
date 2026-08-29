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

/**
 * A money figure for a dashboard tile: always two decimals.
 *
 * `formatPeur` shows what the ledger holds, to the minor unit — correct, and
 * wrong for a headline. Withheld tax comes out at €55.055, which next to €4.62
 * reads as either fifty-five euros or fifty-five thousand depending on which
 * decimal convention the reader has in mind. Two decimals everywhere removes
 * the question; callers put the exact figure in a `title` so nothing is lost.
 *
 * Rounds half up, so a displayed total is never below what is actually held.
 */
export function formatPeurTile(value: bigint): string {
  const cents = (value + 5000n) / 10000n;
  return `${group(cents / 100n)}.${(cents % 100n).toString().padStart(2, "0")}`;
}

/** Keeps both ends visible, which is what makes an address recognisable. */
export function truncate(value: string, head = 14, tail = 10): string {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/**
 * A typed pEUR figure -> minor units, or `null` when it is not one.
 *
 * The inverse of `formatPeur`, and the reason a field can say "100" and mean a
 * hundred euros. The wire still carries minor units — `parsePeurAmount` on the
 * service is the one authority on what a valid amount is — so this only decides
 * where the decimal point goes, and refuses rather than rounds: an amount with
 * a seventh decimal is a figure the token cannot represent, and silently
 * dropping it would deposit something other than what was read on screen.
 *
 * A comma is accepted as the decimal separator, since this is a euro amount and
 * half of Europe types one. Grouping separators are not, because "1,000" would
 * then be ambiguous between a thousand and one.
 */
export function parsePeurInput(raw: string): bigint | null {
  const match = /^(\d*)(?:[.,](\d{1,6}))?$/.exec(raw.trim());
  if (!match || (!match[1] && !match[2])) return null;
  const minor = BigInt(match[1] || "0") * PEUR_SCALE + BigInt((match[2] ?? "").padEnd(6, "0"));
  return minor > 0n ? minor : null;
}

/**
 * Minor units -> a string this app's own pEUR fields accept.
 *
 * Not `formatPeur`: that groups thousands for reading, and a grouped figure put
 * back into an input is no longer parseable. Exact to the minor unit, with
 * trailing zeros dropped so a whole amount reads as "100" rather than
 * "100.000000".
 */
export function toPeurInput(minor: bigint): string {
  const fraction = (minor % PEUR_SCALE).toString().padStart(PEUR_DECIMALS, "0").replace(/0+$/, "");
  return fraction ? `${minor / PEUR_SCALE}.${fraction}` : String(minor / PEUR_SCALE);
}

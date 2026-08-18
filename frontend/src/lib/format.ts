/** 5000000000n -> "5,000,000,000". Raw ledger units are never scaled here. */
export function group(value: bigint): string {
  return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * 100000000n -> "1,000,000.00". Safe to scale because pEUR's minor units are
 * defined by our own contract as cents. tNIGHT and tDUST are deliberately not
 * scaled: the SDK defines no decimals for them, and guessing a divisor would
 * produce confidently wrong numbers.
 */
export function formatPeur(value: bigint): string {
  return `${group(value / 100n)}.${(value % 100n).toString().padStart(2, "0")}`;
}

/** Keeps both ends visible, which is what makes an address recognisable. */
export function truncate(value: string, head = 14, tail = 10): string {
  return value.length <= head + tail + 1
    ? value
    : `${value.slice(0, head)}…${value.slice(-tail)}`;
}

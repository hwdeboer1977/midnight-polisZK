/**
 * pEUR amount handling and the supply minted right after deployment.
 *
 * The initial mint is a second transaction rather than constructor work: a
 * deploy transaction cannot carry a zswap mint, because the contract address —
 * and therefore the token type derived from it — is not fixed until the
 * transaction is built. `npm run deploy:peur` runs both steps.
 */

/** Default initial supply: 1,000,000.00 pEUR, in minor units (cents). */
export const DEFAULT_PEUR_SUPPLY = 100_000_000n;

/** Matches the contract's Uint<48> bound on mint amounts. */
export const MAX_PEUR_AMOUNT = (1n << 48n) - 1n;

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

/** Supply minted immediately after deploying pEUR. */
export function initialPeurSupply(): bigint {
  const raw = process.env.PEUR_INITIAL_SUPPLY;
  return raw ? parsePeurAmount(raw) : DEFAULT_PEUR_SUPPLY;
}

/** 12345678 -> "123,456.78" for display only; the ledger stores minor units. */
export function formatPeur(minorUnits: bigint): string {
  const negative = minorUnits < 0n;
  const abs = negative ? -minorUnits : minorUnits;
  const whole = (abs / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  const cents = (abs % 100n).toString().padStart(2, "0");
  return `${negative ? "-" : ""}${whole}.${cents}`;
}

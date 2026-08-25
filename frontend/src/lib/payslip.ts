/**
 * A payslip: the opening of one on-chain salary commitment, carried by hand.
 *
 * The employee cannot be sent this over the chain, and the reason is worth
 * stating because the obvious alternatives all look workable until they are
 * tried. Sealing the opening to the employee's encryption public key — which
 * the roster already carries — produces ciphertext they can never open: the
 * DApp connector exposes `shieldedEncryptionPublicKey` and `signData`, and no
 * decrypt operation at all. Deriving a key from a wallet signature fails too,
 * because the connector signs non-deterministically, so the same message yields
 * a different key every time. `openings.ts` records both dead ends.
 *
 * So the payslip travels out of band — as a file — and the chain is used to
 * VERIFY it rather than to store it. That is the better shape anyway:
 * a server that could show an employee their salary is a server that knows
 * every salary, which is the property this whole system exists to avoid.
 *
 * What the employee ends up with is stronger than a payslip fetched from an
 * employer's portal. Three facts already on chain, none of them alterable
 * after the fact:
 *
 *   - `payeeFor` proves the slot is theirs, checked against their own wallet
 *     key — an employer cannot issue them someone else's line;
 *   - `commitmentsFor` proves the figures are the ones committed BEFORE
 *     payday, so a payslip edited afterwards fails the hash;
 *   - the circuit refused any coin whose value was not the committed net, so
 *     the amount that arrived is the amount shown here.
 *
 * A payslip is therefore self-authenticating and worthless to forge. It is
 * still PRIVATE — it holds the salary and the nonce in clear — so it is sent
 * to one employee, not published.
 */

/** Bumped only for a breaking layout change, so an old file fails loudly. */
export const PAYSLIP_VERSION = 1;

export interface Payslip {
  v: number;
  /** Which contract, hex without 0x. Binds the slip to one employer instance. */
  contract: string;
  period: number;
  slot: number;
  /** Display only. Never verified — the wallet key is what proves identity. */
  employee?: string;
  /** Minor units as decimal strings: JSON has no bigint. */
  gross: string;
  tax: string;
  social: string;
  net: string;
  weeks: number;
  /** Hex, 32 bytes. The secret that makes the commitment openable. */
  nonce: string;
}

export interface PayslipLine {
  grossMinor: bigint;
  taxMinor: bigint;
  socialMinor: bigint;
  netMinor: bigint;
  weeks: number;
}

export function payslipLine(slip: Payslip): PayslipLine {
  return {
    grossMinor: BigInt(slip.gross),
    taxMinor: BigInt(slip.tax),
    socialMinor: BigInt(slip.social),
    netMinor: BigInt(slip.net),
    weeks: slip.weeks,
  };
}

export function buildPayslip(options: {
  contractAddress: string;
  period: number;
  slot: number;
  employee?: string;
  line: PayslipLine;
  nonce: Uint8Array;
}): Payslip {
  const { contractAddress, period, slot, employee, line, nonce } = options;
  return {
    v: PAYSLIP_VERSION,
    contract: contractAddress.replace(/^0x/, "").toLowerCase(),
    period,
    slot,
    ...(employee ? { employee } : {}),
    gross: line.grossMinor.toString(),
    tax: line.taxMinor.toString(),
    social: line.socialMinor.toString(),
    net: line.netMinor.toString(),
    weeks: line.weeks,
    nonce: bytesToHex(nonce),
  };
}

/**
 * Reads a payslip file.
 *
 * One shape: the JSON an employer downloaded and sent. It used to accept an
 * encoded blob and a URL fragment as well, for a paste box and a "Copy link"
 * button that have both been removed — so links no longer open, deliberately,
 * and the error says so rather than failing as malformed JSON. Being strict
 * here buys nothing —
 * every one of these is unambiguous, and the hash check downstream is what
 * decides whether the content is real.
 */
export function decodePayslip(input: string): Payslip {
  const text = input.trim();
  if (!text) throw new Error("Nothing to read");

  // JSON only. Payslips are handed over as files, and the encoded-blob and
  // URL-fragment shapes this used to accept were for a "Copy link" button and a
  // paste box that no longer exist — so a link is now read as what it is: not a
  // payslip.
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error(
      "That is not a payslip file. Open the .json your employer sent you — a " +
        "link or pasted text will not work."
    );
  }

  const slip = parsed as Payslip;
  if (typeof slip?.v !== "number" || typeof slip?.contract !== "string") {
    throw new Error("That is not a payslip — it is missing the expected fields.");
  }
  if (slip.v !== PAYSLIP_VERSION) {
    throw new Error(
      `This payslip is version ${slip.v}, and this page reads version ${PAYSLIP_VERSION}.`
    );
  }
  for (const field of ["gross", "tax", "social", "net", "nonce"] as const) {
    if (typeof slip[field] !== "string") {
      throw new Error(`This payslip has no ${field} — it is incomplete.`);
    }
  }
  return slip;
}

export function payslipFilename(slip: Payslip): string {
  const who = (slip.employee ?? `slot-${slip.slot + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
  return `payslip-${slip.period}-${who || `slot-${slip.slot + 1}`}.json`;
}

/** The pure circuit this module needs, and nothing else. */
export interface PayslipCircuits {
  commitmentFor(
    gross: bigint,
    tax: bigint,
    social: bigint,
    net: bigint,
    weeks: bigint,
    period: bigint,
    employer: { bytes: Uint8Array },
    paramsHash: Uint8Array,
    nonce: Uint8Array
  ): Uint8Array;
}

/** What the chain says about the slot a payslip claims to be for. */
export interface PayslipAnchor {
  /** `ledger.employer.bytes` — the commitment is bound to who filed it. */
  employer: Uint8Array;
  /** `paramsHashFor[period]` — which rule set the period was filed under. */
  paramsHash: Uint8Array;
  /** `commitmentsFor[period][slot]`, hex. */
  commitment: string;
}

/**
 * Hex helpers, local rather than imported from `lib/keys`.
 *
 * This module is deliberately dependency-free so it can be imported straight
 * into a Node test — `tests/payslip.test.mjs` checks a payslip against the real
 * compiled circuit, which is the only way to know that an edited one actually
 * fails rather than merely looking as though it would.
 */
export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

export function fromHex(value: string): Uint8Array {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

/**
 * Whether a payslip opens the commitment the chain holds for its slot.
 *
 * Recomputed with the contract's OWN pure circuit rather than a TypeScript
 * hash that could drift from Compact's struct encoding — the same reason
 * `submitPayroll` and the employee's payee check both call into `pureCircuits`.
 * No wallet, no transaction, no proof: this runs locally in the page.
 */
export function verifyPayslip(
  circuits: PayslipCircuits,
  slip: Payslip,
  anchor: PayslipAnchor
): boolean {
  if (!anchor.commitment) return false;

  const computed = circuits.commitmentFor(
    BigInt(slip.gross),
    BigInt(slip.tax),
    BigInt(slip.social),
    BigInt(slip.net),
    BigInt(slip.weeks),
    BigInt(slip.period),
    { bytes: anchor.employer },
    anchor.paramsHash,
    fromHex(slip.nonce)
  );
  return bytesToHex(computed) === anchor.commitment.replace(/^0x/, "").toLowerCase();
}

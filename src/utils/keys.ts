/** Hex helpers for the two public keys the shielded token flow deals in. */

export const hex = (bytes: Uint8Array) => Buffer.from(bytes).toString("hex");

/** Circuits take a ZswapCoinPublicKey as `{ bytes }`; users paste it as hex. */
export function toPublicKey(input: string): { bytes: Uint8Array } {
  const value = input.trim().replace(/^0x/, "");
  if (!/^[0-9a-fA-F]{64}$/.test(value)) {
    throw new Error("A coin public key is 64 hex characters");
  }
  return { bytes: Uint8Array.from(Buffer.from(value, "hex")) };
}

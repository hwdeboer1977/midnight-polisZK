import { toPublicKey } from "./keys.js";

/**
 * Where withheld tax and contributions are sent, read from the environment.
 *
 * Every payroll contract freezes both destinations in its constructor and can
 * never change them, so they are required rather than defaulted. Falling back
 * to the deployer's own key would produce a contract that remits tax to the
 * platform — which would deploy cleanly, run correctly, and be wrong in a way
 * nobody notices until somebody asks where the tax went.
 *
 * Shared by the deploy script and the self-service onboarding path, because a
 * contract deployed by one and a contract deployed by the other must send
 * money to the same place.
 */
export interface TreasuryKeys {
  tax: { bytes: Uint8Array };
  social: { bytes: Uint8Array };
}

export class TreasuryKeysMissing extends Error {
  constructor() {
    super(
      "TAX_TREASURY_KEY and SOCIAL_TREASURY_KEY must both be set — a payroll " +
        "contract freezes both destinations at deploy and can never change them. " +
        "Generate keys with `npm run payee`."
    );
    this.name = "TreasuryKeysMissing";
  }
}

export function treasuryKeys(): TreasuryKeys {
  const tax = process.env.TAX_TREASURY_KEY?.trim();
  const social = process.env.SOCIAL_TREASURY_KEY?.trim();
  if (!tax || !social) throw new TreasuryKeysMissing();
  return { tax: toPublicKey(tax), social: toPublicKey(social) };
}

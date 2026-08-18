import type { ChargedState } from "@midnight-ntwrk/compact-runtime";

/**
 * Generated contract modules, loaded on demand. The import pulls in the runtime
 * WASM (~1.4 MB), so it stays out of the initial bundle and only downloads when
 * a page actually decodes contract state.
 *
 * The map is explicit rather than a template import because the loaders have to
 * be statically analysable for the bundler to split them.
 */
type ContractModule = { ledger: (state: ChargedState) => unknown };

const LOADERS: Record<string, () => Promise<ContractModule>> = {
  payroll: () => import("../generated/payroll/index.js"),
  peur: () => import("../generated/peur/index.js"),
};

const cache = new Map<string, Promise<ContractModule>>();

export function loadContract(contractName: string) {
  const loader = LOADERS[contractName];
  if (!loader) throw new Error(`No generated module for "${contractName}"`);

  let pending = cache.get(contractName);
  if (!pending) {
    pending = loader();
    cache.set(contractName, pending);
  }
  return pending;
}

/** Public ledger shape of payroll.compact. */
export interface PayrollLedger {
  platform: { bytes: Uint8Array };
  employer: { bytes: Uint8Array };
  employerAssigned: boolean;
  employeeCount: bigint;
  totalPayroll: bigint;
  commitments: {
    size(): bigint;
    member(key: bigint): boolean;
    lookup(key: bigint): Uint8Array;
    [Symbol.iterator](): Iterator<[bigint, Uint8Array]>;
  };
}

/** Public ledger shape of peur.compact. */
export interface PeurLedger {
  issuer: { bytes: Uint8Array };
  tokenId: Uint8Array;
  totalSupply: bigint;
  mintCounter: bigint;
}

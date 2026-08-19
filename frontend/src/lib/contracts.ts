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
  /** YYYYMM of the most recent run, 0 before any. */
  latestPeriod: bigint;
  periods: LedgerSet<bigint>;
  employeeCountFor: LedgerMap<bigint, bigint>;
  totalPayrollFor: LedgerMap<bigint, bigint>;
  /** period -> employee index -> commitment. */
  commitmentsFor: LedgerMap<bigint, LedgerMap<bigint, Uint8Array>>;
  /**
   * period -> employee index -> the opening, encrypted to the employer's key.
   * Opaque here: the browser never holds the wallet secret that opens it.
   */
  sealedFor: LedgerMap<bigint, LedgerMap<bigint, Uint8Array>>;
}

interface LedgerMap<K, V> {
  size(): bigint;
  member(key: K): boolean;
  lookup(key: K): V;
  [Symbol.iterator](): Iterator<[K, V]>;
}

interface LedgerSet<T> {
  size(): bigint;
  member(value: T): boolean;
  [Symbol.iterator](): Iterator<T>;
}

/** Public ledger shape of peur.compact. */
export interface PeurLedger {
  issuer: { bytes: Uint8Array };
  tokenId: Uint8Array;
  totalSupply: bigint;
  mintCounter: bigint;
}

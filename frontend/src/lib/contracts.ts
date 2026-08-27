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
  fund: () => import("../generated/fund/index.js"),
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
  /** Set by the platform's `revoke`; every employer circuit then refuses. */
  revoked: boolean;
  /** YYYYMM of the most recent run, 0 before any. */
  latestPeriod: bigint;
  periods: LedgerSet<bigint>;
  employeeCountFor: LedgerMap<bigint, bigint>;
  /** The four public column totals. gross = tax + social + net, per period. */
  totalPayrollFor: LedgerMap<bigint, bigint>;
  totalTaxFor: LedgerMap<bigint, bigint>;
  totalSocialFor: LedgerMap<bigint, bigint>;
  totalNetFor: LedgerMap<bigint, bigint>;
  /** Withheld and held by the contract, and what has been remitted onward. */
  taxPool: bigint;
  socialPool: bigint;
  taxRemitted: bigint;
  socialRemitted: bigint;
  /** period -> employee index -> commitment. */
  commitmentsFor: LedgerMap<bigint, LedgerMap<bigint, Uint8Array>>;
  /**
   * period -> hash of the rule set it was filed under.
   *
   * Part of every commitment, so opening one needs it — which is why it is
   * public: an employee verifying their own payslip must be able to read the
   * same value the circuit hashed.
   */
  paramsHashFor: LedgerMap<bigint, Uint8Array>;
  /**
   * period -> employee index -> the opening, encrypted to the employer's key.
   * Opaque here: the browser never holds the wallet secret that opens it.
   */
  sealedFor: LedgerMap<bigint, LedgerMap<bigint, Uint8Array>>;
  /** period -> employee index -> whether that slot is funded / paid. */
  fundedFor: LedgerMap<bigint, LedgerMap<bigint, boolean>>;
  /** Whether a period's withheld tax and contribution have reached the pools. */
  withheldFor: LedgerMap<bigint, boolean>;
  paidFor: LedgerMap<bigint, LedgerMap<bigint, boolean>>;
  /** period -> employee index -> hash of the payee's coin public key. */
  payeeFor: LedgerMap<bigint, LedgerMap<bigint, Uint8Array>>;
  /**
   * period -> employee index -> the employer's statement that employment ended.
   *
   * A commitment binding the final period, the months worked and the
   * claimant's claim-key hash. Opaque here on purpose: the first two would be a
   * public tenure record, and the third a stable per-person handle visible at
   * every employer that person used it with.
   */
  terminationFor: LedgerMap<bigint, LedgerMap<bigint, Uint8Array>>;
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

/**
 * Decodes payroll state, or returns null if the deployment predates this build.
 *
 * `ledger()` is LAZY: handed state from a contract with a different field
 * layout it returns an object quite happily, and throws only when a field is
 * read — at whatever point in the render that happens to be. So a
 * `try { ledger(...) } catch` guard catches nothing, which is exactly what it
 * did here: the whole public page went blank on "index out of bounds in idx:
 * 4 >= 2", raised from a getter three components away from the decode.
 *
 * Touching fields immediately is what turns that into an answerable question.
 * The two probes are chosen to sit late in the layout, where a shifted or
 * retyped field shows up; a field near the front can decode correctly against
 * the wrong contract and prove nothing.
 */
export function decodePayrollLedger(
  contract: { ledger: (state: ChargedState) => unknown },
  data: ChargedState
): PayrollLedger | null {
  let ledger: PayrollLedger;
  try {
    ledger = contract.ledger(data) as PayrollLedger;
  } catch {
    return null;
  }

  try {
    void ledger.employerAssigned;
    void ledger.revoked;
    void ledger.taxPool;
    void ledger.latestPeriod;
  } catch {
    return null;
  }
  return ledger;
}

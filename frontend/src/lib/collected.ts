/**
 * What an employer has collected from each employee, remembered locally.
 *
 * Two things have to travel from an employee to their employer before the
 * system can do its job, and **the chain records neither of them**:
 *
 *   - the two public keys, which go into the roster workbook. `payeeFor`
 *     publishes only a hash of the coin key, so the chain can say a slot has a
 *     payee and never who;
 *   - the claim-key hash, which goes into a termination attestation. Until that
 *     attestation exists there is nothing on chain about it at all — and by
 *     then it is too late to collect one, because the attestation is write-once.
 *
 * So the outstanding-work signal an employer most needs is the one nothing can
 * derive. This is that signal, and it is honest about its limits: it is what
 * THIS BROWSER has been told, not what is true. It can only ever undercount —
 * a hash collected on another machine shows as missing here — which is the
 * right direction for a reminder to be wrong in.
 *
 * Only hashes and public keys are stored. Nothing here is a secret, and nothing
 * here can spend or claim anything.
 */

const KEY = "polisZK/collected/v1";

export interface CollectedFrom {
  /** The employee's coin public key, as it appears in the roster. */
  coinPublicKey: string;
  /** Their claim-key hash, once they have sent it. */
  claimKeyHash?: string;
  /**
   * Their name, from the workbook.
   *
   * The chain publishes a hash of the coin key and nothing else, so a page that
   * rebuilds the roster from `payeeFor` can show a hash and never a person.
   * Remembering the name here is what lets it show one — locally, which is the
   * option the roster page already names as honest.
   */
  fullName?: string;
  /** When it was recorded, for a reminder that says how long it has been. */
  at?: string;
}

type Store = Record<string, Record<string, CollectedFrom>>;

function read(): Store {
  try {
    return JSON.parse(window.localStorage.getItem(KEY) ?? "{}") as Store;
  } catch {
    return {};
  }
}

function write(store: Store): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(store));
  } catch {
    // A browser refusing storage costs the reminder, not the data — the hash
    // still reaches the termination form by being pasted.
  }
}

/** Everything recorded for one payroll contract. */
export function collectedFor(contractAddress: string): Record<string, CollectedFrom> {
  return read()[contractAddress.toLowerCase()] ?? {};
}

/**
 * Remembers who is on a workbook, so pages rebuilt from chain can name them.
 *
 * Called whenever a workbook is parsed. It never overwrites a claim-key hash
 * already collected — the two facts arrive from different directions and a
 * fresh workbook should not forget one.
 */
export function recordRoster(
  contractAddress: string,
  rows: { fullName: string; coinPublicKey: string }[]
): void {
  const store = read();
  const key = contractAddress.toLowerCase();
  const forContract = store[key] ?? {};
  for (const row of rows) {
    if (!row.coinPublicKey) continue;
    forContract[row.coinPublicKey] = {
      ...forContract[row.coinPublicKey],
      coinPublicKey: row.coinPublicKey,
      fullName: row.fullName || forContract[row.coinPublicKey]?.fullName,
    };
  }
  store[key] = forContract;
  write(store);
}

export function recordClaimKeyHash(
  contractAddress: string,
  coinPublicKey: string,
  claimKeyHash: string
): void {
  const store = read();
  const key = contractAddress.toLowerCase();
  const forContract = store[key] ?? {};
  forContract[coinPublicKey] = {
    coinPublicKey,
    claimKeyHash,
    at: new Date().toISOString(),
  };
  store[key] = forContract;
  write(store);
}

export function forgetClaimKeyHash(contractAddress: string, coinPublicKey: string): void {
  const store = read();
  const key = contractAddress.toLowerCase();
  if (store[key]?.[coinPublicKey]) {
    delete store[key][coinPublicKey];
    write(store);
  }
}

export interface CollectionStatus {
  /** Employees on the loaded workbook, or null when none is open. */
  total: number | null;
  /** How many of them have a claim-key hash recorded here. */
  withHash: number;
  /** Those that do not, by name, so the reminder can be specific. */
  missing: { fullName: string; coinPublicKey: string }[];
}

/**
 * Progress against the roster currently open.
 *
 * The denominator comes from the workbook rather than the chain, because the
 * chain knows how many payees a period had and not who they are. With no
 * workbook loaded there is no denominator, and the panel says so rather than
 * inventing one.
 */
export function collectionStatus(
  contractAddress: string,
  rows: { fullName: string; coinPublicKey: string }[] | null
): CollectionStatus {
  const known = collectedFor(contractAddress);
  if (!rows) {
    return {
      total: null,
      withHash: Object.values(known).filter((e) => e.claimKeyHash).length,
      missing: [],
    };
  }
  const missing = rows.filter((row) => !known[row.coinPublicKey]?.claimKeyHash);
  return { total: rows.length, withHash: rows.length - missing.length, missing };
}

/**
 * Slot → name for one period, by recognising payee hashes.
 *
 * The chain stores `payeeHash(coinPublicKey, period, contract)` per slot and
 * never the key, so a name cannot be looked up — every employee this browser
 * remembers is hashed against the period and a match identifies the slot.
 *
 * Returns an empty map when nothing is remembered, which is the correct answer
 * on a machine that has never seen a workbook: slot numbers, and no pretence
 * that the chain knew more than it does.
 */
export async function namesBySlot(
  networkId: string,
  contractAddress: string,
  period: number
): Promise<Record<number, string>> {
  const known = Object.values(collectedFor(contractAddress)).filter((e) => e.fullName);
  if (known.length === 0) return {};

  const [{ fetchContractState }, { decodePayrollLedger, loadContract }, { bytesToHex, keyToHex }] =
    await Promise.all([
      import("./chain"),
      import("./contracts"),
      import("./keys"),
    ]);

  const state = await fetchContractState(networkId, contractAddress);
  if (!state) return {};
  const contract = await loadContract("payroll");
  const ledger = decodePayrollLedger(contract, state.data);
  if (!ledger?.payeeFor.member(BigInt(period))) return {};

  const toBytes = (hex: string): Uint8Array => {
    const clean = hex.replace(/^0x/, "");
    const out = new Uint8Array(clean.length / 2);
    for (let i = 0; i < out.length; i += 1) {
      out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
    }
    return out;
  };

  const instance = toBytes(contractAddress);
  const byHash: Record<string, string> = {};
  for (const employee of known) {
    const hash = bytesToHex(
      (contract as any).pureCircuits.payeeHash(
        { bytes: toBytes(keyToHex(employee.coinPublicKey)) },
        BigInt(period),
        instance
      )
    );
    byHash[hash] = employee.fullName!;
  }

  const payees = ledger.payeeFor.lookup(BigInt(period));
  const out: Record<number, string> = {};
  for (const [slot, hash] of payees) {
    const name = byHash[bytesToHex(hash)];
    if (name) out[Number(slot)] = name;
  }
  return out;
}

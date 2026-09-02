// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Who is on an employer's payroll, remembered locally.
 *
 * `payeeFor` publishes only a hash of the coin key, so the chain can say a slot
 * has a payee and never who. A page rebuilding the roster from chain therefore
 * shows slot numbers unless something local recognises them, and this is that
 * something: name and public key, per contract.
 *
 * ⚠️ It used to track a claim-key hash per employee too, and that was the whole
 * point of it — the outstanding-work signal nothing could derive. Removing the
 * claim key removed the signal and the work: a termination now binds only what
 * the chain and the employer's passphrase reproduce, so there is nothing left
 * to collect from anybody.
 *
 * Honest about its limits either way: this is what THIS BROWSER has been told,
 * not what is true. A roster loaded on another machine is not here — which is
 * what the sealed roster exists to repair.
 *
 * Only names and public keys. Nothing here is a secret, and nothing here can
 * spend or claim anything.
 */

const KEY = "polisZK/collected/v1";

export interface CollectedFrom {
  /** The employee's coin public key, as it appears in the roster. */
  coinPublicKey: string;
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
    // A browser refusing storage costs the names, not the data — the workbook
    // and the sealed roster both still carry them.
  }
}

/** Everything recorded for one payroll contract. */
export function collectedFor(contractAddress: string): Record<string, CollectedFrom> {
  return read()[contractAddress.toLowerCase()] ?? {};
}

/**
 * Remembers who is on a workbook, so pages rebuilt from chain can name them.
 *
 * Called whenever a workbook is parsed, and whenever the sealed roster is
 * unlocked. Merges rather than replaces, so a second source adds names without
 * discarding what the first one knew.
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

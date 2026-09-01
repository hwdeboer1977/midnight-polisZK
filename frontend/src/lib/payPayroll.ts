// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { fetchContractState, INDEXERS, INDEXER_WS } from "./chain";
import {
  deriveEmployerKey,
  deriveNonce,
  openSealed,
  sealedCoinNonce,
  withholdingCoinNonce,
  type PayrollLine,
} from "./openings";
import { DUTCH_V1, computeLine } from "../generated/tax-params";
import { submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { connectContract, type ProvingMode } from "./submitPayroll";
import { apiUrl } from "./origin";
import { bytesToHex } from "./keys";

/**
 * Funding and paying a filed period.
 *
 * Two steps, and the split is forced rather than chosen. `sendShielded` needs a
 * `QualifiedShieldedCoinInfo`, which carries the coin's `mt_index` — its leaf
 * position in the Zswap tree. A coin received in the same transaction has no
 * index yet, so a contract cannot receive and forward money atomically. Escrow
 * is the only shape available: fund now, pay once the coins are in the tree.
 *
 * That is also how payroll actually works, so it costs nothing in realism.
 */

/** One slot's state, as the contract sees it. */
export interface SlotState {
  index: number;
  /**
   * The whole line. The commitment covers all four amounts plus the weeks, so
   * opening it needs every one of them — and the coin that settles the slot
   * carries `netMinor`, not the gross.
   */
  line: PayrollLine;
  funded: boolean;
  paid: boolean;
}

export interface StepProgress {
  (step: string): void;
}

/**
 * Reads which slots of a period are funded and paid.
 *
 * Salaries come from the caller — the chain holds only commitments, so the
 * amounts have to come from the roster or the sealed openings.
 */
/**
 * The two public keys one payment needs, from the roster.
 *
 * Both, always. The coin public key names the recipient inside the circuit; the
 * encryption public key is what the coin's ciphertext is encrypted to. Supply
 * only the first and the payment succeeds, the contract marks the slot paid,
 * and the employee's wallet never sees a thing.
 */
export interface PayeeKeys {
  /** Hex, 32 bytes. */
  coinPublicKey: string;
  /** Hex. */
  encryptionPublicKey: string;
}

/**
 * Refuses a run that cannot open the commitments, before anything is proved.
 *
 * `fundEmployee` recomputes the commitment from the figures and the nonce and
 * asserts it matches what was filed. That check is the right one and it is in
 * the right place — but it runs inside the circuit, so reaching it costs a full
 * proving cycle, and what it reports is `failed assert: the figures and nonce
 * do not open the commitment for that employee`, which names neither of the two
 * things actually capable of being wrong.
 *
 * They are: a different workbook than the one filed, or a different passphrase.
 * The passphrase is the likelier by far, because the file step collapses once a
 * month is filed and a later session has to type it again from memory with
 * nothing to check it against — while filing itself refuses a wrong one up
 * front (`deriveKeyAndVerify` in `submitPayroll`). Funding had no equivalent,
 * so the same mistake cost thirty seconds and an unreadable error instead of
 * being named immediately.
 *
 * The same arithmetic as the circuit, run locally: hash each unfunded slot's
 * figures with its derived nonce and compare against `commitmentsFor`. Nothing
 * is sent, nothing is signed, and the two causes are distinguishable — every
 * slot failing means the passphrase, some slots failing means the workbook.
 */
async function checkOpensCommitments(options: {
  contractModule: any;
  ledger: any;
  period: number;
  slots: SlotState[];
  employerKey: Uint8Array;
}): Promise<void> {
  const { contractModule, ledger, period, slots, employerKey } = options;
  const p = BigInt(period);

  if (!ledger.commitmentsFor?.member(p)) return; // nothing filed; the circuit will say so
  const commitments = ledger.commitmentsFor.lookup(p);
  const paramsHash = ledger.paramsHashFor?.member(p)
    ? ledger.paramsHashFor.lookup(p)
    : null;
  const commitmentFor = contractModule?.pureCircuits?.commitmentFor;
  // Older builds may not expose it. A missing pre-check must not stop a run
  // that the circuit would have accepted.
  if (!paramsHash || typeof commitmentFor !== "function") return;

  // Only what this run will actually submit. A slot already funded was opened
  // by a previous run and is skipped by `fundPeriod` anyway, so failing on it
  // would block a legitimate resume after a partial failure.
  const pending = slots.filter((slot) => !slot.funded || !slot.paid);
  const sealed = ledger.sealedFor?.member(p) ? ledger.sealedFor.lookup(p) : null;
  const money = (v: bigint) => `€${(Number(v) / 1e6).toFixed(2)}`;

  for (const slot of pending) {
    const key = BigInt(slot.index);
    if (!commitments.member(key)) continue;

    // The sealed opening first, because it answers the question the commitment
    // cannot: it is encrypted under a key derived from the same passphrase, so
    // whether it DECRYPTS separates a wrong passphrase from correct figures,
    // and once open it hands back the exact numbers that were filed.
    //
    // Without this the check could only report "the commitment does not open",
    // which is true of both causes and blames whichever one the message picked.
    let filed: (PayrollLine & { nonce: Uint8Array }) | null = null;
    if (sealed?.member(key)) {
      try {
        filed = await openSealed(employerKey, sealed.lookup(key));
      } catch {
        throw new Error(
          "That passphrase cannot open the sealed openings this period was " +
            "filed with, so it is not the one used to file it. It derives every " +
            "nonce, and a different one produces figures the contract refuses. " +
            "Nothing was sent."
        );
      }
    }

    // The passphrase is right. Anything wrong now is in the workbook, and the
    // filed figures are in hand — so name the field rather than the symptom.
    if (filed) {
      const differences = (
        [
          ["gross", filed.grossMinor, slot.line.grossMinor],
          ["tax", filed.taxMinor, slot.line.taxMinor],
          ["contribution", filed.socialMinor, slot.line.socialMinor],
          ["net", filed.netMinor, slot.line.netMinor],
        ] as const
      )
        .filter(([, was, now]) => was !== now)
        .map(([label, was, now]) => `${label} ${money(was)} → ${money(now)}`);
      if (filed.weeks !== slot.line.weeks) {
        differences.push(`weeks ${filed.weeks} → ${slot.line.weeks}`);
      }
      if (differences.length > 0) {
        throw new Error(
          `Employee ${slot.index + 1} was filed with different figures than the ` +
            `workbook now holds (${differences.join(", ")}). The chain stores a ` +
            "commitment to what was filed, so only that workbook can fund it. " +
            "Load the file this period was filed from, or re-file the period. " +
            "Nothing was sent."
        );
      }
    }

    const nonce = await deriveNonce(employerKey, period, slot.index);
    const computed = commitmentFor(
      slot.line.grossMinor,
      slot.line.taxMinor,
      slot.line.socialMinor,
      slot.line.netMinor,
      BigInt(slot.line.weeks),
      p,
      { bytes: ledger.employer.bytes },
      paramsHash,
      nonce
    );
    if (toHex(computed) !== toHex(commitments.lookup(key))) {
      // Figures match the seal and the passphrase opened it, yet the hash still
      // differs — so the disagreement is in something neither of those covers:
      // the employer key or the params hash the commitment was built over.
      throw new Error(
        `Employee ${slot.index + 1}'s commitment does not match, although the ` +
          "passphrase and the figures are both correct. That points at the " +
          "contract this month was filed against rather than at anything in " +
          "the workbook. Nothing was sent."
      );
    }
  }
}

export function slotStates(
  ledger: any,
  period: number,
  salaries: bigint[],
  weeks: number[]
): SlotState[] {
  const p = BigInt(period);
  const funded = ledger.fundedFor?.member(p) ? ledger.fundedFor.lookup(p) : null;
  const paid = ledger.paidFor?.member(p) ? ledger.paidFor.lookup(p) : null;

  return salaries.map((grossMinor, index) => {
    const computed = computeLine(grossMinor, DUTCH_V1);
    return {
    index,
    line: {
      grossMinor,
      taxMinor: computed.taxMinor,
      socialMinor: computed.contribMinor,
      netMinor: computed.netMinor,
      weeks: weeks[index] ?? 4,
    },
    funded: funded?.member(BigInt(index)) ? funded.lookup(BigInt(index)) : false,
    paid: paid?.member(BigInt(index)) ? paid.lookup(BigInt(index)) : false,
    };
  });
}

const toHexBytes = (value: string): Uint8Array => {
  const clean = value.replace(/^0x/, "");
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i += 1) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
};

/**
 * The nonce of the coin funding one slot.
 *
 * Derived, not random, for the same reason salary nonces are: the coin has to
 * be reconstructible later. Paying requires rebuilding the exact coin the
 * contract holds, and a random nonce would have to be written down somewhere
 * that can be lost — which is the failure this whole design keeps designing
 * away from.
 */
export { sealedCoinNonce as coinNonceFor };

/**
 * Funds a whole period — every slot's net AND the withholding — in ONE
 * transaction.
 *
 * ── What this closes ───────────────────────────────────────────────────────
 *
 * Funding slot by slot and then calling `fundWithholding` leaves a window in
 * which `fundedFor` is true and `withheldFor` is false: the employees are
 * covered and the employer is still holding money that is not theirs. That
 * state is visible on chain, which is the good part, and it is a state that can
 * be left in place. Here it cannot occur — the circuit receives all four coins
 * or none. Skipping the tax stops being something to notice and chase and
 * becomes something that cannot be built.
 *
 * ── Why it is one circuit and not several calls ────────────────────────────
 *
 * A call's transcript is computed against the state as it stands BEFORE the
 * transaction, so calls in one transaction cannot see each other's writes.
 * `coinsReceived` is incremented by every receipt and `payToken` is set by the
 * first coin and read by the rest — both would be wrong across separate calls.
 * A circuit sees its own writes; separate calls do not.
 *
 * ── The consequence the caller must respect ────────────────────────────────
 *
 * This creates FOUR coins in one transaction, and receipt ordinals then stop
 * agreeing with Zswap tree order. Measured: employee 0's coin at leaf 48188,
 * employee 1's at 48186 — inverted. Anything that later spends these must
 * locate them by rebuilding their commitment, never by indexing sorted leaves
 * against `coinOrdinalFor`. `runPayroll` does that; a new caller must too.
 */
export async function fundPeriodBatched(options: {
  deployed: any;
  contractModule: any;
  ledger: any;
  employerKey: Uint8Array;
  tokenId: string;
  period: number;
  round: number;
  slots: SlotState[];
  onProgress?: StepProgress;
}): Promise<number> {
  const { deployed, ledger, employerKey, tokenId, period, round, slots } = options;
  const onProgress = options.onProgress ?? (() => {});
  const key = BigInt(period);
  const color = toHexBytes(tokenId);

  // The circuit's roster is a fixed-width vector, so the slot count is not a
  // preference. Refused here, by name, rather than as an arity error from the
  // generated binding.
  if (slots.length !== 2) {
    throw new Error(
      `fundPeriod takes exactly 2 employees, got ${slots.length}. ` +
        "The roster width is fixed in the contract."
    );
  }

  // The totals the circuit will check the withholding coins against. Read from
  // the contract, not recomputed: they were accumulated per employee by
  // `setPayroll`, and a figure derived any other way would be checking a
  // different number from the one on chain.
  const taxMinor: bigint = ledger.totalTaxFor.member(key) ? ledger.totalTaxFor.lookup(key) : 0n;
  const socialMinor: bigint = ledger.totalSocialFor.member(key)
    ? ledger.totalSocialFor.lookup(key)
    : 0n;

  onProgress("Funding the period — net pay and withholding together, proving…");

  const salaryNonces = await Promise.all(
    slots.map((_, index) => deriveNonce(employerKey, period, index))
  );
  const netCoins = await Promise.all(
    slots.map(async (slot, index) => ({
      nonce: await sealedCoinNonce(employerKey, period, round, index),
      color,
      value: slot.line.netMinor,
    }))
  );

  await deployed.callTx.fundPeriod(
    key,
    slots.map((s) => s.line.grossMinor),
    slots.map((s) => s.line.taxMinor),
    slots.map((s) => s.line.socialMinor),
    slots.map((s) => s.line.netMinor),
    slots.map((s) => BigInt(s.line.weeks)),
    salaryNonces,
    netCoins,
    {
      nonce: await withholdingCoinNonce(employerKey, period, round, "tax"),
      color,
      value: taxMinor,
    },
    {
      nonce: await withholdingCoinNonce(employerKey, period, round, "social"),
      color,
      value: socialMinor,
    }
  );

  return slots.length;
}

/**
 * Funds every slot of a period that is not funded yet, ONE TRANSACTION EACH.
 *
 * The fallback path. `fundPeriodBatched` does the same work plus the withholding
 * in a single transaction and is what a fresh period should use; this one
 * remains because the batched circuit refuses a period that is partly funded —
 * it asserts every slot is unfunded — and a run interrupted half way through
 * has to be finishable.
 *
 * One coin per slot, each carrying exactly the committed salary. The circuit
 * checks that against the commitment on the way in, so a wrong figure is
 * refused here rather than discovered on payday.
 */
export async function fundSlotsSeparately(options: {
  api: ConnectedAPI;
  deployed: any;
  employerKey: Uint8Array;
  tokenId: string;
  period: number;
  /** Filing round, from `fileRoundFor` — keeps a re-filed period's coins distinct. */
  round: number;
  slots: SlotState[];
  onProgress?: StepProgress;
}): Promise<number> {
  const { deployed, employerKey, tokenId, period, round, slots } = options;
  const onProgress = options.onProgress ?? (() => {});

  const todo = slots.filter((s) => !s.funded);
  let done = 0;

  for (const slot of todo) {
    onProgress(
      `Funding employee ${slot.index + 1} of ${slots.length} — proving, a few minutes…`
    );
    const salaryNonce = await deriveNonce(employerKey, period, slot.index);
    const coinNonce = await sealedCoinNonce(employerKey, period, round, slot.index);

    // The coin carries net: what the employer funds for this slot is what the
    // worker is owed after withholding. Tax and the contribution are funded
    // once for the period by `fundWithholding`.
    await deployed.callTx.fundEmployee(
      BigInt(period),
      BigInt(slot.index),
      slot.line.grossMinor,
      slot.line.taxMinor,
      slot.line.socialMinor,
      slot.line.netMinor,
      BigInt(slot.line.weeks),
      salaryNonce,
      {
        nonce: coinNonce,
        color: toHexBytes(tokenId),
        value: slot.line.netMinor,
      }
    );
    done += 1;
  }
  return done;
}

/**
 * The leaf indices of the coins this contract owns, ascending.
 *
 * Read from the indexer rather than remembered locally. The contract stores
 * nothing about its own coins — deliberately, since storing a coin publishes
 * its value — so this is the only place the information exists.
 */
/**
 * The leaves belonging to one period, from the contract's full leaf list.
 *
 * `filter(address)` lists every coin the contract ever RECEIVED, spent ones
 * included — there is no unspent view and `nullifiers` reads empty. So the list
 * is a complete, creation-ordered history, and indexing it from zero pays the
 * first period's coins no matter which period is being paid. That produced
 * `Public transcript input mismatch` once a second period existed: the proof
 * was built over coins that had already been spent.
 *
 * Each funded period contributes exactly `rosterSize` leaves, in funding order,
 * so a period's coins start at `rosterSize × (periods funded before it)`.
 */
export function leavesForPeriod(
  allLeaves: number[],
  fundedPeriodsBefore: number,
  rosterSize: number
): number[] {
  const offset = fundedPeriodsBefore * rosterSize;
  const slice = allLeaves.slice(offset, offset + rosterSize);
  if (slice.length < rosterSize) {
    throw new Error(
      `Expected ${rosterSize} coins for this period at offset ${offset}, found ` +
        `${slice.length} of ${allLeaves.length}. The indexer may not have caught up ` +
        "with funding yet — wait a moment and try again."
    );
  }
  return slice;
}

export function contractLeaves(zswapStateText: string): number[] {
  return contractLeafEntries(zswapStateText).map((entry) => entry.index);
}

/**
 * The same leaves, with the commitment each one holds.
 *
 * The commitment is what makes a coin checkable before it is proved: rebuild it
 * from the fields about to be sent and it either matches the leaf or it does
 * not. Without this a wrong nonce, colour or value surfaces as
 * `Public transcript input mismatch` from the proof server — a message that
 * names none of them, and costs minutes of proving to reach.
 */
export function contractLeafEntries(
  zswapStateText: string
): { index: number; commitment: string }[] {
  return [...zswapStateText.matchAll(/(\d+): \(([0-9a-f]{64}), Some\(ContractAddress/g)]
    .map((m) => ({ index: Number(m[1]), commitment: m[2]!.toLowerCase() }))
    .sort((a, b) => a.index - b.index);
}

/**
 * Pays every slot that is funded and not yet paid.
 *
 * Slots are paid in index order and matched to the contract's coins in leaf
 * order, which holds because funding happens in index order too. A mismatch is
 * not dangerous: the circuit asserts the coin carries exactly the committed
 * salary, and assertions run during local execution — before balancing, before
 * anything reaches the chain — so a wrong pairing fails cheaply instead of
 * paying the wrong person.
 */
export async function payPeriod(options: {
  providers: any;
  compiledContract: any;
  contractAddress: string;
  employerKey: Uint8Array;
  tokenId: string;
  period: number;
  round: number;
  slots: SlotState[];
  payees: PayeeKeys[];
  leaves: number[];
  onProgress?: StepProgress;
}): Promise<number> {
  const {
    providers: contractProviders,
    compiledContract,
    contractAddress,
    employerKey,
    tokenId,
    period,
    round,
    slots,
    payees: payeeKeys,
    leaves,
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  const outstanding = slots.filter((s) => s.funded && !s.paid);
  if (outstanding.length === 0) return 0;

  if (leaves.length < slots.length) {
    throw new Error(
      `The contract shows ${leaves.length} coins for ${slots.length} employees — ` +
        "the indexer may not have caught up with funding yet. Try again in a moment."
    );
  }

  onProgress(`Paying ${outstanding.length} employees in one transaction…`);

  const color = toHexBytes(tokenId);
  const lines = slots.map((s) => s.line);
  const salaryNonces: Uint8Array[] = [];
  const coins: unknown[] = [];
  const payees: { bytes: Uint8Array }[] = [];
  const encMappings: [string, string][] = [];

  for (const [index, slot] of slots.entries()) {
    const keys = payeeKeys[index];
    if (!keys) throw new Error(`No payee keys for employee ${index + 1}`);
    const payee = toHexBytes(keys.coinPublicKey);

    salaryNonces.push(await deriveNonce(employerKey, period, index));
    coins.push({
      nonce: await sealedCoinNonce(employerKey, period, round, index),
      color,
      value: slot.line.netMinor,
      mt_index: BigInt(leaves[index]!),
    });
    payees.push({ bytes: payee });

    // Without this the coins are created and no payee can ever find theirs:
    // a shielded coin is only discoverable by someone whose encryption key the
    // transaction was built with.
    encMappings.push([
      keys.coinPublicKey.toLowerCase(),
      keys.encryptionPublicKey.toLowerCase(),
    ]);
  }

  // One transaction, not one per employee. Paying slot by slot fails part way
  // through with node error 170, `InvalidDustSpendProof` — the fee proof going
  // stale across rapid transactions. One call needs one dust spend proof.
  //
  // `submitCallTx` rather than `deployed.callTx`: the shorthand cannot carry
  // `additionalCoinEncPublicKeyMappings`.
  await submitCallTx(contractProviders, {
    compiledContract,
    contractAddress,
    circuitId: "payPeriod",
    args: [
      BigInt(period),
      lines.map((l) => l.grossMinor),
      lines.map((l) => l.taxMinor),
      lines.map((l) => l.socialMinor),
      lines.map((l) => l.netMinor),
      lines.map((l) => BigInt(l.weeks)),
      salaryNonces,
      coins,
      payees,
    ],
    additionalCoinEncPublicKeyMappings: new Map(encMappings),
  } as any);

  return outstanding.length;
}

/**
 * One indexer provider per network, reused.
 *
 * Constructing one opens a websocket, so building a fresh provider per read
 * meant a new socket per call — which the public indexer answered with
 * "Rate limited".
 */
const providers = new Map<string, ReturnType<typeof indexerPublicDataProvider>>();

function providerFor(networkId: string) {
  const existing = providers.get(networkId);
  if (existing) return existing;

  const indexer = INDEXERS[networkId];
  const indexerWs = INDEXER_WS[networkId];
  if (!indexer || !indexerWs) throw new Error(`No indexer configured for "${networkId}"`);

  const created = indexerPublicDataProvider(indexer, indexerWs);
  providers.set(networkId, created);
  return created;
}

/**
 * Reads the leaf indices of the coins a contract owns.
 *
 * `filter(address)` narrows the Zswap tree to one contract, and its string form
 * lists each owned leaf. Parsing that is inelegant, but it is the only route to
 * an `mt_index` — the contract cannot tell you, because it does not know.
 */
export async function fetchContractLeaves(
  networkId: string,
  contractAddress: string,
  /**
   * The provider that will BUILD the transaction, when there is one.
   *
   * These indices become `mt_index` on the coins being spent, and a merkle
   * position only means something relative to the tree it was read from. Read
   * them through one connection and prove against another and the two can sit
   * at different heights — the proof then references a root that does not
   * contain the position, which the node rejects as `Zswap` (custom error 103),
   * with nothing in the message to say the two views disagreed.
   *
   * It survived a long time because funding and paying usually happen in one
   * run: the coins are created through the connect provider moments earlier, so
   * that view already knows them whatever the other one thinks. Funding in an
   * earlier session removes that coincidence and the mismatch becomes visible.
   *
   * Optional so the standalone callers keep working; passed wherever the result
   * is about to be spent.
   */
  provider?: { queryZSwapAndContractState: (address: string) => Promise<unknown> }
): Promise<number[]> {
  const source = provider ?? providerFor(networkId);
  const result = (await source.queryZSwapAndContractState(contractAddress)) as
    | [unknown, unknown]
    | null;
  if (!result) return [];
  const [zswap] = result;
  return contractLeaves(String((zswap as any).filter(contractAddress).toString(true)));
}

/** As `fetchContractLeaves`, but keeping each leaf's commitment. */
export async function fetchContractLeafEntries(
  networkId: string,
  contractAddress: string,
  provider?: { queryZSwapAndContractState: (address: string) => Promise<unknown> }
): Promise<{ index: number; commitment: string }[]> {
  const source = provider ?? providerFor(networkId);
  const result = (await source.queryZSwapAndContractState(contractAddress)) as
    | [unknown, unknown]
    | null;
  if (!result) return [];
  const [zswap] = result;
  return contractLeafEntries(String((zswap as any).filter(contractAddress).toString(true)));
}

export interface RunResult {
  funded: number;
  paid: number;
  /** Wall-clock seconds, so the two proving modes can be compared. */
  seconds?: number;
  /** Which prover actually ran, for the same reason. */
  proving?: ProvingMode;
}

/**
 * Funds and then pays a period, skipping whatever is already done.
 *
 * Safe to re-run: the contract refuses to fund or pay a slot twice, so an
 * interrupted run — a closed tab, a rejected signature — is resumed simply by
 * pressing the button again.
 */
export async function fundAndPayPeriod(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  passphrase: string;
  tokenId: string;
  period: number;
  salaries: bigint[];
  /** Weeks worked per employee, in roster order. */
  weeks: number[];
  /** The employees' public keys, in roster order. See {@link PayeeKeys}. */
  payees: PayeeKeys[];
  provingMode?: ProvingMode;
  onProgress?: StepProgress;
}): Promise<RunResult> {
  const {
    api,
    networkId,
    contractAddress,
    passphrase,
    tokenId,
    period,
    salaries,
    weeks,
    provingMode = "local",
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  const startedAt = Date.now();

  onProgress("Deriving your key (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  const {
    deployed,
    contractModule,
    providers: contractProviders,
    compiledContract,
  } = await connectContract({
    api,
    networkId,
    contractAddress,
    provingMode,
    onProgress,
  });

  const ledger = (contractModule as any).ledger(
    await currentLedgerState(networkId, contractAddress)
  );
  const slots = slotStates(ledger, period, salaries, weeks);

  await checkOpensCommitments({
    contractModule,
    ledger,
    period,
    slots,
    employerKey,
  });

  // Which filing round this is. Re-filing a period bumps it, so its coins get
  // fresh nonces instead of colliding with the previous round's.
  const round = ledger.fileRoundFor?.member(BigInt(period))
    ? Number(ledger.fileRoundFor.lookup(BigInt(period)))
    : 0;

  // Batched when the period is untouched, per-slot when it is not.
  //
  // `fundPeriod` asserts that EVERY slot is unfunded and that the withholding
  // has not been funded, because it does all of it in one circuit. That is the
  // normal case and the one worth having: net and withholding are received
  // together or not at all, so there is no window in which the employees are
  // funded and the tax is still sitting in the employer's wallet.
  //
  // A period that is already part-funded — an interrupted run — cannot use it,
  // and falls back to the per-slot path plus a separate `fundWithholding`.
  const untouched =
    slots.every((s) => !s.funded) &&
    !(ledger.withheldFor?.member(BigInt(period)) && ledger.withheldFor.lookup(BigInt(period)));

  const funded = untouched
    ? await fundPeriodBatched({
        round,
        deployed,
        contractModule,
        ledger,
        employerKey,
        tokenId,
        period,
        slots,
        onProgress,
      })
    : await fundSlotsSeparately({
        round,
        api,
        deployed,
        employerKey,
        tokenId,
        period,
        slots,
        onProgress,
      });

  // Re-read after funding: the coins that were just created are the ones the
  // payment step has to spend, and they did not exist a moment ago.
  onProgress("Waiting for the new coins to be indexed…");

  // Which coin funds which slot — matched by COMMITMENT, never by ordinal.
  //
  // The comment that stood here said "the n-th coin the contract ever received
  // is its n-th leaf", and it was true for as long as funding created one coin
  // per transaction. It is false the moment a transaction creates more than one:
  // measured on a `fundPeriod` run, employee 0's coin (ordinal 0) landed at leaf
  // 48188 while employee 1's (ordinal 1) landed at 48186 — inverted. Sorting the
  // leaves and taking the ordinal-th would have paid employee 0 against employee
  // 1's coin.
  //
  // That failure is invisible until it reaches the proof server, which reports
  // `Public transcript input mismatch for input N`: every field individually
  // correct, the combination describing no coin that exists. The message names
  // no field, so it reads as a contract or state bug for as long as you let it.
  //
  // Rebuilding the commitment removes the guesswork — the coin's own nonce,
  // colour and value identify it, and the leaf holding that commitment is the
  // one to spend. `remitWithholding` already locates its coins this way for
  // exactly the same reason.
  const entries = await fetchContractLeafEntries(
    networkId,
    contractAddress,
    (contractProviders as any).publicDataProvider
  );
  const rt: any = await import("@midnight-ntwrk/compact-runtime");
  const aligned = (d: any, v: unknown) => ({ value: d.toValue(v), alignment: d.alignment() });
  // BOTH branches of the Either, even though only one is read. Omitting the
  // unused one fails inside WASM as "Reflect.get called on non-object".
  const recipient = aligned(rt.ShieldedCoinRecipientDescriptor, {
    is_left: false,
    left: { bytes: new Uint8Array(32) },
    right: { bytes: toHexBytes(contractAddress) },
  });

  const leaves: number[] = [];
  for (const [index, slot] of slots.entries()) {
    const commitment = bytesToHex(
      rt.runtimeCoinCommitment(
        aligned(rt.ShieldedCoinInfoDescriptor, {
          nonce: await sealedCoinNonce(employerKey, period, round, index),
          color: toHexBytes(tokenId),
          value: slot.line.netMinor,
        }),
        recipient
      ).value[0]
    ).toLowerCase();

    const found = entries.find((e) => e.commitment.toLowerCase() === commitment);
    if (!found) {
      throw new Error(
        `Employee ${index + 1}'s coin is not among the ${entries.length} the contract ` +
          "holds. Either funding has not been indexed yet, or the nonce this run " +
          "derives differs from the one that funded it — check the passphrase and " +
          "the filing round."
      );
    }
    leaves.push(found.index);
  }

  const fresh = slots.map((s) => ({ ...s, funded: true }));

  const paid = await payPeriod({
    payees: options.payees,
    round,
    providers: contractProviders,
    compiledContract,
    contractAddress,
    employerKey,
    tokenId,
    period,
    slots: fresh,
    leaves,
    onProgress,
  });

  return {
    funded,
    paid,
    seconds: Math.round((Date.now() - startedAt) / 1000),
    proving: provingMode,
  };
}

/**
 * The contract's ledger state, over plain HTTP.
 *
 * `fetchContractState` is a single GraphQL POST with no websocket behind it,
 * which is all a one-off read needs. Reserve the full provider for
 * `queryZSwapAndContractState`, which has no lightweight equivalent.
 */
async function currentLedgerState(networkId: string, contractAddress: string) {
  const state = await fetchContractState(networkId, contractAddress);
  if (!state) throw new Error("No contract state on chain");
  return state.data;
}

/**
 * Moves a period's withheld tax and contribution into the contract's pools.
 *
 * Until this runs, the withholding is **assessed and not collected**: the
 * circuit computed it, the totals are published, and the money is still in the
 * employer's wallet. The public page says so rather than showing an assessed
 * figure as though it had been banked, and this is what closes that gap.
 *
 * Two coins, not one, because the money is owed to two destinations — and both
 * carry exactly the published total, which is what the circuit checks. There is
 * no figure for an employer to choose here.
 *
 * It does NOT remit. Sending onward needs each treasury's ENCRYPTION public key,
 * which the contract does not store — only the coin key it pays to — so a
 * browser has nowhere to read one from. That step runs from the CLI, which has
 * the seeds. Splitting it this way is not a limitation of the design so much as
 * a consequence of what a shielded transfer needs: a coin nobody can decrypt is
 * a coin nobody can find.
 */
export async function fundWithholding(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  passphrase: string;
  tokenId: string;
  period: number;
  provingMode?: ProvingMode;
  onProgress?: StepProgress;
}): Promise<{ taxMinor: bigint; socialMinor: bigint; alreadyDone: boolean }> {
  const { api, networkId, contractAddress, passphrase, tokenId, period } = options;
  const onProgress = options.onProgress ?? (() => {});

  onProgress("Deriving your key (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  const { deployed, contractModule } = await connectContract({
    api,
    networkId,
    contractAddress,
    provingMode: options.provingMode ?? "local",
    onProgress,
  });

  const ledger = (contractModule as any).ledger(
    await currentLedgerState(networkId, contractAddress)
  );
  const key = BigInt(period);

  if (!ledger.commitmentsFor.member(key)) {
    throw new Error(`Period ${period} has not been filed on this contract.`);
  }
  const taxMinor: bigint = ledger.totalTaxFor.member(key)
    ? ledger.totalTaxFor.lookup(key)
    : 0n;
  const socialMinor: bigint = ledger.totalSocialFor.member(key)
    ? ledger.totalSocialFor.lookup(key)
    : 0n;

  // Write-once per period in the circuit, so re-running is a no-op rather than
  // a second payment — worth reporting instead of failing.
  if (ledger.withheldFor?.member(key) && ledger.withheldFor.lookup(key)) {
    return { taxMinor, socialMinor, alreadyDone: true };
  }
  if (!ledger.payTokenSet) {
    throw new Error(
      "Fund an employee first — the contract fixes its pay token on the first " +
        "coin it receives, and withholding cannot be the one to set it."
    );
  }

  const round = ledger.fileRoundFor?.member(key) ? Number(ledger.fileRoundFor.lookup(key)) : 0;
  const color = toHexBytes(tokenId);

  onProgress("Moving the withheld tax and contribution into the contract…");
  await deployed.callTx.fundWithholding(
    key,
    {
      nonce: await withholdingCoinNonce(employerKey, period, round, "tax"),
      color,
      value: taxMinor,
    },
    {
      nonce: await withholdingCoinNonce(employerKey, period, round, "social"),
      color,
      value: socialMinor,
    }
  );

  return { taxMinor, socialMinor, alreadyDone: false };
}

/**
 * Sends a period's withheld tax and contribution on to the treasuries.
 *
 * The step after `fundWithholding`, and for a long time the one that could only
 * run from the CLI. The obstacle was never authority — `remitTax` accepts the
 * employer or the platform — but addressing: a shielded coin can only be found
 * by someone whose ENCRYPTION public key the transaction was built with, the
 * contract stores only the coin key it pays to, and a browser had nowhere to
 * read the other one from. `VITE_*_TREASURY_ENC_KEY` is that missing half, and
 * it is a public key: it addresses a coin and cannot spend one.
 *
 * Both destinations were frozen in the constructor, so nothing here chooses
 * where the money goes — this cannot be redirected, only performed or not.
 *
 * The coin being spent is the one `fundWithholding` created, so its nonce is
 * derived the same way, from the employer's passphrase and the filing round.
 * Which is why this belongs in the browser: the passphrase is the one input the
 * server does not have and should not.
 */
/**
 * Which of the contract's coins the derived withholding coin actually is.
 *
 * Answers what the proof server will not: `Public transcript input mismatch for
 * input N` names no field. This rebuilds the commitment from the fields
 * `remitWithholding` would send and looks for it among the coins the contract
 * holds, so "wrong nonce", "wrong ordinal" and "coin is fine" stop looking
 * identical.
 *
 * `runtimeCoinCommitment` takes AlignedValues, not plain objects — see
 * `onchain-runtime-v3.d.ts` — and the recipient needs BOTH branches of the
 * Either present even though only one is used. Guessing either of those costs
 * an opaque "Reflect.get called on non-object".
 *
 * Returns positions and booleans only: no nonce, no commitment, nothing that
 * identifies a coin off this machine.
 */
export async function checkWithholdingCoin(options: {
  networkId: string;
  contractAddress: string;
  passphrase: string;
  tokenId: string;
  period: number;
  rounds?: number[];
}): Promise<unknown> {
  const { networkId, contractAddress, passphrase, tokenId, period } = options;
  const rounds = options.rounds ?? [0, 1, 2];
  const rt: any = await import("@midnight-ntwrk/compact-runtime");
  const aligned = (d: any, v: unknown) => ({ value: d.toValue(v), alignment: d.alignment() });

  const employerKey = await deriveEmployerKey(passphrase, contractAddress);
  const entries = await fetchContractLeafEntries(networkId, contractAddress);
  const ledger = ((await import("../generated/payroll/index.js")) as any).ledger(
    await currentLedgerState(networkId, contractAddress)
  );
  const key = BigInt(period);
  const totals: Record<string, bigint> = {
    tax: ledger.totalTaxFor.member(key) ? ledger.totalTaxFor.lookup(key) : 0n,
    social: ledger.totalSocialFor.member(key) ? ledger.totalSocialFor.lookup(key) : 0n,
  };
  const ordinals: Record<string, number | null> = {
    tax: ledger.taxCoinFor.member(key) ? Number(ledger.taxCoinFor.lookup(key)) : null,
    social: ledger.socialCoinFor.member(key) ? Number(ledger.socialCoinFor.lookup(key)) : null,
  };

  const recipient = aligned(rt.ShieldedCoinRecipientDescriptor, {
    is_left: false,
    left: { bytes: new Uint8Array(32) },
    right: { bytes: toHexBytes(contractAddress) },
  });

  const results: Record<string, unknown> = {
    ordinals,
    leaves: entries.map((e) => e.index),
    totals: { tax: String(totals.tax), social: String(totals.social) },
  };
  for (const which of ["tax", "social"] as const) {
    for (const round of rounds) {
      const nonce = await withholdingCoinNonce(employerKey, period, round, which);
      const commitment = bytesToHex(
        rt.runtimeCoinCommitment(
          aligned(rt.ShieldedCoinInfoDescriptor, {
            nonce,
            color: toHexBytes(tokenId),
            value: totals[which],
          }),
          recipient
        ).value[0]
      ).toLowerCase();
      const at = entries.findIndex((e) => e.commitment === commitment);
      results[`${which}-round${round}`] = {
        matchesPosition: at,
        matchesLeaf: at >= 0 ? entries[at]!.index : null,
        expectedOrdinal: ordinals[which],
      };
    }
  }
  return results;
}

export async function remitWithholding(options: {
  api: ConnectedAPI;
  networkId: string;
  contractAddress: string;
  passphrase: string;
  tokenId: string;
  period: number;
  /** Which pool to send. Two calls, because they are two coins and two keys. */
  what: "tax" | "social";
  provingMode?: ProvingMode;
  onProgress?: StepProgress;
}): Promise<{ sentMinor: bigint; alreadyDone: boolean }> {
  const { api, networkId, contractAddress, passphrase, tokenId, period, what } = options;
  const onProgress = options.onProgress ?? (() => {});

  const encryptionKey = String(
    what === "tax"
      ? import.meta.env.VITE_TAX_TREASURY_ENC_KEY ?? ""
      : import.meta.env.VITE_SOCIAL_TREASURY_ENC_KEY ?? ""
  ).trim();
  if (!encryptionKey) {
    throw new Error(
      `No ${what} treasury encryption key is configured for this build, so the ` +
        "coin would be sent somewhere the treasury could never find it. Set " +
        `VITE_${what.toUpperCase()}_TREASURY_ENC_KEY and rebuild.`
    );
  }

  onProgress("Deriving your key (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  const { contractModule, providers: contractProviders, compiledContract } =
    await connectContract({
      api,
      networkId,
      contractAddress,
      provingMode: options.provingMode ?? "local",
      onProgress,
    });

  const ledger = (contractModule as any).ledger(
    await currentLedgerState(networkId, contractAddress)
  );
  const key = BigInt(period);

  if (!ledger.withheldFor?.member(key) || !ledger.withheldFor.lookup(key)) {
    throw new Error(
      `Period ${period} has not had its withholding moved into the contract yet. ` +
        "Do that step first — there is nothing here to send on."
    );
  }

  const owed: bigint = what === "tax" ? ledger.taxPool : ledger.socialPool;
  const remitted: bigint = what === "tax" ? ledger.taxRemitted : ledger.socialRemitted;
  const forPeriod: bigint =
    what === "tax"
      ? ledger.totalTaxFor.member(key)
        ? ledger.totalTaxFor.lookup(key)
        : 0n
      : ledger.totalSocialFor.member(key)
        ? ledger.totalSocialFor.lookup(key)
        : 0n;

  // Nothing in the pool means it has already gone. Reported rather than thrown,
  // for the same reason `fundWithholding` reports `alreadyDone`: re-running a
  // completed step is a no-op, not a failure, and an error here reads as money
  // lost.
  if (owed <= 0n) return { sentMinor: remitted, alreadyDone: true };

  const coinMap = what === "tax" ? ledger.taxCoinFor : ledger.socialCoinFor;
  if (!coinMap?.member(key)) {
    throw new Error(`No ${what} coin is recorded for period ${period}.`);
  }
  const ordinal = Number(coinMap.lookup(key));
  const round = ledger.fileRoundFor?.member(key) ? Number(ledger.fileRoundFor.lookup(key)) : 0;

  // Read through the provider that will prove, so the leaf position and the tree
  // the proof is built over are the same tree — the mismatch `a07c8bf` chased.
  onProgress("Locating the coin the contract holds…");
  const entries = await fetchContractLeafEntries(
    networkId,
    contractAddress,
    (contractProviders as any).publicDataProvider
  );
  // ── Find the coin by its commitment, not by its ordinal ───────────────────
  //
  // `taxCoinFor` / `socialCoinFor` record the ORDER the contract received each
  // coin. The obvious next step — take the Nth-lowest leaf the contract owns —
  // is wrong, and quietly so: `fundWithholding` creates both coins in ONE
  // transaction, and the Zswap tree does not place them in the order they were
  // received. On period 202609 the tax coin was received first (ordinal 2) and
  // landed at leaf 47018, while the social coin (ordinal 3) landed at 47016.
  //
  // Sending the tax nonce and value with the social coin's `mt_index` produced
  // `Public transcript input mismatch for input 13` — every field individually
  // correct, the combination describing no coin that exists.
  //
  // `payPeriod` never hit this because salary coins are funded one per
  // transaction, so receipt order and tree order happen to agree there.
  //
  // Rebuilding the commitment removes the guess entirely: the coin is whichever
  // leaf holds exactly this nonce, colour and value.
  const rt: any = await import("@midnight-ntwrk/compact-runtime");
  const alignedValue = (descriptor: any, value: unknown) => ({
    value: descriptor.toValue(value),
    alignment: descriptor.alignment(),
  });
  const nonce = await withholdingCoinNonce(employerKey, period, round, what);
  const commitment = bytesToHex(
    rt.runtimeCoinCommitment(
      alignedValue(rt.ShieldedCoinInfoDescriptor, {
        nonce,
        color: toHexBytes(tokenId),
        value: forPeriod,
      }),
      // Both branches of the Either, even though only one is used — the
      // descriptor requires it, and omitting one fails inside WASM with
      // "Reflect.get called on non-object" rather than anything readable.
      alignedValue(rt.ShieldedCoinRecipientDescriptor, {
        is_left: false,
        left: { bytes: new Uint8Array(32) },
        right: { bytes: toHexBytes(contractAddress) },
      })
    ).value[0]
  ).toLowerCase();

  const entry = entries.find((candidate) => candidate.commitment === commitment);
  if (entry === undefined) {
    throw new Error(
      `The ${what} coin for period ${period} matches none of the ${entries.length} ` +
        "coins this contract holds. Its nonce comes from your passphrase, so the " +
        "most likely cause is a different passphrase than the one that moved the " +
        "withholding in — or the indexer is behind."
    );
  }
  const leaf = entry.index;
  if (entries.indexOf(entry) !== ordinal) {
    // Not an error: the contract's ordinal is a receipt counter, not a tree
    // position, and the two disagreeing is the normal case here. Logged because
    // it is the fact that made this bug invisible for a day.
    console.info(
      `[remit] ${what} coin is the contract's #${ordinal} by receipt order but ` +
        `sits at leaf ${leaf} (position ${entries.indexOf(entry)}).`
    );
  }

  const treasury = what === "tax" ? ledger.taxTreasury : ledger.socialTreasury;
  const recipient = bytesToHex(treasury.bytes).toLowerCase();

  // The coin the contract holds, rebuilt from the fields that created it.
  const coin = {
    nonce,
    color: toHexBytes(tokenId),
    value: forPeriod,
    mt_index: BigInt(leaf),
  };

  onProgress(`Sending the withheld ${what} to its treasury…`);
  // `submitCallTx` rather than the `callTx` shorthand, which cannot carry the
  // encryption mapping — the same reason `payPeriod` uses it.
  await submitCallTx(contractProviders, {
    compiledContract,
    contractAddress,
    // One circuit for both halves since the payroll contract was cut down to
    // fit the deploy ceiling — `remitTax` and `remitSocial` were the same
    // circuit twice, and `isTax` now selects which pools and totals it touches.
    circuitId: "remit",
    // The treasury is passed and the circuit asserts it equals the frozen
    // ledger value, so this cannot redirect anything. It is an argument rather
    // than a ledger read so the recipient reaches `sendShielded` disclosed,
    // exactly as `payPeriod` passes its payees.
    args: [key, what === "tax", { bytes: treasury.bytes }, coin],
    additionalCoinEncPublicKeyMappings: new Map([[recipient, encryptionKey]]),
  } as any);

  return { sentMinor: forPeriod, alreadyDone: false };
}

/**
 * The most recent period that is filed but not fully paid, or null.
 *
 * Drives the prompt asking for the roster again. Reading it from chain rather
 * than remembering it locally means the prompt is right after a page reload,
 * on another machine, or for whoever picks the job up next.
 */
export async function unpaidPeriod(
  networkId: string,
  contractAddress: string
): Promise<number | null> {
  const { ledger } = await import("../generated/payroll/index.js");
  const state = await currentLedgerState(networkId, contractAddress).catch(() => null);
  if (!state) return null;

  const readable = (ledger as any)(state);
  const periods = [...(readable.periods as Iterable<bigint>)].sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  );

  for (const period of periods) {
    if (!readable.commitmentsFor.member(period)) continue;
    const total = Number(readable.commitmentsFor.lookup(period).size());
    let paid = 0;
    if (readable.paidFor.member(period)) {
      for (const [, done] of readable.paidFor.lookup(period)) if (done) paid += 1;
    }
    if (paid < total) return Number(period);
  }
  return null;
}

export interface PeriodStatus {
  /** Periods already filed, newest first. */
  filed: number[];
  /** Newest period filed but not fully paid, or null. */
  unpaid: number | null;
  /** Whether any sealed opening exists, i.e. whether a passphrase can be checked. */
  hasSealed: boolean;
  /**
   * Newest period whose withholding is in the contract but not yet sent on.
   *
   * Read from `taxCoinFor`, because `remitTax` REMOVES that entry when it
   * succeeds — so its presence is the chain's own record of "collected, not
   * remitted", and needs no local state to track.
   *
   * Exists because remitting is the one step that outlives its month. Filing,
   * paying and withholding all belong to the month being worked on, so the
   * stepper follows the calendar and moves to the next month once they are
   * done. A pool left in the contract does not move on with it — and without
   * this the control for it was only ever rendered for the current month, so a
   * September pool became unreachable the moment October began.
   */
  unremitted: number | null;
}

/**
 * Everything the roster card needs to know about a contract, in one read.
 *
 * Deliberately one call. Three separate helpers each doing their own query is
 * what got the page rate-limited by the public indexer, and none of these
 * answers is worth a round trip of its own.
 */
export async function periodStatus(
  networkId: string,
  contractAddress: string
): Promise<PeriodStatus> {
  const { ledger } = await import("../generated/payroll/index.js");
  const state = await currentLedgerState(networkId, contractAddress).catch(() => null);
  if (!state) return { filed: [], unpaid: null, hasSealed: false, unremitted: null };

  const readable = (ledger as any)(state);
  const periods = [...(readable.periods as Iterable<bigint>)].sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  );

  let unpaid: number | null = null;
  let hasSealed = false;
  let unremitted: number | null = null;

  for (const period of periods) {
    if (readable.sealedFor.member(period)) {
      for (const [, blob] of readable.sealedFor.lookup(period)) {
        if ((blob as Uint8Array).some((b: number) => b !== 0)) hasSealed = true;
      }
    }
    // Either pool still holding a coin means this period is not fully remitted.
    // Checked independently of `unpaid`: a period can be paid in full and still
    // have its withholding sitting in the contract, which is exactly the state
    // this exists to surface.
    if (
      unremitted === null &&
      ((readable.taxCoinFor?.member(period) ?? false) ||
        (readable.socialCoinFor?.member(period) ?? false))
    ) {
      unremitted = Number(period);
    }
    if (unpaid === null && readable.commitmentsFor.member(period)) {
      const total = Number(readable.commitmentsFor.lookup(period).size());
      let paid = 0;
      if (readable.paidFor.member(period)) {
        for (const [, done] of readable.paidFor.lookup(period)) if (done) paid += 1;
      }
      if (paid < total) unpaid = Number(period);
    }
  }

  return { filed: periods.map(Number), unpaid, hasSealed, unremitted };
}

/**
 * Runs funding and payment through the local service instead of the browser.
 *
 * The browser cannot prove circuits with coin operations: `fundEmployee` and
 * `payEmployee` build a transaction the proof server rejects with an empty 400,
 * while the identical circuits prove fine from Node. Contract, keys and proof
 * server were each eliminated, so the fault is in the connector-based
 * transaction construction and is still open.
 *
 * Two consequences the caller should not hide from whoever presses the button:
 *
 *   - the service signs with the platform wallet, so this only works where the
 *     employer is the operator;
 *   - the salaries and the passphrase leave the page. Only as far as
 *     127.0.0.1, and the service already holds the platform signing key — but
 *     "parsed in your browser, never uploaded" stops being literally true here.
 */
export async function fundAndPayViaService(options: {
  instance: string;
  networkId: string;
  contractAddress: string;
  period: number;
  salaries: bigint[];
  /** Weeks worked per employee, in roster order. */
  weeks: number[];
  /** The employees' public keys, in roster order. See {@link PayeeKeys}. */
  payees: PayeeKeys[];
  passphrase: string;
  onProgress?: StepProgress;
}): Promise<RunResult> {
  const {
    instance,
    networkId,
    contractAddress,
    period,
    salaries,
    weeks,
    payees: payeeKeys,
    passphrase,
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  onProgress("Deriving this period's material (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  // The filing round is part of the coin nonce, so it has to be read before the
  // material is derived — a re-filed period funds different coins.
  const { ledger } = await import("../generated/payroll/index.js");
  const state = (ledger as any)(
    await currentLedgerState(networkId, contractAddress)
  );
  const round = state.fileRoundFor?.member(BigInt(period))
    ? Number(state.fileRoundFor.lookup(BigInt(period)))
    : 0;

  // Everything the service needs, and nothing more. The passphrase never leaves
  // this function: what goes over the wire is one period's nonces and the
  // employees' PUBLIC keys, so a compromised service learns this month's
  // amounts and cannot open another period or spend anyone's salary.
  const slots = [];
  for (const [index, grossMinor] of salaries.entries()) {
    const keys = payeeKeys[index];
    if (!keys) throw new Error(`No payee keys for employee ${index + 1}`);
    const computed = computeLine(grossMinor, DUTCH_V1);
    slots.push({
      gross: grossMinor.toString(),
      tax: computed.taxMinor.toString(),
      social: computed.contribMinor.toString(),
      net: computed.netMinor.toString(),
      weeks: weeks[index] ?? 4,
      salaryNonce: toHex(await deriveNonce(employerKey, period, index)),
      coinNonce: toHex(await sealedCoinNonce(employerKey, period, round, index)),
      payee: keys.coinPublicKey.toLowerCase(),
      // Public half only. Without it the coin is created and the payee's wallet
      // can never find it — paid, and unreachable.
      payeeEnc: keys.encryptionPublicKey.toLowerCase(),
    });
  }

  onProgress("Handing the run to the local payroll service…");
  const started = await fetch(apiUrl("/api/payroll/run"), {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ instance, period, slots }),
  });

  const startedBody = await started.json().catch(() => ({}) as any);
  if (!started.ok) {
    throw new Error(
      startedBody?.error ??
        `The payroll service returned ${started.status}. Is \`npm run demo:server\` running?`
    );
  }

  const jobId = startedBody.jobId as string;

  // Polled rather than streamed: the run takes minutes, and a request held open
  // that long reads as a hang to every proxy between here and there.
  for (;;) {
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const poll = await fetch(apiUrl(`/api/job/${jobId}`));
    if (!poll.ok) throw new Error(`Lost track of the job (${poll.status})`);
    const job = await poll.json();

    const last = job.log?.[job.log.length - 1];
    if (last) onProgress(last);

    if (job.status === "done") {
      const r = job.result ?? {};
      return { funded: Number(r.funded ?? 0), paid: Number(r.paid ?? 0) };
    }
    if (job.status === "failed") {
      throw new Error(job.error ?? "The payroll service failed without a message");
    }
  }
}

const toHex = (bytes: Uint8Array) =>
  Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

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
 * Funds every slot of a period that is not funded yet.
 *
 * One coin per slot, each carrying exactly the committed salary. The circuit
 * checks that against the commitment on the way in, so a wrong figure is
 * refused here rather than discovered on payday.
 */
export async function fundPeriod(options: {
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
  return [...zswapStateText.matchAll(/(\d+): \([0-9a-f]{64}, Some\(ContractAddress/g)]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
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

  const funded = await fundPeriod({
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
  // Through the provider that will prove and submit, so the positions below and
  // the tree the proof is built over are the same tree. See `fetchContractLeaves`.
  const allLeaves = await fetchContractLeaves(
    networkId,
    contractAddress,
    (contractProviders as any).publicDataProvider
  );

  // Which coin funds which slot, straight from the contract. It records the
  // ordinal when the coin is received, so there is nothing to infer: the n-th
  // coin the contract ever received is its n-th leaf.
  //
  // This replaces counting positions from zero, which paid earlier periods'
  // already-spent coins once a contract had any history.
  const after = (contractModule as any).ledger(
    await currentLedgerState(networkId, contractAddress)
  );
  const ordinals = after.coinOrdinalFor.member(BigInt(period))
    ? after.coinOrdinalFor.lookup(BigInt(period))
    : null;
  if (!ordinals) throw new Error(`No funded coins recorded for period ${period}`);

  const leaves = slots.map((_, index) => {
    if (!ordinals.member(BigInt(index))) {
      throw new Error(`No coin recorded for employee ${index + 1}`);
    }
    const ordinal = Number(ordinals.lookup(BigInt(index)));
    const leaf = allLeaves[ordinal];
    if (leaf === undefined) {
      throw new Error(
        `The contract records coin #${ordinal} for employee ${index + 1}, but only ` +
          `${allLeaves.length} coins are visible — the indexer may be behind.`
      );
    }
    return leaf;
  });

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
  if (!state) return { filed: [], unpaid: null, hasSealed: false };

  const readable = (ledger as any)(state);
  const periods = [...(readable.periods as Iterable<bigint>)].sort((a, b) =>
    a < b ? 1 : a > b ? -1 : 0
  );

  let unpaid: number | null = null;
  let hasSealed = false;

  for (const period of periods) {
    if (readable.sealedFor.member(period)) {
      for (const [, blob] of readable.sealedFor.lookup(period)) {
        if ((blob as Uint8Array).some((b: number) => b !== 0)) hasSealed = true;
      }
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

  return { filed: periods.map(Number), unpaid, hasSealed };
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

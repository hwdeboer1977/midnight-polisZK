import type { ConnectedAPI } from "@midnight-ntwrk/dapp-connector-api";
import { ZswapSecretKeys } from "@midnight-ntwrk/ledger-v8";
import { indexerPublicDataProvider } from "@midnight-ntwrk/midnight-js-indexer-public-data-provider";
import { fetchContractState, INDEXERS, INDEXER_WS } from "./chain";
import { deriveEmployeeSeed, deriveEmployerKey, deriveNonce, sealedCoinNonce } from "./openings";
import { connectContract } from "./submitPayroll";

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
  salaryMinor: bigint;
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
export function slotStates(
  ledger: any,
  period: number,
  salaries: bigint[]
): SlotState[] {
  const p = BigInt(period);
  const funded = ledger.fundedFor?.member(p) ? ledger.fundedFor.lookup(p) : null;
  const paid = ledger.paidFor?.member(p) ? ledger.paidFor.lookup(p) : null;

  return salaries.map((salaryMinor, index) => ({
    index,
    salaryMinor,
    funded: funded?.member(BigInt(index)) ? funded.lookup(BigInt(index)) : false,
    paid: paid?.member(BigInt(index)) ? paid.lookup(BigInt(index)) : false,
  }));
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
  slots: SlotState[];
  onProgress?: StepProgress;
}): Promise<number> {
  const { deployed, employerKey, tokenId, period, slots } = options;
  const onProgress = options.onProgress ?? (() => {});

  const todo = slots.filter((s) => !s.funded);
  let done = 0;

  for (const slot of todo) {
    onProgress(
      `Funding employee ${slot.index + 1} of ${slots.length} — proving, a few minutes…`
    );
    const salaryNonce = await deriveNonce(employerKey, period, slot.index);
    const coinNonce = await sealedCoinNonce(employerKey, period, slot.index);

    await deployed.callTx.fundEmployee(
      BigInt(period),
      BigInt(slot.index),
      slot.salaryMinor,
      salaryNonce,
      {
        nonce: coinNonce,
        color: toHexBytes(tokenId),
        value: slot.salaryMinor,
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
  api: ConnectedAPI;
  deployed: any;
  contractModule: any;
  employerKey: Uint8Array;
  tokenId: string;
  period: number;
  slots: SlotState[];
  leaves: number[];
  onProgress?: StepProgress;
}): Promise<number> {
  const {
    deployed,
    employerKey,
    tokenId,
    period,
    slots,
    leaves,
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  const payable = slots.filter((s) => s.funded && !s.paid);
  const available = [...leaves];
  let done = 0;

  for (const slot of payable) {
    const leaf = available.shift();
    if (leaf === undefined) {
      throw new Error(
        `Ran out of contract coins at employee ${slot.index + 1}. The indexer may ` +
          "not have caught up with funding yet — wait a moment and try again."
      );
    }

    onProgress(
      `Paying employee ${slot.index + 1} of ${slots.length} — proving, a few minutes…`
    );

    const salaryNonce = await deriveNonce(employerKey, period, slot.index);
    const coinNonce = await sealedCoinNonce(employerKey, period, slot.index);
    const employeeKeys = ZswapSecretKeys.fromSeed(
      await deriveEmployeeSeed(employerKey, slot.index)
    );

    await deployed.callTx.payEmployee(
      BigInt(period),
      BigInt(slot.index),
      slot.salaryMinor,
      salaryNonce,
      {
        nonce: coinNonce,
        color: toHexBytes(tokenId),
        value: slot.salaryMinor,
        mt_index: BigInt(leaf),
      },
      { bytes: toHexBytes(String(employeeKeys.coinPublicKey)) }
    );
    done += 1;
  }
  return done;
}

/**
 * One indexer provider per network, reused.
 *
 * Constructing one opens a websocket. Building a fresh provider on every read
 * meant a new socket per call, and the public indexer answered that with
 * "Rate limited" — which surfaced as a page-level error rather than as the
 * self-inflicted load it was.
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
  contractAddress: string
): Promise<number[]> {
  const result = await providerFor(networkId).queryZSwapAndContractState(contractAddress);
  if (!result) return [];
  const [zswap] = result;
  return contractLeaves(String((zswap as any).filter(contractAddress).toString(true)));
}

export interface RunResult {
  funded: number;
  paid: number;
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
  } = options;
  const onProgress = options.onProgress ?? (() => {});

  onProgress("Deriving your key (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  const { deployed, contractModule } = await connectContract({
    api,
    networkId,
    contractAddress,
    onProgress,
  });

  const ledger = (contractModule as any).ledger(
    await currentLedgerState(networkId, contractAddress)
  );
  const slots = slotStates(ledger, period, salaries);

  const funded = await fundPeriod({
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
  const leaves = await fetchContractLeaves(networkId, contractAddress);
  const fresh = slots.map((s) => ({ ...s, funded: true }));

  const paid = await payPeriod({
    api,
    deployed,
    contractModule,
    employerKey,
    tokenId,
    period,
    slots: fresh,
    leaves,
    onProgress,
  });

  return { funded, paid };
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
  contractAddress: string;
  period: number;
  salaries: bigint[];
  passphrase: string;
  onProgress?: StepProgress;
}): Promise<RunResult> {
  const { instance, contractAddress, period, salaries, passphrase } = options;
  const onProgress = options.onProgress ?? (() => {});

  onProgress("Deriving this period's material (PBKDF2, deliberately slow)…");
  const employerKey = await deriveEmployerKey(passphrase, contractAddress);

  // Everything the service needs, and nothing more. The passphrase never leaves
  // this function: what goes over the wire is one period's nonces and the
  // employees' PUBLIC keys, so a compromised service learns this month's
  // amounts and cannot open another period or spend anyone's salary.
  const slots = [];
  for (const [index, salary] of salaries.entries()) {
    const employee = ZswapSecretKeys.fromSeed(
      await deriveEmployeeSeed(employerKey, index)
    );
    slots.push({
      salary: salary.toString(),
      salaryNonce: toHex(await deriveNonce(employerKey, period, index)),
      coinNonce: toHex(await sealedCoinNonce(employerKey, period, index)),
      payee: String(employee.coinPublicKey).replace(/^0x/, "").toLowerCase(),
      // Public half only. Without it the coin is created and the payee's wallet
      // can never find it — paid, and unreachable.
      payeeEnc: String(employee.encryptionPublicKey).replace(/^0x/, "").toLowerCase(),
    });
  }

  onProgress("Handing the run to the local payroll service…");
  const started = await fetch("/api/payroll/run", {
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

    const poll = await fetch(`/api/job/${jobId}`);
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

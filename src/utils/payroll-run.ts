import { submitCallTx } from "@midnight-ntwrk/midnight-js-contracts";
import { connect, readLedger, type Connection } from "./contract.js";
import { EnvironmentManager } from "./environment.js";

/**
 * Funding and paying a period, from Node.
 *
 * This exists because the browser cannot do it. Circuits with coin operations —
 * `fundEmployee`, `payEmployee` — build a transaction the proof server rejects
 * with an empty 400 when constructed through the DApp connector, while the
 * identical circuits prove fine from here. The contract, the keys and the proof
 * server were each ruled out; the fault is in the browser's transaction
 * construction and is unresolved.
 *
 * What this deliberately does NOT take is the payroll passphrase. It takes only
 * the material for the period being paid: the amounts, their nonces, the coin
 * nonces, and the employees' PUBLIC keys — all derived in the browser, which is
 * where the passphrase stays.
 *
 * The difference is not cosmetic. The passphrase derives every nonce for every
 * period on the contract, so it opens all commitments past and future, and it
 * derives the employees' keypairs, so it can spend what they were paid. Handing
 * that to a service to save a few lines would mean the service could read and
 * spend everything, forever. Handing it one month's derived material means a
 * compromised service learns one month's amounts and can do nothing else.
 *
 * It still signs with whatever wallet is in `.env`, so it only works for an
 * instance whose employer IS the operator.
 */

export interface RunProgress {
  (line: string): void;
}

/** One employee's material for one period. Everything is public or per-period. */
export interface SlotInput {
  /** Minor units, as filed. */
  salary: bigint;
  /** Opens this employee's commitment for this period. */
  salaryNonce: Uint8Array;
  /** Identifies the coin funding this slot. */
  coinNonce: Uint8Array;
  /** The payee's coin public key — the public half only. */
  payee: Uint8Array;
  /**
   * The payee's encryption public key, hex.
   *
   * Needed to build the coin, not to authorise it. A shielded coin can only be
   * found by someone whose encryption key the transaction was built with, so
   * without this the payment succeeds and the recipient can never see it —
   * money that exists and is unreachable. `peur.compact` documents the same
   * requirement for `mintTo`.
   */
  payeeEnc: string;
}

export interface RunResult {
  contractAddress: string;
  period: number;
  funded: number;
  paid: number;
  alreadyFunded: number;
  alreadyPaid: number;
}

/**
 * The leaf indices of the coins a contract owns, ascending.
 *
 * The contract stores nothing about its own coins — storing them would publish
 * the values — so the indexer is the only place this exists.
 */
async function contractLeaves(conn: Connection): Promise<number[]> {
  const result = await conn.providers.publicDataProvider.queryZSwapAndContractState(
    conn.contractAddress
  );
  if (!result) return [];
  const [zswap] = result as any;
  const text = String(zswap.filter(conn.contractAddress).toString(true));
  return [...text.matchAll(/(\d+): \([0-9a-f]{64}, Some\(ContractAddress/g)]
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);
}

/**
 * Waits until the chain agrees a slot's flag has flipped.
 *
 * Payments spend the contract's own coins, so each one changes the state the
 * next proof is built against. Firing them back to back submits the fifth
 * against a view of the contract that is four coins out of date, and the node
 * rejects it — observed as `Custom error: 170` after four successful payments.
 *
 * Funding does not have this problem: it only adds coins, so a stale view is
 * still a valid one. Hence waiting here and not there.
 */
async function waitForFlag(
  conn: Connection,
  pick: (ledger: any) => any,
  period: bigint,
  index: number,
  log: RunProgress
): Promise<void> {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
    const ledger = await readLedger(conn);
    if (ledger && flag(pick(ledger), period, index)) return;
    if (attempt === 10) log("   still waiting for the chain to catch up…");
  }
  throw new Error(
    `Employee ${index + 1} was submitted but has not appeared on chain after two minutes`
  );
}

function flag(map: any, period: bigint, index: number): boolean {
  if (!map?.member(period)) return false;
  const inner = map.lookup(period);
  return inner.member(BigInt(index)) ? inner.lookup(BigInt(index)) : false;
}

/**
 * Funds then pays every outstanding slot of one period.
 *
 * Safe to re-run: the contract refuses to fund or pay a slot twice, so an
 * interrupted run is resumed by calling again.
 */
export async function fundAndPay(
  instance: string,
  period: number,
  slots: SlotInput[],
  log: RunProgress = () => {}
): Promise<RunResult> {
  const tokenId = process.env.peur_token_id?.trim();
  if (!tokenId) throw new Error("peur_token_id is not set in .env");

  log("Building wallet and syncing…");
  const conn = await connect("payroll", instance);

  try {
    const p = BigInt(period);
    const color = Uint8Array.from(Buffer.from(tokenId, "hex"));

    const ledger = await readLedger(conn);
    if (!ledger) throw new Error("No contract state on chain");
    if (!ledger.commitmentsFor.member(p)) {
      throw new Error(`Period ${period} has not been filed on this contract`);
    }

    // Check the supplied material against the chain once, rather than
    // discovering it ten times as circuit failures. If the first opening does
    // not reproduce its commitment, the passphrase behind it was wrong or the
    // roster does not match what was filed — and nothing below can succeed.
    const check = conn.contractModule.pureCircuits.commitmentFor(
      slots[0]!.salary,
      slots[0]!.salaryNonce
    );
    const onChain = ledger.commitmentsFor.lookup(p).lookup(0n);
    if (Buffer.from(check).toString("hex") !== Buffer.from(onChain).toString("hex")) {
      throw new Error(
        "The supplied openings do not reproduce this period's commitments — " +
          "either the passphrase was wrong or the roster does not match what was filed."
      );
    }

    let funded = 0;
    let alreadyFunded = 0;

    for (const [i, slot] of slots.entries()) {
      if (flag(ledger.fundedFor, p, i)) {
        alreadyFunded += 1;
        continue;
      }
      log(`Funding employee ${i + 1}/${slots.length}…`);
      await conn.deployed.callTx.fundEmployee(p, BigInt(i), slot.salary, slot.salaryNonce, {
        nonce: slot.coinNonce,
        color,
        value: slot.salary,
      });
      funded += 1;
    }

    // Re-read: the coins just created are the ones to spend, and the flags
    // moved. Both come from chain rather than from what this loop believes.
    //
    // The leaf list needs care. `filter(address)` reports every coin the
    // contract ever received, including ones it has since spent — there is no
    // "unspent" view — so leaves are matched to slots positionally: funding
    // happens in index order, so the nth contract leaf funds the nth slot.
    // Already-paid slots therefore consume their leaf without paying again.
    const after = await readLedger(conn);
    const allLeaves = await contractLeaves(conn);

    let paid = 0;
    let alreadyPaid = 0;

    for (const [i, slot] of slots.entries()) {
      const leaf = allLeaves[i];

      if (flag(after.paidFor, p, i)) {
        alreadyPaid += 1;
        continue;
      }
      if (!flag(after.fundedFor, p, i)) continue;

      if (leaf === undefined) {
        throw new Error(
          `Ran out of contract coins at employee ${i + 1} — the indexer may be behind`
        );
      }

      log(`Paying employee ${i + 1}/${slots.length}…`);
      // submitCallTx rather than the callTx shorthand: the shorthand cannot
      // carry the encryption-key mapping, and without it the coin is created
      // but the payee's wallet can never detect it.
      await submitCallTx(conn.providers as any, {
        compiledContract: conn.compiledContract,
        contractAddress: conn.contractAddress,
        circuitId: "payEmployee",
        args: [
          p,
          BigInt(i),
          slot.salary,
          slot.salaryNonce,
          {
            nonce: slot.coinNonce,
            color,
            value: slot.salary,
            mt_index: BigInt(leaf),
          },
          { bytes: slot.payee },
        ],
        additionalCoinEncPublicKeyMappings: new Map([
          [Buffer.from(slot.payee).toString("hex"), slot.payeeEnc],
        ]),
      } as any);

      // Confirmed on chain before moving on, not merely submitted.
      await waitForFlag(conn, (l) => l.paidFor, p, i, log);
      paid += 1;
    }

    log(`Done — funded ${funded}, paid ${paid}`);
    return {
      contractAddress: conn.contractAddress,
      period,
      funded,
      paid,
      alreadyFunded,
      alreadyPaid,
    };
  } finally {
    await conn.wallet.facade.stop();
  }
}

/** The wallet this service signs with, so callers can check it is the employer. */
export function servicePublicKey(): string {
  return EnvironmentManager.describeWalletSecret();
}

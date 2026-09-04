// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * What a period may still be corrected to, once money has moved against it.
 *
 * `setPayroll` overwrites a month in place — a correction to a filing is a real
 * thing that happens, and keying by period is what makes it possible without
 * disturbing any other month. The guards on it are the whole story, and both of
 * the ones exercised here were missing.
 *
 * ── The withholding guard ─────────────────────────────────────────────────
 *
 * `withheldFor` is written true when the withholding is funded and is never
 * reset, while `totalTaxFor` and `totalSocialFor` are rewritten by every filing.
 * Re-filing therefore desynchronised them, and both of the states that left were
 * unrecoverable:
 *
 *   • before remitting — `taxCoinFor` still names a coin holding the OLD amount
 *     while `remit` asserts `coin.value == owed` against the NEW total, an
 *     assert that can never pass again. The coin is unspendable, not merely
 *     unaccounted, and re-funding is refused because `withheldFor` is true.
 *   • after remitting — `withheldFor` is still true, so the corrected month's
 *     withholding can never be funded at all, and the chain shows a tax total
 *     larger than anything ever collected.
 *
 * ── The termination reset ─────────────────────────────────────────────────
 *
 * A slot is an index, not a person. `setPayroll` rewrites `payeeFor`, so slot 0
 * after a re-file need not be slot 0 before it — and a termination left in place
 * would stay attached to the index and silently transfer to whoever now occupies
 * it. An employer would be holding an on-chain attestation that employment ended
 * for someone they never said it about.
 *
 * Compiling proves the guards exist. It does not prove they FIRE, so this drives
 * the real compiled circuits: no wallet, no node, no proofs.
 *
 * Roster size is 2, so every vector here is two wide.
 */

import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import * as taxparams from "../contracts/managed/taxparams/contract/index.js";
import { DUTCH_V1, computeLine } from "../dist/utils/tax-params.js";

let failures = 0;
const ok = (name) => console.log(`  ok  ${name}`);
const fail = (name, detail) => {
  failures += 1;
  console.error(`  FAIL  ${name}\n        ${detail}`);
};

const key = (byte) => ({ bytes: new Uint8Array(32).fill(byte) });
const bytes32 = (byte) => new Uint8Array(32).fill(byte);
const hex = (b) => Buffer.from(b).toString("hex");

const PLATFORM = key(0x11);
const EMPLOYER = key(0x22);
const PERIOD = 202603n;
const TOKEN = bytes32(0xcc);

const ADDRESS = sampleContractAddress();
// `kernel.self().bytes` inside the circuit — the address the payee binding is
// tied to, so a binding computed for one instance cannot be replayed into
// another.
const INSTANCE = Uint8Array.from(Buffer.from(ADDRESS, "hex"));
const contract = new payroll.Contract({});

const PARAMS = {
  version: BigInt(DUTCH_V1.version),
  validFrom: BigInt(DUTCH_V1.validFrom),
  threshold1: DUTCH_V1.threshold1,
  threshold2: DUTCH_V1.threshold2,
  rate1: BigInt(DUTCH_V1.rate1),
  rate2: BigInt(DUTCH_V1.rate2),
  rate3: BigInt(DUTCH_V1.rate3),
  maxContribBase: DUTCH_V1.maxContribBase,
  contribRate: BigInt(DUTCH_V1.contribRate),
};
const PARAMS_HASH = taxparams.pureCircuits.paramsHash(PARAMS);

function deploy() {
  const { currentContractState } = contract.initialState(
    createConstructorContext({}, hex(PLATFORM.bytes)),
    key(0xaa),
    key(0xbb)
  );
  return currentContractState;
}

const as = (caller, data) => {
  const wrapper = deploy();
  wrapper.data = data;
  return createCircuitContext(ADDRESS, hex(caller.bytes), wrapper, {});
};

/** Throws on refusal — for the steps that are setup rather than the assertion. */
function call(caller, state, circuit, ...args) {
  const { context } = contract.impureCircuits[circuit](as(caller, state), ...args);
  return context.currentQueryContext.state;
}

/** Reports rather than throws — for the steps whose refusal IS the check. */
function tryCall(caller, state, circuit, ...args) {
  try {
    return { ok: true, state: call(caller, state, circuit, ...args) };
  } catch (cause) {
    return { ok: false, error: String(cause?.message ?? cause) };
  }
}

/** The binding the contract checks a recipient against. */
const binding = (payee, period) =>
  payroll.pureCircuits.payeeHash(payee, period, INSTANCE);

/** Files `period` with the given gross figures, returning the new state. */
function file(state, period, gross, payeeKeys) {
  const lines = gross.map((g) => computeLine(g, DUTCH_V1));
  const payees = payeeKeys.map((k) => binding(k, period));
  return call(EMPLOYER, state, "setPayroll",
    period,
    gross,
    [4n, 4n],
    lines.map((l) => l.taxQuotient),
    lines.map((l) => l.contribQuotient),
    [bytes32(0x01), bytes32(0x02)],
    [new Uint8Array(100), new Uint8Array(100)],
    payees,
    PARAMS
  );
}

const coin = (n, value) => ({ nonce: bytes32(n), color: TOKEN, value });
/** A coin that can be SPENT: same, plus its position in the Zswap tree. */
const qualified = (n, value, index) => ({
  nonce: bytes32(n),
  color: TOKEN,
  value,
  mt_index: index,
});

const PAYEE_A = key(0x71);
const PAYEE_B = key(0x72);
const PAYEE_C = key(0x81);

console.log("\nre-filing a period\n");

const GROSS = [400000n, 650000n];
const LINES = GROSS.map((g) => computeLine(g, DUTCH_V1));

let base = deploy().data;
base = call(PLATFORM, base, "setParamsFor", PERIOD / 100n, PERIOD % 100n, 1n, PARAMS_HASH);
base = call(PLATFORM, base, "assignEmployer", EMPLOYER);
base = file(base, PERIOD, GROSS, [PAYEE_A, PAYEE_B]);

// ── An untouched month is still correctable ───────────────────────────────
//
// The guards must not have closed the ordinary case: a filing with nothing
// funded against it is exactly what re-filing exists for.
{
  const again = tryCall(EMPLOYER, base, "setPayroll",
    PERIOD, [500000n, 650000n], [4n, 4n],
    [500000n, 650000n].map((g) => computeLine(g, DUTCH_V1).taxQuotient),
    [500000n, 650000n].map((g) => computeLine(g, DUTCH_V1).contribQuotient),
    [bytes32(0x01), bytes32(0x02)],
    [new Uint8Array(100), new Uint8Array(100)],
    [binding(PAYEE_A, PERIOD), binding(PAYEE_B, PERIOD)],
    PARAMS
  );
  if (again.ok) ok("a month with nothing funded against it can be re-filed");
  else fail("a month with nothing funded against it can be re-filed", again.error);
}

// ── Funded withholding closes the month ───────────────────────────────────
//
// The scenario is the one the OLD guard let through, not one it already
// stopped: every slot funded AND paid, which satisfies "settle them before
// re-filing" completely. Before this assert existed the re-file was accepted
// here, `totalTaxFor` moved, and the tax coin recorded in `taxCoinFor` could
// never satisfy `remit` again.
{
  const taxTotal = LINES[0].taxQuotient + LINES[1].taxQuotient;
  const socialTotal = LINES[0].contribQuotient + LINES[1].contribQuotient;

  let s = call(EMPLOYER, base, "fundPeriod",
    PERIOD,
    GROSS,
    LINES.map((l) => l.taxQuotient),
    LINES.map((l) => l.contribQuotient),
    LINES.map((l) => l.netMinor),
    [4n, 4n],
    [bytes32(0x01), bytes32(0x02)],
    [coin(0xf0, LINES[0].netMinor), coin(0xf1, LINES[1].netMinor)],
    coin(0xf2, taxTotal),
    coin(0xf3, socialTotal)
  );

  s = call(EMPLOYER, s, "payPeriod",
    PERIOD,
    GROSS,
    LINES.map((l) => l.taxQuotient),
    LINES.map((l) => l.contribQuotient),
    LINES.map((l) => l.netMinor),
    [4n, 4n],
    [bytes32(0x01), bytes32(0x02)],
    [qualified(0xf0, LINES[0].netMinor, 0n), qualified(0xf1, LINES[1].netMinor, 1n)],
    [PAYEE_A, PAYEE_B]
  );

  const l = payroll.ledger(s);
  const settled =
    l.withheldFor.member(PERIOD) && l.withheldFor.lookup(PERIOD) &&
    l.paidFor.lookup(PERIOD).lookup(0n) && l.paidFor.lookup(PERIOD).lookup(1n);
  if (settled) ok("the month is fully funded, withheld and paid");
  else fail("the month is fully funded, withheld and paid", JSON.stringify({
    withheld: l.withheldFor.member(PERIOD) && l.withheldFor.lookup(PERIOD),
  }));

  // Every slot is paid, so the older guard is satisfied and says nothing here.
  const refile = tryCall(EMPLOYER, s, "setPayroll",
    PERIOD, [500000n, 650000n], [4n, 4n],
    [500000n, 650000n].map((g) => computeLine(g, DUTCH_V1).taxQuotient),
    [500000n, 650000n].map((g) => computeLine(g, DUTCH_V1).contribQuotient),
    [bytes32(0x01), bytes32(0x02)],
    [new Uint8Array(100), new Uint8Array(100)],
    [binding(PAYEE_A, PERIOD), binding(PAYEE_B, PERIOD)],
    PARAMS
  );
  if (!refile.ok && /withholding is funded/.test(refile.error))
    ok("a paid month whose withholding is funded still cannot be re-filed");
  else
    fail(
      "a paid month whose withholding is funded still cannot be re-filed",
      refile.ok
        ? "the re-file was accepted — the tax coin recorded for this period can no longer satisfy remit"
        : refile.error
    );
}

// ── A termination requires a settled slot ─────────────────────────────────
{
  const unpaid = tryCall(EMPLOYER, base, "endEmployment", PERIOD, 0n, bytes32(0x99));
  if (!unpaid.ok && /has not been paid/.test(unpaid.error))
    ok("a slot that was filed but never paid cannot be terminated");
  else
    fail(
      "a slot that was filed but never paid cannot be terminated",
      unpaid.ok ? "the termination was recorded against a month where no money moved" : unpaid.error
    );
}

// ── A termination does not survive a re-file ──────────────────────────────
//
// The hazard is the slot changing hands. Slot 0 is filed for payee 0x71, paid,
// ended, and then re-filed for payee 0x81 — a different person, same index.
//
// The route has to be the per-slot one. `endEmployment` now needs the slot paid,
// and `setPayroll` refuses to re-file a month whose withholding is funded — so
// on the `fundPeriod` path the two guards close around each other and a month
// carrying a termination can never be re-filed at all. Funding with
// `fundEmployee` leaves `withheldFor` false, which is the single remaining
// window and the one this line exists for.
{
  /** Funds and pays every slot WITHOUT touching the withholding. */
  const settle = (state, gross, payeeKeys) => {
    const lines = gross.map((g) => computeLine(g, DUTCH_V1));
    let s = state;
    for (const i of [0, 1]) {
      s = call(EMPLOYER, s, "fundEmployee",
        PERIOD, BigInt(i), gross[i], lines[i].taxQuotient, lines[i].contribQuotient,
        lines[i].netMinor, 4n, bytes32(i === 0 ? 0x01 : 0x02),
        coin(0xa0 + i, lines[i].netMinor));
    }
    for (const i of [0, 1]) {
      s = call(EMPLOYER, s, "payEmployee",
        PERIOD, BigInt(i), gross[i], lines[i].taxQuotient, lines[i].contribQuotient,
        lines[i].netMinor, 4n, bytes32(i === 0 ? 0x01 : 0x02),
        qualified(0xa0 + i, lines[i].netMinor, BigInt(i)), payeeKeys[i]);
    }
    return s;
  };

  const paid = settle(base, GROSS, [PAYEE_A, PAYEE_B]);
  const ended = call(EMPLOYER, paid, "endEmployment", PERIOD, 0n, bytes32(0x99));
  const before = payroll.ledger(ended);
  if (before.terminationFor.member(PERIOD) &&
      before.terminationFor.lookup(PERIOD).member(0n))
    ok("a settled slot can be terminated");
  else fail("a settled slot can be terminated", "not recorded");

  // Write-once holds within a filing.
  const twice = tryCall(EMPLOYER, ended, "endEmployment", PERIOD, 0n, bytes32(0x98));
  if (!twice.ok && /already been ended/.test(twice.error))
    ok("a termination cannot be restated within the same filing");
  else
    fail(
      "a termination cannot be restated within the same filing",
      twice.ok ? "the slot was ended twice" : twice.error
    );

  const refiled = file(ended, PERIOD, [500000n, 650000n], [PAYEE_C, PAYEE_B]);
  const after = payroll.ledger(refiled);
  const stale =
    after.terminationFor.member(PERIOD) &&
    after.terminationFor.lookup(PERIOD).member(0n);
  if (!stale)
    ok("re-filing clears the termination rather than transferring it to the new occupant");
  else
    fail(
      "re-filing clears the termination rather than transferring it to the new occupant",
      "the attestation survived and now names a payee it was never made about"
    );

  // The re-file cleared `paidFor` too, so the corrected month is unsettled and
  // the new statement cannot rest on the money the superseded one rested on.
  const tooSoon = tryCall(EMPLOYER, refiled, "endEmployment", PERIOD, 0n, bytes32(0x97));
  if (!tooSoon.ok && /has not been paid/.test(tooSoon.error))
    ok("the corrected month must be settled again before it can be attested");
  else
    fail(
      "the corrected month must be settled again before it can be attested",
      tooSoon.ok ? "attested against a month the re-file had unpaid" : tooSoon.error
    );

  const resettled = settle(refiled, [500000n, 650000n], [PAYEE_C, PAYEE_B]);
  const reEnded = tryCall(EMPLOYER, resettled, "endEmployment", PERIOD, 0n, bytes32(0x97));
  if (reEnded.ok) ok("once settled afresh, the corrected month can be attested");
  else fail("once settled afresh, the corrected month can be attested", reEnded.error);
}

console.log(
  failures === 0
    ? "\nall re-file guard checks passed\n"
    : `\n${failures} re-file guard check(s) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);

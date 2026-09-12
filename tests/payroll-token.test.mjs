// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The pay token frozen at deploy, and a termination that needs its month's
 * withholding funded — driven through the real compiled circuits.
 *
 * ── The token ─────────────────────────────────────────────────────────────
 *
 * `payToken` used to be fixed by the first coin the contract received. Funding
 * is employer-only, so that let the employer choose any token — a self-minted
 * one included — and still have every slot marked funded and paid and the tax
 * marked remitted. It is a constructor argument now; these checks prove a coin
 * in another token is refused on every funding path, including the very first.
 *
 * ── The termination ───────────────────────────────────────────────────────
 *
 * `endEmployment` used to require only the slot PAID. A month settled through
 * `fundEmployee` + `payEmployee` alone could therefore carry a termination
 * whose tax never arrived — and since only funded withholding blocks a re-file,
 * that termination could be wiped and restated by re-filing the month. It now
 * requires the withholding funded, which closes both.
 *
 *   npm run test:payroll-token
 */
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger, pureCircuits } from "../contracts/managed/payroll/contract/index.js";
import * as taxparams from "../contracts/managed/taxparams/contract/index.js";
import { DUTCH_V1, computeLine } from "../dist/utils/tax-params.js";

let failures = 0;
const expect = (name, cond, detail = "") => {
  if (cond) console.log(`  ok  ${name}`);
  else {
    failures += 1;
    console.error(`  FAIL  ${name}\n        ${detail}`);
  }
};

const key = (b) => ({ bytes: new Uint8Array(32).fill(b) });
const hex = (bytes) => Buffer.from(bytes).toString("hex");
const bytes32 = (b) => new Uint8Array(32).fill(b);

const PLATFORM = key(0x11);
const EMPLOYER = key(0x22);
const TAX = key(0xaa);
const SOCIAL = key(0xbb);
const TOKEN = bytes32(0xcc);
const JUNK = bytes32(0xdd);
const PAYEE_A = key(0x71);
const PAYEE_B = key(0x72);
const PERIOD = 202603n;

const ADDRESS = sampleContractAddress();
const INSTANCE = Uint8Array.from(Buffer.from(ADDRESS, "hex"));
const contract = new Contract({});

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
const GROSS = [400000n, 650000n];
const LINES = GROSS.map((g) => computeLine(g, DUTCH_V1));
const TAX_TOTAL = LINES[0].taxQuotient + LINES[1].taxQuotient;
const SOCIAL_TOTAL = LINES[0].contribQuotient + LINES[1].contribQuotient;
const NONCES = [bytes32(0x01), bytes32(0x02)];

const coin = (n, value, color = TOKEN) => ({ nonce: bytes32(n), color, value });
const qualified = (n, value, index) => ({ nonce: bytes32(n), color: TOKEN, value, mt_index: index });
const binding = (payee) => pureCircuits.payeeHash(payee, PERIOD, INSTANCE);

function deploy() {
  return contract.initialState(createConstructorContext({}, hex(PLATFORM.bytes)), TAX, SOCIAL, TOKEN)
    .currentContractState;
}
const as = (caller, data) => {
  const wrapper = deploy();
  wrapper.data = data;
  return createCircuitContext(ADDRESS, hex(caller.bytes), wrapper, {});
};
/** Reports rather than throws: half these cases expect a refusal. */
function call(caller, state, circuit, ...args) {
  try {
    const { context } = contract.impureCircuits[circuit](as(caller, state), ...args);
    return { ok: true, state: context.currentQueryContext.state };
  } catch (cause) {
    return { ok: false, error: String(cause?.message ?? cause) };
  }
}
const must = (r, what) => {
  if (!r.ok) throw new Error(`setup step failed: ${what}: ${r.error}`);
  return r.state;
};

const filing = () => [
  PERIOD, GROSS, [4n, 4n],
  LINES.map((l) => l.taxQuotient), LINES.map((l) => l.contribQuotient),
  NONCES, [new Uint8Array(100), new Uint8Array(100)],
  [binding(PAYEE_A), binding(PAYEE_B)], PARAMS,
];

/** Deployed, employer seated, rules recorded, March filed. */
function filed() {
  let s = deploy().data;
  s = must(call(PLATFORM, s, "assignEmployer", EMPLOYER), "assign");
  s = must(call(PLATFORM, s, "setParamsFor", 2026n, 3n, 1n, PARAMS_HASH), "params");
  return must(call(EMPLOYER, s, "setPayroll", ...filing()), "file");
}
const fundSlot = (s, i, c) =>
  call(EMPLOYER, s, "fundEmployee",
    PERIOD, BigInt(i), GROSS[i], LINES[i].taxQuotient, LINES[i].contribQuotient,
    LINES[i].netMinor, 4n, NONCES[i], c);
const paySlot = (s, i, c, payee) =>
  call(EMPLOYER, s, "payEmployee",
    PERIOD, BigInt(i), GROSS[i], LINES[i].taxQuotient, LINES[i].contribQuotient,
    LINES[i].netMinor, 4n, NONCES[i], c, payee);
const fundPeriodWith = (s, color) =>
  call(EMPLOYER, s, "fundPeriod",
    PERIOD, GROSS, LINES.map((l) => l.taxQuotient), LINES.map((l) => l.contribQuotient),
    LINES.map((l) => l.netMinor), [4n, 4n], NONCES,
    [coin(0xf0, LINES[0].netMinor, color), coin(0xf1, LINES[1].netMinor, color)],
    coin(0xf2, TAX_TOTAL, color), coin(0xf3, SOCIAL_TOTAL, color));

console.log("\npay token and termination\n");

// ── The token is set by the constructor, not by a coin ─────────────────────
{
  expect("the constructor freezes payToken", hex(ledger(deploy().data).payToken) === hex(TOKEN));

  const junk = fundSlot(filed(), 0, coin(0xf0, LINES[0].netMinor, JUNK));
  expect("a self-minted coin cannot fund even the first slot",
    !junk.ok && /wrong token/.test(junk.error), junk.ok ? "accepted" : junk.error);

  const real = fundSlot(filed(), 0, coin(0xf0, LINES[0].netMinor));
  expect("the deploy-time token funds a slot", real.ok, real.error);

  const junkPeriod = fundPeriodWith(filed(), JUNK);
  expect("fundPeriod refuses a self-minted token",
    !junkPeriod.ok && /wrong token/.test(junkPeriod.error), junkPeriod.ok ? "accepted" : junkPeriod.error);

  // `fundWithholding` used to refuse to be first, because the first coin fixed
  // the token. With the token fixed at deploy there is nothing to protect.
  const first = call(EMPLOYER, filed(), "fundWithholding", PERIOD, coin(0xf2, TAX_TOTAL), coin(0xf3, SOCIAL_TOTAL));
  expect("withholding can be funded before any employee", first.ok, first.error);
}

// ── The recovery path: nets paid, withholding not funded ───────────────────
{
  let s = filed();
  s = must(fundSlot(s, 0, coin(0xf0, LINES[0].netMinor)), "fund 0");
  s = must(fundSlot(s, 1, coin(0xf1, LINES[1].netMinor)), "fund 1");
  s = must(paySlot(s, 0, qualified(0xf0, LINES[0].netMinor, 0n), PAYEE_A), "pay 0");
  s = must(paySlot(s, 1, qualified(0xf1, LINES[1].netMinor, 1n), PAYEE_B), "pay 1");

  const early = call(EMPLOYER, s, "endEmployment", PERIOD, 0n, bytes32(0x99));
  expect("a paid month whose withholding is not funded cannot carry a termination",
    !early.ok && /withholding is not funded/.test(early.error), early.ok ? "accepted" : early.error);

  // Still correctable while no withholding has moved — the recovery path lives.
  const refile = call(EMPLOYER, s, "setPayroll", ...filing());
  expect("that month can still be re-filed, with no termination to wipe", refile.ok, refile.error);

  s = must(call(EMPLOYER, s, "fundWithholding", PERIOD, coin(0xf2, TAX_TOTAL), coin(0xf3, SOCIAL_TOTAL)), "withhold");
  const later = call(EMPLOYER, s, "endEmployment", PERIOD, 0n, bytes32(0x99));
  expect("once the withholding is funded, the termination is accepted", later.ok, later.error);

  const wipe = call(EMPLOYER, later.state, "setPayroll", ...filing());
  expect("a month carrying a termination cannot be re-filed",
    !wipe.ok && /withholding is funded/.test(wipe.error), wipe.ok ? "the termination was wiped" : wipe.error);

  const again = call(EMPLOYER, later.state, "endEmployment", PERIOD, 0n, bytes32(0x98));
  expect("and it cannot be restated",
    !again.ok && /already been ended/.test(again.error), again.ok ? "restated" : again.error);
}

// ── The normal path still works end to end ─────────────────────────────────
{
  let s = must(fundPeriodWith(filed(), TOKEN), "fundPeriod");
  s = must(call(EMPLOYER, s, "payPeriod",
    PERIOD, GROSS, LINES.map((l) => l.taxQuotient), LINES.map((l) => l.contribQuotient),
    LINES.map((l) => l.netMinor), [4n, 4n], NONCES,
    [qualified(0xf0, LINES[0].netMinor, 0n), qualified(0xf1, LINES[1].netMinor, 1n)],
    [PAYEE_A, PAYEE_B]), "payPeriod");
  const end = call(EMPLOYER, s, "endEmployment", PERIOD, 1n, bytes32(0x97));
  expect("fundPeriod + payPeriod + endEmployment", end.ok, end.error);

  let r = call(PLATFORM, end.state, "remit", PERIOD, true, TAX, qualified(0xf2, TAX_TOTAL, 2n));
  if (r.ok) r = call(PLATFORM, r.state, "remit", PERIOD, false, SOCIAL, qualified(0xf3, SOCIAL_TOTAL, 3n));
  expect("both remits", r.ok, r.error);
  if (r.ok) {
    const l = ledger(r.state);
    expect("the pools are empty after remitting", l.taxPool === 0n && l.socialPool === 0n,
      `taxPool=${l.taxPool} socialPool=${l.socialPool}`);
  }
}

console.log(failures === 0 ? "\nall payroll-token checks passed\n" : `\n${failures} payroll-token check(s) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * Opening a whole year in one transaction.
 *
 * A tax schedule is annual, and recording it a month at a time meant twelve
 * proofs stating one fact twelve times — every entry for a year holds the same
 * hash, because the hash is of the schedule and not of the month. `setParamsFor`
 * takes a range, and `(year, 1, 12)` is a year. This drives the real compiled
 * circuit through the properties that make it safe to run:
 *
 *   - it opens exactly January to December of the year named, and nothing else;
 *   - it is the platform's to call, like the per-month version;
 *   - a month already recorded is left alone, because write-once is a promise
 *     about the month rather than about the year it sits in;
 *   - and a month it opened really is fileable, which is the only thing any of
 *     it is for.
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
const OUTSIDER = key(0x33);
const YEAR = 2026n;
const PERIOD = 202605n;

const ADDRESS = sampleContractAddress();
const contract = new payroll.Contract({});
const INSTANCE = Uint8Array.from(Buffer.from(ADDRESS, "hex"));
const PAYEES = [key(0x71), key(0x72)];

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
// Hashed with the REGISTRY's circuit, not payroll's: the two declarations of
// `TaxParams` are required to stay identical, and using the registry's hash
// here exercises that agreement rather than assuming it.
const PARAMS_HASH = taxparams.pureCircuits.paramsHash(PARAMS);
const OTHER_HASH = bytes32(0x77);

const GROSS = [400000n, 650000n];
const LINES = GROSS.map((g) => computeLine(g, DUTCH_V1));

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

function call(caller, state, circuit, ...args) {
  const { context } = contract.impureCircuits[circuit](as(caller, state), ...args);
  return context.currentQueryContext.state;
}

function refused(caller, state, circuit, ...args) {
  try {
    call(caller, state, circuit, ...args);
    return null;
  } catch (error) {
    return String(error?.message ?? error);
  }
}

console.log("\nopening a year of rule sets\n");

const fresh = deploy().data;

// ── 1. twelve months, and only those twelve ────────────────────────────────
const opened = call(PLATFORM, fresh, "setParamsFor", YEAR, 1n, 12n, PARAMS_HASH);
{
  const l = payroll.ledger(opened);
  const months = [...l.paramsHashFor].map(([p]) => Number(p)).sort((a, b) => a - b);
  const expected = Array.from({ length: 12 }, (_, i) => 202601 + i);
  const allMatch = months.every((p) => hex(l.paramsHashFor.lookup(BigInt(p))) === hex(PARAMS_HASH));

  if (months.join(",") === expected.join(",")) {
    ok("opens January to December of the year named");
  } else {
    fail("opens January to December of the year named", `got ${months.join(", ")}`);
  }
  if (allMatch) ok("every month holds the schedule's hash");
  else fail("every month holds the schedule's hash", "a month holds something else");
  // The bug this guards: a base of year*100 makes 202600 and 202613 one
  // off-by-one away, and either would be a permanently unfileable key.
  if (!l.paramsHashFor.member(202600n) && !l.paramsHashFor.member(202613n)) {
    ok("writes no month 0 and no month 13");
  } else {
    fail("writes no month 0 and no month 13", "an out-of-range key was written");
  }
}

// ── 2. the platform's to call ──────────────────────────────────────────────
{
  const error = refused(OUTSIDER, fresh, "setParamsFor", YEAR, 1n, 12n, PARAMS_HASH);
  if (error && error.includes("only the platform")) ok("an outsider cannot open a year");
  else fail("an outsider cannot open a year", error ?? "it was allowed");
}
{
  const error = refused(PLATFORM, fresh, "setParamsFor", 1999n, 1n, 12n, PARAMS_HASH);
  if (error && error.includes("year must be YYYY")) ok("refuses a year before 2000");
  else fail("refuses a year before 2000", error ?? "it was allowed");
}

// ── 2b. a range cannot run past December ───────────────────────────────────
{
  const error = refused(PLATFORM, fresh, "setParamsFor", YEAR, 11n, 3n, PARAMS_HASH);
  if (error && error.includes("runs past December")) {
    ok("refuses a range that would roll into a month 13");
  } else {
    fail("refuses a range that would roll into a month 13", error ?? "it was allowed");
  }
}
{
  const one = call(PLATFORM, fresh, "setParamsFor", YEAR, 9n, 1n, PARAMS_HASH);
  const l = payroll.ledger(one);
  const months = [...l.paramsHashFor].map(([p]) => Number(p));
  if (months.length === 1 && months[0] === 202609) ok("a single month still works");
  else fail("a single month still works", `got ${months.join(", ")}`);
}

// ── 3. a month already recorded outranks the year ──────────────────────────
{
  const march = call(PLATFORM, fresh, "setParamsFor", YEAR, 3n, 1n, OTHER_HASH);
  const both = call(PLATFORM, march, "setParamsFor", YEAR, 1n, 12n, PARAMS_HASH);
  const l = payroll.ledger(both);
  const marchKept = hex(l.paramsHashFor.lookup(202603n)) === hex(OTHER_HASH);
  const aprilOpened = hex(l.paramsHashFor.lookup(202604n)) === hex(PARAMS_HASH);
  if (marchKept && aprilOpened) {
    ok("a month recorded earlier is left as it was, and the rest still open");
  } else {
    fail(
      "a month recorded earlier is left as it was, and the rest still open",
      `march kept: ${marchKept}, april opened: ${aprilOpened}`
    );
  }

  // Twice is not an error: "open the year" is only useful as an operation if
  // running it again is safe.
  const again = call(PLATFORM, both, "setParamsFor", YEAR, 1n, 12n, PARAMS_HASH);
  const l2 = payroll.ledger(again);
  if (
    hex(l2.paramsHashFor.lookup(202603n)) === hex(OTHER_HASH) &&
    [...l2.paramsHashFor].length === 12
  ) {
    ok("running it twice changes nothing");
  } else {
    fail("running it twice changes nothing", "the second run altered the map");
  }
}

// ── 4. a month it opened is fileable ───────────────────────────────────────
{
  const assigned = call(PLATFORM, opened, "assignEmployer", EMPLOYER);
  try {
    const filed = call(EMPLOYER, assigned, "setPayroll",
      PERIOD,
      GROSS,
      [4n, 4n],
      LINES.map((l) => l.taxQuotient),
      LINES.map((l) => l.contribQuotient),
      [bytes32(0x01), bytes32(0x02)],
      [new Uint8Array(100), new Uint8Array(100)],
      PAYEES.map((k) => payroll.pureCircuits.payeeHash(k, PERIOD, INSTANCE)),
      PARAMS
    );
    const l = payroll.ledger(filed);
    if (l.periods.member(PERIOD)) ok("a month opened by the year can be filed");
    else fail("a month opened by the year can be filed", "the period was not recorded");
  } catch (error) {
    fail("a month opened by the year can be filed", String(error?.message ?? error));
  }
}

// ── 5. a month outside the year is still refused ───────────────────────────
{
  const assigned = call(PLATFORM, opened, "assignEmployer", EMPLOYER);
  const error = refused(EMPLOYER, assigned, "setPayroll",
    202701n,
    GROSS,
    [4n, 4n],
    LINES.map((l) => l.taxQuotient),
    LINES.map((l) => l.contribQuotient),
    [bytes32(0x01), bytes32(0x02)],
    [new Uint8Array(100), new Uint8Array(100)],
    PAYEES.map((k) => payroll.pureCircuits.payeeHash(k, 202701n, INSTANCE)),
    PARAMS
  );
  if (error && error.includes("no rule set recorded")) {
    ok("a month in an unopened year is still refused");
  } else {
    fail("a month in an unopened year is still refused", error ?? "it was allowed");
  }
}

console.log();
if (failures > 0) {
  console.error(`${failures} check(s) failed\n`);
  process.exit(1);
}
console.log("all checks passed\n");

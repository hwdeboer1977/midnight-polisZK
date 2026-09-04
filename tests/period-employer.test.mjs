// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * A commitment stays openable after the seat moves.
 *
 * `PayrollCommitment` binds the employer key, and every circuit that reopens
 * one used to read `employer` — the key holding the seat RIGHT NOW. That key is
 * not stable: `revokeEmployer` zeroes it and `transferSeat` replaces it. So
 * two ordinary administrative acts silently invalidated every payslip already
 * issued, and `checkPayslip` reported it with the message that means the
 * figures had been altered.
 *
 * `employerFor` records the filer per period instead. This drives the real
 * compiled circuits through both acts and checks the commitment still opens —
 * which is the property the whole payslip story rests on, and the one that was
 * broken on a live contract before anyone noticed.
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
const EMPLOYER_A = key(0x22);
const ROTATED_A = key(0x44);
const PERIOD = 202603n;

const ADDRESS = sampleContractAddress();
const contract = new payroll.Contract({});

// Real payee bindings rather than arbitrary bytes: `endEmployment` now requires
// the slot to have been PAID, and paying checks the recipient against these.
const INSTANCE = Uint8Array.from(Buffer.from(ADDRESS, "hex"));
const PAYEES = [key(0x71), key(0x72)];
const TOKEN = bytes32(0xcc);

/**
 * The rule set, hashed with the REGISTRY's circuit rather than payroll's.
 *
 * `TaxParams` is declared in both contracts and the two declarations are
 * required to stay identical — payroll checks its filings against the hash the
 * registry published. Hashing here with the registry's circuit is therefore not
 * a shortcut: it is the same cross-contract agreement the real filing path
 * depends on, exercised rather than assumed.
 */
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
const NONCES = [bytes32(0x01), bytes32(0x02)];

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

console.log("\nthe employer a period was filed by\n");

let state = deploy().data;
state = call(PLATFORM, state, "setParamsFor", PERIOD / 100n, PERIOD % 100n, 1n, PARAMS_HASH);
state = call(PLATFORM, state, "assignEmployer", EMPLOYER_A);
state = call(EMPLOYER_A, state, "setPayroll",
  PERIOD,
  GROSS,
  [4n, 4n],
  LINES.map((l) => l.taxQuotient),
  LINES.map((l) => l.contribQuotient),
  NONCES,
  [new Uint8Array(100), new Uint8Array(100)],
  PAYEES.map((k) => payroll.pureCircuits.payeeHash(k, PERIOD, INSTANCE)),
  PARAMS
);

const filed = payroll.ledger(state);

// ── The filer is recorded, and it is the employer who filed ────────────────
if (filed.employerFor.member(PERIOD) &&
    hex(filed.employerFor.lookup(PERIOD).bytes) === hex(EMPLOYER_A.bytes))
  ok("setPayroll records the employer that filed the period");
else fail("setPayroll records the employer that filed the period", "not recorded");

/** Reproduces slot 0's commitment with whichever key is passed. */
const opens = (state, employerKey) => {
  const l = payroll.ledger(state);
  const computed = payroll.pureCircuits.commitmentFor(
    LINES[0].grossMinor,
    LINES[0].taxQuotient,
    LINES[0].contribQuotient,
    LINES[0].netMinor,
    4n,
    PERIOD,
    employerKey,
    l.paramsHashFor.lookup(PERIOD),
    NONCES[0]
  );
  return hex(computed) === hex(l.commitmentsFor.lookup(PERIOD).lookup(0n));
};

if (opens(state, EMPLOYER_A)) ok("a payslip opens the commitment while the seat is held");
else fail("a payslip opens the commitment while the seat is held", "it did not open");

// ── After a revoke ─────────────────────────────────────────────────────────
//
// The regression that was live on `fac350489f46c3cc…`: the seat is empty, so
// `employer` reads as the zero key and every payslip fails.
{
  const revoked = call(PLATFORM, state, "revokeEmployer");
  const l = payroll.ledger(revoked);

  if (hex(l.employer.bytes) === "00".repeat(32))
    ok("revoke zeroes the live seat, as it always did");
  else fail("revoke zeroes the live seat, as it always did", hex(l.employer.bytes));

  if (hex(l.employerFor.lookup(PERIOD).bytes) === hex(EMPLOYER_A.bytes))
    ok("the period still names the employer that filed it");
  else fail("the period still names the employer that filed it", "it was cleared too");

  if (opens(revoked, l.employerFor.lookup(PERIOD)))
    ok("a payslip still verifies after the employer is revoked");
  else fail("a payslip still verifies after the employer is revoked", "it did not open");

  // The old behaviour, kept as a check so the fix cannot be quietly undone:
  // reading the live seat is what used to happen, and it must NOT open.
  if (!opens(revoked, l.employer))
    ok("reading the live seat instead would still fail — the bug is real");
  else fail("reading the live seat instead would still fail", "the zero key opened it");
}

// ── After a key rotation ───────────────────────────────────────────────────
//
// Worse than the revoke, because it is permanent and employer-initiated: an
// unpaid period filed under the old key could never be paid, since
// `payEmployee` could not reproduce the commitment it has to open.
{
  const rotated = call(EMPLOYER_A, state, "transferSeat", false, ROTATED_A);
  const l = payroll.ledger(rotated);

  if (hex(l.employer.bytes) === hex(ROTATED_A.bytes))
    ok("rotation moves the seat to the new key");
  else fail("rotation moves the seat to the new key", hex(l.employer.bytes));

  if (opens(rotated, l.employerFor.lookup(PERIOD)))
    ok("a payslip still verifies after the employer rotates their key");
  else fail("a payslip still verifies after the employer rotates their key", "it did not open");

  if (!opens(rotated, l.employer))
    ok("the rotated key does not open a commitment filed by the old one");
  else fail("the rotated key does not open a commitment filed by the old one", "it opened");
}

// ── Who can burn a termination slot ────────────────────────────────────────
//
// `endEmployment` is write-once per slot, so whoever can call it can
// permanently deny an employee the attestation their benefit claim needs. It
// binds nothing to the period's filer, and the earlier plan was to add that.
//
// It is not added, because the seat rule already closes the hole and adding it
// would open a worse one. The hazard was a STRANGER in the seat — only
// reachable while a revoked contract could be handed to a different key, which
// `assignEmployer` now refuses. What remains reachable is the employer's own
// lineage, and gating on the filer would break exactly that: an employer who
// rotates their key could no longer end employment for periods filed under the
// old one, which is the same class of bug `employerFor` was written to fix.
{
  const STRANGER = key(0x99);
  const attestation = bytes32(0xee);

  // `endEmployment` requires a settled slot, so slot 0 is funded and paid
  // before any of this. Funded per-slot rather than with `fundPeriod` on
  // purpose: nothing here is about the withholding.
  const settle = (from) => {
    let s = call(EMPLOYER_A, from, "fundEmployee",
      PERIOD, 0n, GROSS[0], LINES[0].taxQuotient, LINES[0].contribQuotient,
      LINES[0].netMinor, 4n, NONCES[0],
      { nonce: bytes32(0xa0), color: TOKEN, value: LINES[0].netMinor });
    return call(EMPLOYER_A, s, "payEmployee",
      PERIOD, 0n, GROSS[0], LINES[0].taxQuotient, LINES[0].contribQuotient,
      LINES[0].netMinor, 4n, NONCES[0],
      { nonce: bytes32(0xa0), color: TOKEN, value: LINES[0].netMinor, mt_index: 0n },
      PAYEES[0]);
  };
  state = settle(state);
  const refused = (caller, state, expect, name) => {
    try {
      call(caller, state, "endEmployment", PERIOD, 0n, attestation);
      fail(name, "the call was ACCEPTED");
    } catch (cause) {
      const message = String(cause?.message ?? cause);
      if (message.includes(expect)) ok(name);
      else fail(name, message);
    }
  };

  refused(STRANGER, state, "only the employer may end employment",
    "a stranger cannot end employment while the seat is held");

  const revoked = call(PLATFORM, state, "revokeEmployer");
  refused(STRANGER, revoked, "no employer assigned yet",
    "a stranger cannot end employment while the seat is vacant");

  // And they cannot take the seat to get there — the rule from the seat test,
  // restated at the circuit it was protecting.
  try {
    call(PLATFORM, revoked, "assignEmployer", STRANGER);
    fail("a stranger cannot be given the seat to reach it", "the assignment was ACCEPTED");
  } catch (cause) {
    if (String(cause?.message ?? cause).includes("belongs to another employer"))
      ok("a stranger cannot be given the seat to reach it");
    else fail("a stranger cannot be given the seat to reach it", String(cause?.message ?? cause));
  }

  // The employer's own rotated key still can, which is the case a filer-gate
  // would have broken.
  const rotated = call(EMPLOYER_A, state, "transferSeat", false, ROTATED_A);
  try {
    call(ROTATED_A, rotated, "endEmployment", PERIOD, 0n, attestation);
    ok("the employer's rotated key can still end employment for an older period");
  } catch (cause) {
    fail(
      "the employer's rotated key can still end employment for an older period",
      String(cause?.message ?? cause)
    );
  }
}

console.log(
  failures === 0
    ? "\nall period-employer checks passed\n"
    : `\n${failures} period-employer check(s) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);

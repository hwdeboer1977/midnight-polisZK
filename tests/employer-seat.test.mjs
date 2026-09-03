// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * The seat rule, driven through the real compiled circuits.
 *
 * `assignEmployer` used to assert only that the caller was the platform and the
 * seat was vacant, so a revoked contract could be handed to any key at all —
 * including a company unrelated to the payroll already filed in it. The fix
 * remembers the holder across a revoke and refuses anyone else.
 *
 * Compiling proves the assert exists. It does not prove the assert FIRES, and
 * an ownership rule that is one boolean away from letting a stranger in is
 * exactly the kind of thing that should be executed rather than read. So this
 * runs the contract locally — no wallet, no node, no proofs — and drives the
 * seat through every transition the rule is supposed to cover.
 *
 * `ownPublicKey()` reads the caller out of the Zswap local state, so switching
 * caller is switching that state. That is what `as()` below is for, and it is
 * the whole reason a platform-only circuit can be tested for refusing the
 * platform's own bad request rather than only for refusing outsiders.
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
const ok = (name) => console.log(`  ok  ${name}`);
const fail = (name, detail) => {
  failures += 1;
  console.error(`  FAIL  ${name}\n        ${detail}`);
};

/** A distinguishable 32-byte key. */
const key = (byte) => ({ bytes: new Uint8Array(32).fill(byte) });
const hex = (bytes) => Buffer.from(bytes).toString("hex");

const PLATFORM = key(0x11);
const EMPLOYER_A = key(0x22);
const EMPLOYER_B = key(0x33);
const ROTATED_A = key(0x44);
const TAX_TREASURY = key(0xaa);
const SOCIAL_TREASURY = key(0xbb);

const ADDRESS = sampleContractAddress();
const contract = new Contract({});

// ── What the withheld-money guard below needs to file and fund a period ────
const PERIOD = 202603n;
const TOKEN = new Uint8Array(32).fill(0xcc);
const PAYEE_A = key(0x71);
const PAYEE_B = key(0x72);
const bytes32 = (byte) => new Uint8Array(32).fill(byte);
const INSTANCE = Uint8Array.from(Buffer.from(ADDRESS, "hex"));
const binding = (payee) => pureCircuits.payeeHash(payee, PERIOD, INSTANCE);
const coin = (n, value) => ({ nonce: bytes32(n), color: TOKEN, value });
const qualified = (n, value, index) => ({
  nonce: bytes32(n),
  color: TOKEN,
  value,
  mt_index: index,
});

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
// Hashed with the REGISTRY's circuit, not payroll's — the same cross-contract
// agreement a real filing depends on, exercised rather than assumed.
const PARAMS_HASH = taxparams.pureCircuits.paramsHash(PARAMS);
const GROSS = [400000n, 650000n];
const LINES = GROSS.map((g) => computeLine(g, DUTCH_V1));

/** Deploys a fresh instance with PLATFORM as the deployer. */
function deploy() {
  const { currentContractState } = contract.initialState(
    createConstructorContext({}, hex(PLATFORM.bytes)),
    TAX_TREASURY,
    SOCIAL_TREASURY
  );
  return currentContractState;
}

/** A fresh instance's ledger data, which is what every call below threads. */
const fresh = () => deploy().data;

/**
 * A circuit context whose `ownPublicKey()` is `caller`.
 *
 * `createCircuitContext` wants a ContractState while a circuit hands back its
 * successor as raw ledger data, so the state is carried between calls on a
 * single ContractState whose `data` is replaced. Rebuilding the wrapper each
 * time would be tidier and is not available: the runtime exposes no constructor
 * for one from data alone.
 */
const as = (caller, data) => {
  const wrapper = deploy();
  wrapper.data = data;
  return createCircuitContext(ADDRESS, hex(caller.bytes), wrapper, {});
};

/**
 * Runs a circuit and reports what happened, rather than throwing.
 *
 * Returned instead of thrown because both outcomes are expectations here: half
 * these cases are asserting that a call is REFUSED, and the message it is
 * refused with is part of what is being checked.
 */
function call(caller, state, circuit, ...args) {
  try {
    const { context } = contract.impureCircuits[circuit](as(caller, state), ...args);
    return { ok: true, state: context.currentQueryContext.state };
  } catch (cause) {
    return { ok: false, error: String(cause?.message ?? cause) };
  }
}

const seat = (state) => {
  const l = ledger(state);
  return {
    employer: hex(l.employer.bytes),
    assigned: l.employerAssigned,
    last: hex(l.lastEmployer.bytes),
    ever: l.everAssigned,
  };
};

console.log("\nthe employer seat\n");

// ── A fresh contract takes anyone ──────────────────────────────────────────
{
  const first = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  if (!first.ok) fail("a vacant contract accepts a first employer", first.error);
  else {
    const s = seat(first.state);
    if (s.assigned && s.employer === hex(EMPLOYER_A.bytes) && s.ever)
      ok("a vacant contract accepts a first employer");
    else fail("a vacant contract accepts a first employer", JSON.stringify(s));
  }
}

// ── Only the platform may assign ───────────────────────────────────────────
{
  const r = call(EMPLOYER_B, fresh(), "assignEmployer", EMPLOYER_B);
  if (!r.ok && /only the platform may assign/.test(r.error))
    ok("a stranger cannot assign themselves");
  else fail("a stranger cannot assign themselves", r.ok ? "it was accepted" : r.error);
}

// ── The seat cannot be taken while occupied ────────────────────────────────
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const again = call(PLATFORM, held.state, "assignEmployer", EMPLOYER_B);
  if (!again.ok && /employer already assigned/.test(again.error))
    ok("an occupied seat refuses a second employer");
  else fail("an occupied seat refuses a second employer", again.ok ? "it was accepted" : again.error);
}

// ── THE RULE: a revoked seat refuses anyone but its own employer ───────────
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const revoked = call(PLATFORM, held.state, "revokeEmployer");
  if (!revoked.ok) {
    fail("revoke vacates the seat", revoked.error);
  } else {
    const s = seat(revoked.state);
    // The live seat is cleared; the memory of who held it is not.
    if (!s.assigned && s.employer === "00".repeat(32) && s.last === hex(EMPLOYER_A.bytes) && s.ever)
      ok("revoke clears the seat but remembers the holder");
    else fail("revoke clears the seat but remembers the holder", JSON.stringify(s));

    const stranger = call(PLATFORM, revoked.state, "assignEmployer", EMPLOYER_B);
    if (!stranger.ok && /belongs to another employer/.test(stranger.error))
      ok("a revoked contract REFUSES a different employer");
    else
      fail(
        "a revoked contract REFUSES a different employer",
        stranger.ok ? "the platform handed the contract to a stranger" : stranger.error
      );

    const restored = call(PLATFORM, revoked.state, "assignEmployer", EMPLOYER_A);
    if (restored.ok && seat(restored.state).employer === hex(EMPLOYER_A.bytes))
      ok("a revoked contract accepts its own employer back");
    else
      fail(
        "a revoked contract accepts its own employer back",
        restored.ok ? JSON.stringify(seat(restored.state)) : restored.error
      );
  }
}

// ── Rotation moves the memory with the seat ────────────────────────────────
//
// The case this exists for: an employer rotates their key, is later revoked,
// and must still be restorable. If `transferSeat` left `lastEmployer`
// pointing at the retired key, the circuit that exists to stop a lost key
// stranding the instance would be the thing that stranded it.
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const moved = call(EMPLOYER_A, held.state, "transferSeat", false, ROTATED_A);
  if (!moved.ok) {
    fail("the employer may rotate their key", moved.error);
  } else {
    ok("the employer may rotate their key");
    const revoked = call(PLATFORM, moved.state, "revokeEmployer");
    const back = call(PLATFORM, revoked.state, "assignEmployer", ROTATED_A);
    if (back.ok) ok("a rotated key can still be restored after a revoke");
    else fail("a rotated key can still be restored after a revoke", back.error);

    const stale = call(PLATFORM, revoked.state, "assignEmployer", EMPLOYER_A);
    if (!stale.ok && /belongs to another employer/.test(stale.error))
      ok("the key that was rotated AWAY from no longer opens the seat");
    else
      fail(
        "the key that was rotated AWAY from no longer opens the seat",
        stale.ok ? "the retired key was accepted" : stale.error
      );
  }
}

// ── Only the employer may rotate ───────────────────────────────────────────
//
// `transferSeat` carries both seats behind one `isPlatform` flag, so the thing
// worth executing is that the flag selects the GUARD and not merely the field.
// A merge that checked one seat's authorisation and wrote the other's would
// compile, and would hand the platform the employer's key.
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const r = call(PLATFORM, held.state, "transferSeat", false, EMPLOYER_B);
  if (!r.ok && /only the holder of that seat may transfer/.test(r.error))
    ok("the platform cannot rotate the employer's key out from under them");
  else
    fail(
      "the platform cannot rotate the employer's key out from under them",
      r.ok ? "the platform reassigned the seat" : r.error
    );
}

// ── The platform seat rotates, and only its holder rotates it ──────────────
//
// The gap this closes: `setParamsFor` is the gate on every future filing, and
// only the platform can call it. With no rotation, losing that key left the
// instance able to fund and pay what was already filed and never able to file
// again.
{
  const moved = call(PLATFORM, fresh(), "transferSeat", true, EMPLOYER_B);
  if (!moved.ok) {
    fail("the platform may rotate its own key", moved.error);
  } else {
    ok("the platform may rotate its own key");

    const stale = call(PLATFORM, moved.state, "setParamsFor", 202603n, new Uint8Array(32).fill(0x77));
    if (!stale.ok && /only the platform/.test(stale.error))
      ok("the retired platform key no longer sets rule sets");
    else
      fail(
        "the retired platform key no longer sets rule sets",
        stale.ok ? "the retired key was accepted" : stale.error
      );

    const fresh_ = call(EMPLOYER_B, moved.state, "setParamsFor", 202603n, new Uint8Array(32).fill(0x77));
    if (fresh_.ok) ok("the new platform key sets rule sets");
    else fail("the new platform key sets rule sets", fresh_.error);
  }
}

// ── An employer cannot reach the platform seat ─────────────────────────────
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const r = call(EMPLOYER_A, held.state, "transferSeat", true, EMPLOYER_A);
  if (!r.ok && /only the holder of that seat may transfer/.test(r.error))
    ok("the employer cannot take the platform seat");
  else
    fail(
      "the employer cannot take the platform seat",
      r.ok ? "the employer took the platform seat" : r.error
    );
}

// ── The employer seat cannot be rotated while vacant ────────────────────────
//
// With no employer assigned, `employer` is the zero key. Without the vacancy
// check the comparison below would be against that, which is a seat nobody
// holds and therefore one an implementation slip could let anybody claim.
{
  const r = call(EMPLOYER_A, fresh(), "transferSeat", false, EMPLOYER_B);
  if (!r.ok && /no employer assigned yet/.test(r.error))
    ok("a vacant employer seat cannot be rotated");
  else
    fail(
      "a vacant employer seat cannot be rotated",
      r.ok ? "the vacant seat was rotated" : r.error
    );
}

// ── Withheld money must be settled before the seat is vacated ─────────────
//
// Revoking clears `employerAssigned`, and `payEmployee`/`payPeriod` both need
// the seat filled — so a revoke mid-month freezes coins the contract is holding.
// The pool check is a proxy for that: `fundPeriod` takes the nets and the
// withholding together, so a non-zero pool marks a month in flight.
//
// The property that makes it the RIGHT proxy is who can clear it. `remit` is
// callable by the platform with no employer seated, so this delays a revoke by
// one transaction the platform can always make and never blocks it — unlike a
// funded-unpaid counter, which only `payPeriod` clears and which would let an
// employer veto their own revocation by funding a slot and never paying it.
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const withParams = call(PLATFORM, held.state, "setParamsFor", PERIOD, PARAMS_HASH);
  const filed = call(EMPLOYER_A, withParams.state, "setPayroll",
    PERIOD, GROSS, [4n, 4n],
    LINES.map((l) => l.taxQuotient),
    LINES.map((l) => l.contribQuotient),
    [bytes32(0x01), bytes32(0x02)],
    [new Uint8Array(100), new Uint8Array(100)],
    [binding(PAYEE_A), binding(PAYEE_B)],
    PARAMS
  );

  const taxTotal = LINES[0].taxQuotient + LINES[1].taxQuotient;
  const socialTotal = LINES[0].contribQuotient + LINES[1].contribQuotient;
  const funded = call(EMPLOYER_A, filed.state, "fundPeriod",
    PERIOD, GROSS,
    LINES.map((l) => l.taxQuotient),
    LINES.map((l) => l.contribQuotient),
    LINES.map((l) => l.netMinor),
    [4n, 4n],
    [bytes32(0x01), bytes32(0x02)],
    [coin(0xf0, LINES[0].netMinor), coin(0xf1, LINES[1].netMinor)],
    coin(0xf2, taxTotal),
    coin(0xf3, socialTotal)
  );

  const l = ledger(funded.state);
  if (l.taxPool > 0n && l.socialPool > 0n) ok("funding a period fills the pools");
  else fail("funding a period fills the pools", `taxPool=${l.taxPool} socialPool=${l.socialPool}`);

  const early = call(PLATFORM, funded.state, "revokeEmployer");
  if (!early.ok && /before revoking/.test(early.error))
    ok("the seat cannot be vacated while withheld money is still held");
  else
    fail(
      "the seat cannot be vacated while withheld money is still held",
      early.ok ? "the seat was vacated with money mid-flight" : early.error
    );

  // The platform clears it itself — no employer needed, so this is a delay and
  // not a veto.
  let s2 = call(PLATFORM, funded.state, "remit",
    PERIOD, true, TAX_TREASURY, qualified(0xf2, taxTotal, 2n));
  if (!s2.ok) fail("the platform can remit without the employer", s2.error);
  s2 = call(PLATFORM, s2.state, "remit",
    PERIOD, false, SOCIAL_TREASURY, qualified(0xf3, socialTotal, 3n));
  if (!s2.ok) fail("the platform can remit without the employer", s2.error);
  else ok("the platform can remit without the employer");

  const drained = ledger(s2.state);
  if (drained.taxPool === 0n && drained.socialPool === 0n) ok("remitting empties the pools");
  else fail("remitting empties the pools", `taxPool=${drained.taxPool}`);

  const now = call(PLATFORM, s2.state, "revokeEmployer");
  if (now.ok) ok("once remitted, the seat can be vacated");
  else fail("once remitted, the seat can be vacated", now.error);
}

console.log(
  failures === 0
    ? "\nall employer-seat checks passed\n"
    : `\n${failures} employer-seat check(s) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);

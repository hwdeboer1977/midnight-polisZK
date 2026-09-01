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
import { Contract, ledger } from "../contracts/managed/payroll/contract/index.js";

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
// and must still be restorable. If `transferEmployer` left `lastEmployer`
// pointing at the retired key, the circuit that exists to stop a lost key
// stranding the instance would be the thing that stranded it.
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const moved = call(EMPLOYER_A, held.state, "transferEmployer", ROTATED_A);
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
{
  const held = call(PLATFORM, fresh(), "assignEmployer", EMPLOYER_A);
  const r = call(PLATFORM, held.state, "transferEmployer", EMPLOYER_B);
  if (!r.ok && /only the employer may transfer/.test(r.error))
    ok("the platform cannot rotate the employer's key out from under them");
  else
    fail(
      "the platform cannot rotate the employer's key out from under them",
      r.ok ? "the platform reassigned the seat" : r.error
    );
}

console.log(
  failures === 0
    ? "\nall employer-seat checks passed\n"
    : `\n${failures} employer-seat check(s) FAILED\n`
);
process.exit(failures === 0 ? 0 : 1);

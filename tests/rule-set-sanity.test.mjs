// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * What the registry refuses to publish, and why refusing it here matters.
 *
 * `payroll.setParamsFor` is write-once per period: once a month is pointed at a
 * rule set it can never be pointed at another. So a version whose rates cannot
 * produce a filing does not merely give a confusing error — it permanently
 * bricks every period assigned to it, on every payroll instance, with a new
 * payroll deployment as the only way out.
 *
 * The bound that matters is NOT "each rate is at most 100%". Both checks are
 * driven here, against the real compiled circuits, because the difference
 * between them is the whole point of the guard.
 */

import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import * as taxparams from "../contracts/managed/taxparams/contract/index.js";
import { DUTCH_V1 } from "../dist/utils/tax-params.js";

let failures = 0;
const ok = (n) => console.log(`  ok  ${n}`);
const fail = (n, d) => { failures += 1; console.error(`  FAIL  ${n}\n        ${d}`); };

const key = (b) => ({ bytes: new Uint8Array(32).fill(b) });
const hex = (b) => Buffer.from(b).toString("hex");
const AUTHORITY = key(0x11);
const OUTSIDER = key(0x22);
const ADDRESS = sampleContractAddress();
const contract = new taxparams.Contract({});

const deploy = () =>
  contract.initialState(createConstructorContext({}, hex(AUTHORITY.bytes))).currentContractState;
const as = (caller, data) => {
  const w = deploy(); w.data = data;
  return createCircuitContext(ADDRESS, hex(caller.bytes), w, {});
};
const call = (caller, state, circuit, ...args) => {
  try { return { ok: true, state: contract.impureCircuits[circuit](as(caller, state), ...args).context.currentQueryContext.state }; }
  catch (e) { return { ok: false, error: String(e?.message ?? e) }; }
};

const base = {
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
const withRates = (v, r1, r2, r3, cr) =>
  ({ ...base, version: BigInt(v), rate1: BigInt(r1), rate2: BigInt(r2), rate3: BigInt(r3), contribRate: BigInt(cr) });

console.log("\nthe rule-set registry\n");
const fresh = () => deploy().data;

// ── The real schedule publishes ────────────────────────────────────────────
{
  const r = call(AUTHORITY, fresh(), "publish", base);
  if (r.ok) ok(`the published Dutch schedule is accepted (worst marginal ${DUTCH_V1.rate3} + ${DUTCH_V1.contribRate} bp)`);
  else fail("the published Dutch schedule is accepted", r.error);
}

// ── An absurd rate is refused ──────────────────────────────────────────────
{
  const r = call(AUTHORITY, fresh(), "publish", withRates(2, 65535, 65535, 65535, 300));
  if (!r.ok && /basis points/.test(r.error)) ok("655% rates are refused at publication");
  else fail("655% rates are refused at publication", r.ok ? "published" : r.error);
}

// ── The case a per-rate bound would MISS ───────────────────────────────────
//
// Every rate is exactly 10000 — 100%, individually "valid". The bands partition
// the gross, so the tax alone is the whole of it and the contribution is the
// whole of it again: payroll's `taxQ + socialQ <= gross` fails at every filing.
// A check of the form `each rate <= 10000` accepts this; the sum does not.
{
  const r = call(AUTHORITY, fresh(), "publish", withRates(3, 10000, 10000, 10000, 10000));
  if (!r.ok && /basis points/.test(r.error))
    ok("100% tax PLUS 100% contribution is refused — the sum is what is bounded, not each rate");
  else
    fail(
      "100% tax PLUS 100% contribution is refused — the sum is what is bounded, not each rate",
      r.ok ? "published — every period assigned to it would be permanently unfileable" : r.error
    );
}

// ── The boundary is admissible ─────────────────────────────────────────────
{
  const r = call(AUTHORITY, fresh(), "publish", withRates(4, 9700, 9700, 9700, 300));
  if (r.ok) ok("exactly 10000 combined is allowed — it leaves a net of zero, not a negative");
  else fail("exactly 10000 combined is allowed", r.error);

  const over = call(AUTHORITY, fresh(), "publish", withRates(5, 9701, 9700, 9700, 300));
  if (!over.ok) ok("one basis point over is refused");
  else fail("one basis point over is refused", "published");
}

// ── A regressive schedule is deliberately allowed ──────────────────────────
{
  const r = call(AUTHORITY, fresh(), "publish", withRates(6, 4000, 3000, 2000, 300));
  if (r.ok) ok("a regressive schedule publishes — monotonicity is not required, by decision");
  else fail("a regressive schedule publishes", r.error);
}

// ── Append-only still holds, and the seat rotates ──────────────────────────
{
  const first = call(AUTHORITY, fresh(), "publish", base);
  const again = call(AUTHORITY, first.state, "publish", { ...base, rate1: 1n });
  if (!again.ok && /already published/.test(again.error)) ok("a published version cannot be replaced");
  else fail("a published version cannot be replaced", again.ok ? "it was overwritten" : again.error);

  const stranger = call(OUTSIDER, fresh(), "publish", base);
  if (!stranger.ok && /only the authority/.test(stranger.error)) ok("a stranger cannot publish");
  else fail("a stranger cannot publish", stranger.ok ? "accepted" : stranger.error);

  const moved = call(AUTHORITY, fresh(), "transferAuthority", OUTSIDER);
  if (!moved.ok) fail("the authority may rotate its key", moved.error);
  else {
    ok("the authority may rotate its key");
    const stale = call(AUTHORITY, moved.state, "publish", base);
    if (!stale.ok && /only the authority/.test(stale.error)) ok("the retired key can no longer publish");
    else fail("the retired key can no longer publish", stale.ok ? "accepted" : stale.error);
    const now = call(OUTSIDER, moved.state, "publish", base);
    if (now.ok) ok("the new key can publish");
    else fail("the new key can publish", now.error);
  }

  const grab = call(OUTSIDER, fresh(), "transferAuthority", OUTSIDER);
  if (!grab.ok && /only the authority/.test(grab.error)) ok("a stranger cannot take the seat");
  else fail("a stranger cannot take the seat", grab.ok ? "taken" : grab.error);
}

console.log(failures === 0 ? "\nall rule-set checks passed\n" : `\n${failures} rule-set check(s) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);

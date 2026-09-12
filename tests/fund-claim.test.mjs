// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

/**
 * A benefit claim, driven through the real compiled fund — no wallet, no node,
 * no proofs.
 *
 * What it pins down, each a fix to something the contract used to allow:
 *
 *   · the withholding leaves inside the claim, to the two treasuries, and no
 *     public pool moves — a public pool moved by every claim published each
 *     claim's benefit and, below the cap, the final gross;
 *   · the rules are the ones recorded for the final period — any published
 *     version used to qualify, so a claimant could pick the most generous;
 *   · a claim names a calendar month after the final period, once per wallet,
 *     not before that month starts — windows used to be claimable all at once,
 *     and a later job loss could never be claimed;
 *   · the token is frozen at deploy — the first coin used to pin it, and
 *     `fundBenefits` is open to anyone;
 *   · the pool coin must hold more than the whole benefit — it used to be
 *     checked against the net alone.
 *
 * The block time is set per call: `createCircuitContext`'s last argument is
 * seconds since 1970, which is what `blockTimeGte` compares against.
 *
 * ⚠️ Local execution is not the chain. Spending a change coin inside the same
 * transaction runs correctly here and has not yet run on preview.
 *
 *   npm run test:fund-claim
 */
import {
  createCircuitContext,
  createConstructorContext,
  sampleContractAddress,
} from "@midnight-ntwrk/compact-runtime";
import { Contract, ledger } from "../contracts/managed/fund/contract/index.js";
import * as payroll from "../contracts/managed/payroll/contract/index.js";
import * as taxparams from "../contracts/managed/taxparams/contract/index.js";
import { DUTCH_V1, computeLine } from "../dist/utils/tax-params.js";
import {
  BENEFIT_V1,
  benefitFor,
  claimCalendar,
  toCircuitParams,
} from "../dist/utils/benefit-params.js";
import { buildTree, toCircuitPath } from "../dist/utils/claim-tree.js";

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
const CLAIMANT = key(0x71);
const OTHER = key(0x72);
const TAX = key(0xaa);
const SOCIAL = key(0xbb);
const TOKEN = bytes32(0xcc);
const JUNK = bytes32(0xdd);
const INSTANCE = bytes32(0x55);
const INSTANCE2 = bytes32(0x56);

const ADDRESS = sampleContractAddress();
const contract = new Contract({});

const TAX_PARAMS = {
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
const TAX_HASH = taxparams.pureCircuits.paramsHash(TAX_PARAMS);
const V1 = toCircuitParams(BENEFIT_V1);
/** Published later and more generous — what a claimant would pick if allowed. */
const V2 = { ...V1, version: 2n, rate: 9000n, durationMonths: 12n };

const GROSS = 220_000_000n; // €220, the example in docs/benefit.md
const LINE = computeLine(GROSS, DUTCH_V1);
const BENEFIT = benefitFor(GROSS, BENEFIT_V1).quotient;
const BLINE = computeLine(BENEFIT, DUTCH_V1);
const NET = BENEFIT - BLINE.taxQuotient - BLINE.contribQuotient;
const NONCE = bytes32(0x01);
const POOL = 300_000_000n;

function leafFor(payee, finalPeriod, instance) {
  return {
    commitment: payroll.pureCircuits.commitmentFor(
      GROSS, LINE.taxQuotient, LINE.contribQuotient, LINE.netMinor, 4n,
      finalPeriod, EMPLOYER, TAX_HASH, NONCE),
    payeeBinding: payroll.pureCircuits.payeeHash(payee, finalPeriod, instance),
    finalPeriod,
    monthsWorked: 12n,
    instance,
  };
}

function deploy() {
  return contract.initialState(createConstructorContext({}, hex(PLATFORM.bytes)), TAX, SOCIAL, TOKEN)
    .currentContractState;
}
const at = (year, monthIndex, day = 1) => Date.UTC(year, monthIndex, day) / 1000;
const OCT_2026 = at(2026, 9);

/** Runs a circuit at a given block time; reports rather than throws. */
function call(caller, state, time, circuit, ...args) {
  const wrapper = deploy();
  wrapper.data = state;
  try {
    const r = contract.impureCircuits[circuit](
      createCircuitContext(ADDRESS, hex(caller.bytes), wrapper, {}, undefined, undefined, time),
      ...args
    );
    return { ok: true, state: r.context.currentQueryContext.state, zswap: r.context.currentZswapLocalState };
  } catch (cause) {
    return { ok: false, error: String(cause?.message ?? cause) };
  }
}
const must = (r, what) => {
  if (!r.ok) throw new Error(`setup failed: ${what}: ${r.error}`);
  return r.state;
};

const calendar = (finalPeriod, claimPeriod) => claimCalendar(Number(finalPeriod), claimPeriod);
const poolCoin = (value = POOL) => ({ nonce: bytes32(0xe0), color: TOKEN, value, mt_index: 0n });

/** Rules v1 recorded for 2026 and 2027, three roots published, the pool funded. */
function ready() {
  const leaves = [leafFor(CLAIMANT, 202609n, INSTANCE), leafFor(OTHER, 202609n, INSTANCE)];
  const tree = buildTree(leaves);
  const later = [leafFor(CLAIMANT, 202703n, INSTANCE2)];
  const tree2 = buildTree(later);
  const overlap = [leafFor(CLAIMANT, 202608n, INSTANCE2)];
  const tree3 = buildTree(overlap);

  let s = deploy().data;
  s = must(call(PLATFORM, s, OCT_2026, "publishParams", V1), "publish v1");
  s = must(call(PLATFORM, s, OCT_2026, "setParamsFor", 2026n, 1n, 12n, V1), "rules 2026");
  s = must(call(PLATFORM, s, OCT_2026, "setParamsFor", 2027n, 1n, 12n, V1), "rules 2027");
  s = must(call(PLATFORM, s, OCT_2026, "publishRoot", 202609n, tree.root), "root 202609");
  s = must(call(PLATFORM, s, OCT_2026, "publishRoot", 202703n, tree2.root), "root 202703");
  s = must(call(PLATFORM, s, OCT_2026, "publishRoot", 202608n, tree3.root), "root 202608");
  s = must(call(OTHER, s, OCT_2026, "fundBenefits", 202609n, bytes32(0x33), POOL,
    { nonce: bytes32(0xe0), color: TOKEN, value: POOL }), "fund");
  return {
    s,
    path: toCircuitPath(tree.pathFor(0)), leaf: leaves[0],
    path2: toCircuitPath(tree2.pathFor(0)), leaf2: later[0],
    path3: toCircuitPath(tree3.pathFor(0)), leaf3: overlap[0],
  };
}

const claim = (s, time, path, leaf, cal, opts = {}) =>
  call(CLAIMANT, s, time, "claim",
    path, leaf, GROSS, LINE.taxQuotient, LINE.contribQuotient, LINE.netMinor, 4n,
    EMPLOYER, TAX_HASH, NONCE, cal, opts.params ?? V1, TAX_PARAMS,
    BENEFIT, BLINE.taxQuotient, BLINE.contribQuotient, opts.coin ?? poolCoin());

console.log("\nfund claim\n");

// ── The token is frozen at deploy ──────────────────────────────────────────
{
  expect("the constructor freezes benefitToken", hex(ledger(deploy().data).benefitToken) === hex(TOKEN));
  const junk = call(OTHER, deploy().data, OCT_2026, "fundBenefits", 202609n, bytes32(0x33), 1n,
    { nonce: bytes32(0xe1), color: JUNK, value: 1n });
  expect("a stranger's self-minted coin cannot pin the fund",
    !junk.ok && /wrong token/.test(junk.error), junk.ok ? "accepted" : junk.error);
}

// ── One claim: three coins out, nothing public moves by an amount ──────────
const r = ready();
const OCT_ON = OCT_2026 + 3600;
const first = claim(r.s, OCT_ON, r.path, r.leaf, calendar(202609n, 202610));
expect("a September termination claims October, in October", first.ok, first.error);
if (first.ok) {
  const l = ledger(first.state);
  expect("claimsPaid is 1", l.claimsPaid === 1n, String(l.claimsPaid));
  expect("no public pool or remitted totals exist", !("taxPool" in l) && !("taxRemitted" in l));

  const outputs = first.zswap.outputs.map((o) => ({
    to: o.recipient.is_left ? hex(o.recipient.left.bytes) : "contract",
    value: o.coinInfo.value,
  }));
  const to = (k) => outputs.filter((o) => o.to === hex(k.bytes)).map((o) => String(o.value)).join(",");
  expect("the net goes to the claimant", to(CLAIMANT) === String(NET), to(CLAIMANT));
  expect("the tax goes to the tax treasury", to(TAX) === String(BLINE.taxQuotient), to(TAX));
  expect("the contribution goes to the social treasury", to(SOCIAL) === String(BLINE.contribQuotient), to(SOCIAL));
  const kept = outputs.filter((o) => o.to === "contract").map((o) => o.value);
  expect("the fund keeps the pool coin less the whole benefit", kept.includes(POOL - BENEFIT),
    kept.map(String).join(","));

  // ── Months ───────────────────────────────────────────────────────────────
  const again = claim(first.state, OCT_ON + 86400, r.path, r.leaf, calendar(202609n, 202610));
  expect("the same month cannot be claimed twice",
    !again.ok && /already claimed for that month/.test(again.error), again.ok ? "paid twice" : again.error);

  const early = claim(first.state, OCT_ON, r.path, r.leaf, calendar(202609n, 202611));
  expect("November cannot be claimed in October",
    !early.ok && /has not started yet/.test(early.error), early.ok ? "paid early" : early.error);

  const nov = claim(first.state, at(2026, 10), r.path, r.leaf, calendar(202609n, 202611));
  expect("November can be claimed from its first second", nov.ok, nov.error);

  const JAN = at(2027, 0, 15);
  const dec = claim(nov.ok ? nov.state : first.state, JAN, r.path, r.leaf, calendar(202609n, 202612));
  expect("December, the third month, across the year boundary", dec.ok, dec.error);

  const jan = claim(dec.ok ? dec.state : first.state, JAN, r.path, r.leaf, calendar(202609n, 202701));
  expect("January is beyond a three-month entitlement",
    !jan.ok && /beyond this entitlement/.test(jan.error), jan.ok ? "paid a fourth month" : jan.error);

  const second = claim(dec.ok ? dec.state : first.state, at(2027, 4, 2), r.path2, r.leaf2, calendar(202703n, 202704));
  expect("a later job loss (final 202703) claims April 2027", second.ok, second.error);

  const overlap = claim(first.state, OCT_ON, r.path3, r.leaf3, calendar(202608n, 202610));
  expect("an overlapping termination cannot pay October twice",
    !overlap.ok && /already claimed for that month/.test(overlap.error), overlap.ok ? "paid twice" : overlap.error);
}

{
  const own = claim(r.s, OCT_ON, r.path, r.leaf, calendar(202609n, 202609));
  expect("the final month itself is not claimable",
    !own.ok && /starts the month after/.test(own.error), own.ok ? "paid the salary month" : own.error);

  const lie = claim(r.s, OCT_ON, r.path, r.leaf, { ...calendar(202609n, 202610), finalYear: 2025n });
  expect("a mis-split final period is refused",
    !lie.ok && /not the final period/.test(lie.error), lie.ok ? "accepted" : lie.error);

  const quotient = claim(r.s, OCT_ON, r.path, r.leaf, { ...calendar(202609n, 202610), q4: 505n });
  expect("a wrong leap quotient is refused",
    !quotient.ok && /quotient/.test(quotient.error), quotient.ok ? "accepted" : quotient.error);

  // ── The coin must cover the whole benefit, and then some ─────────────────
  const exact = claim(r.s, OCT_ON, r.path, r.leaf, calendar(202609n, 202610), { coin: poolCoin(BENEFIT) });
  expect("a coin holding exactly the benefit is refused",
    !exact.ok && /cannot cover/.test(exact.error), exact.ok ? "accepted" : exact.error);
  const netOnly = claim(r.s, OCT_ON, r.path, r.leaf, calendar(202609n, 202610), { coin: poolCoin(NET + 1n) });
  expect("a coin covering only the net is refused",
    !netOnly.ok && /cannot cover/.test(netOnly.error), netOnly.ok ? "accepted" : netOnly.error);
  const justOver = claim(r.s, OCT_ON, r.path, r.leaf, calendar(202609n, 202610), { coin: poolCoin(BENEFIT + 1n) });
  expect("a coin one unit over the benefit is accepted", justOver.ok, justOver.error);
}

// ── The rules are the ones recorded for the final period ───────────────────
{
  const s = must(call(PLATFORM, r.s, OCT_2026, "publishParams", V2), "publish v2");
  const shop = claim(s, OCT_ON, r.path, r.leaf, calendar(202609n, 202610), { params: V2 });
  expect("a claimant cannot pick the more generous v2",
    !shop.ok && /not the benefit rules recorded/.test(shop.error), shop.ok ? "v2 was accepted" : shop.error);

  const overwrite = call(PLATFORM, s, OCT_2026, "setParamsFor", 2026n, 9n, 1n, V2);
  const still = overwrite.ok ? claim(overwrite.state, OCT_ON, r.path, r.leaf, calendar(202609n, 202610)) : overwrite;
  expect("re-recording a month skips it, so v1 still applies", overwrite.ok && still.ok,
    overwrite.ok ? still.error : overwrite.error);

  const unpublished = call(PLATFORM, s, OCT_2026, "setParamsFor", 2028n, 1n, 1n, { ...V1, version: 7n });
  expect("an unpublished version cannot be recorded",
    !unpublished.ok && /no such rule set/.test(unpublished.error), unpublished.ok ? "accepted" : unpublished.error);

  const tampered = call(PLATFORM, s, OCT_2026, "setParamsFor", 2028n, 1n, 1n, { ...V1, rate: 9999n });
  expect("tampered figures under a published version are refused",
    !tampered.ok && /not the published rules/.test(tampered.error), tampered.ok ? "accepted" : tampered.error);

  const stranger = call(OTHER, s, OCT_2026, "setParamsFor", 2028n, 1n, 1n, V1);
  expect("only the platform records rules",
    !stranger.ok && /only the platform/.test(stranger.error), stranger.ok ? "accepted" : stranger.error);

  let bare = must(call(PLATFORM, deploy().data, OCT_2026, "publishParams", V1), "v1");
  const tree = buildTree([r.leaf]);
  bare = must(call(PLATFORM, bare, OCT_2026, "publishRoot", 202609n, tree.root), "root");
  const none = claim(bare, OCT_ON, toCircuitPath(tree.pathFor(0)), r.leaf, calendar(202609n, 202610));
  expect("with no rules recorded for the period, no claim",
    !none.ok && /no benefit rules recorded/.test(none.error), none.ok ? "accepted" : none.error);
}

console.log(failures === 0 ? "\nall fund-claim checks passed\n" : `\n${failures} fund-claim check(s) FAILED\n`);
process.exit(failures === 0 ? 0 : 1);

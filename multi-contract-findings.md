# Multi-contract transactions on Midnight — what was tested, and what it means

Established 2026-08-28 by probing preview, not by reading docs. Every claim below
either names a transaction hash or says explicitly that it is untested.

Versions in play: `ledger-v8` 8.1.0, `compact-runtime` 0.16.0,
`midnight-js-contracts` 4.1.1, prover keys `prover-key[v7](ir-source[v2])`.

---

## 1. Summary

| Question | Answer | Evidence |
|---|---|---|
| Can one transaction call two contracts? | **Yes** | `d6531c86…` |
| Can both calls sit in ONE intent (one segment)? | **Yes, without coins** | `d6531c86…` |
| Can both calls move a coin? | **Yes** | `13d1f74f…` |
| Can both calls move a coin AND share one intent? | **Unresolved** | route B rejected — see §4 |
| Does a failing call take the others down? | **Untested** | see §7 |
| Are ZK proofs stored on chain? | **Yes** | see §5 |
| Can a contract require a sibling call to exist? | **Yes, enforced** | `ed9a9950…` — §7a |
| Does that requirement cover the call's data? | **Yes** | §7a |

The practical upshot: **bundling across contracts works, and a contract can
refuse to act unless a named sibling call is present.** That second finding
(§7a) is what makes option D buildable — the chain rejecting an incomplete
bundle, rather than the shortfall merely being visible afterwards.

Whether a bundle is all-or-nothing under *failure* is still open, and matters
less than it first seemed: `claimContractCall` addresses omission directly,
which was the gap that mattered.

---

## 2. Two beliefs that were wrong

Both were recorded in earlier notes and both cost design decisions.

**`Transaction.merge` does NOT throw on contract interactions.** The prior note
said it did, which is why the four-contract design was abandoned. On ledger-v8
8.1.0 it succeeded first try, merging two single-call transactions that each
receive a shielded coin. The merged transaction landed.

**The CLI does not use the proof server.** `provingMode()` in
`src/providers/midnight-providers.ts:68` returns `wasm` unless `PROVING_MODE=http`,
so every Node path proves in-process. `PROOF_SERVER_URL` applies to the browser
only. Several failures were misdiagnosed as "the proof server is down" when the
proof server was irrelevant.

The lesson worth keeping: these notes have a shelf life. Retest before designing
around a recorded limit.

---

## 3. What the probes did

Both are runnable and both deploy fresh contracts, so re-running is cheap and
non-destructive.

### `npm run probe:atomic` — two calls, no coins

`contracts/atomic.compact`: a counter with `bump(tag)`. Two instances stand in
for two contracts — what the ledger sees is two distinct `ContractAddress`es.
No coin operations, deliberately, so a failure could mean only one thing.

Built as **one `Intent` with two `ContractCallPrototype`s**, then
`Transaction.fromPartsRandomized`.

```
tx d6531c86a342ebb1b3cb178c3ef5409ff3a0419e5fa6bda80a7c414e31a1aa8f
b21a594c1f84…  count=1  lastTag=1
a8f082cefec9…  count=1  lastTag=2
```

Verified independently: `contractAction` queried for each address returns the
identical transaction hash. The distinct tags rule out "one call applied twice",
which matching counters alone could not.

**This is the single-segment result.** One intent, two calls, both applied.

### `npm run probe:atomic-coin` — two calls, both moving a coin

`contracts/atomiccoin.compact`: `deposit(tag, amount, coin)` receives a shielded
pEUR coin. Two instances, €1.00 each.

Two routes, selected by `PROBE_ROUTE=auto|merge|intent`:

- **A — `txA.merge(txB)`** — succeeded.
  ```
  tx 13d1f74f1c988f6ee99236aee50f14827028610b35d9e315b93a655610a5e93a
  81168e3e59dc…  total=1000000  deposits=1  lastTag=1
  a48bd9e3172b…  total=1000000  deposits=1  lastTag=2
  ```
  Confirmed against the indexer: identical hash for both addresses.

- **B — one intent, two calls, offers merged by hand** — constructed cleanly
  (`intents [61943] · actions 2`, no binding error), proved, and was then
  **rejected at submission**.

---

## 4. Reading the route B failure honestly

It is tempting to conclude "single-segment multi-call with coins is impossible".
That is not what the evidence supports.

Three data points:

1. One intent + two calls + **no coins** → works (`d6531c86…`).
2. Two intents + two calls + **coins** → works (`13d1f74f…`).
3. One intent + two calls + **coins, offers merged by hand** → rejected.

The variable that changed in (3) is not "one intent" and not "coins" — it is
**my hand-merging of the Zswap offers**. Route B mutates a transaction after
`fromPartsRandomized` has fixed its binding randomness, and merges two offer sets
without `zswapStateToSegmentedOffer`, which midnight-js does not export. A
rejection is equally consistent with "I assembled it wrong."

**The untried proper route is `Transaction.addCalls`.** Its signature takes a
`SegmentSpecifier` (`first | guaranteedOnly | random | specific`) and its own
docs say it *"will ensure that relevant Zswap parts are placed in the same
section as contract interactions with them"* — precisely the bucketing that was
done by hand. It was skipped because it needs `PrePartitionContractCall`, which
wants a `PreTranscript` built from a raw `QueryContext` and op program that
`createUnprovenCallTx` does not return.

**Do not record "single-segment coin bundling is impossible" as a finding.** It
is untested. What is tested is that one particular hand-rolled assembly of it
was refused.

### Why segments matter

An intent is a segment, and a segment is the unit the ledger succeeds or fails
as a whole.

- **One intent** → both calls share a fate.
- **Two intents** (what `merge` produces) → both calls ride in one transaction
  and can still land independently.

`merge` gives the weaker shape. Both calls landed in `13d1f74f…`, which proves
they *can* travel together; it does not prove they *must* succeed together.

---

## 5. Proofs are stored on chain

Measured, not assumed. The indexer's `transactions { raw }` for `13d1f74f…` —
two trivial `deposit` calls — returns **33,829 bytes**. That is roughly 16 KB per
call for a circuit that increments a counter and receives a coin: the ZK proof is
in the transaction body and the indexer serves it back.

`eraseProofs()` exists on `Intent` and `Transaction`, but it constructs
proof-erased *variants* used during validation and merging. What is submitted
and stored keeps its proofs.

---

## 6. The property the current design already has

This is the part that reframes the whole question.

Today all money passes through the payroll contract:

| Step | Into the contract | Out of it |
|---|---|---|
| `fundEmployee` ×N | net, one coin per employee | |
| `payPeriod` | | net → employee wallets |
| `fundWithholding` | tax + social | |
| `remitTax` / `remitSocial` | | → treasury **wallets** |

`setPayroll` proves, without revealing any individual salary
(`contracts/payroll.compact:440-487`):

- each employee's tax computed from *their* gross across progressive bands
- contribution on `min(gross, maxBase)` at `contribRate`
- divisions are honest — quotients witnessed and pinned by
  `q·10000 ≤ n < (q+1)·10000`, which admits exactly one integer
- `net = gross − tax − social`, and tax + social do not exceed gross
- **published totals are the sum of per-employee figures**, never a rate
  reapplied to the gross total — floor division does not distribute and the
  bands are progressive, so taxing the sum gives a different, wrong number

And then `fundWithholding` asserts:

```compact
assert(taxCoin.value == totalTaxFor.lookup(p), "tax coin does not hold the tax assessed for that period")
```

`totalTaxFor` was written under that proof. **So underfunding the treasury is not
detected — it is unbuildable.** The employer's own client refuses to produce the
transaction.

That property exists because the proof and the money are in the *same contract*.
It is the thing a multi-contract design puts at risk.

Confirmed live on period 202609, contract
`0fa90dd36a1e454b6f36e211980a9cab67562e7bdc692458f5611843af0f015f`:

```
totalPayrollFor  560.00
totalNetFor      343.00     (61.25%)
totalTaxFor      200.20     (35.75% — rate1, both salaries under threshold1)
totalSocialFor    16.80     ( 3.00% — contribRate)
                 ───────
                 560.00     net + tax + social = gross, exactly
taxRemitted      200.20     socialRemitted 16.80     pools back to 0
```

---

## 7. The three-contract design, and what it costs

The proposal: employer deposits net to payroll, tax to a tax contract,
contributions to a social contract — **each with its own proof that its amount
was computed correctly.**

This needs no cross-contract reads. Each contract re-derives from inputs it is
given rather than reading another's ledger (which remains impossible).

**The commitment is the shared object.** `payroll.compact` already commits per
employee to:

```compact
PayrollCommitment { gross, tax, social, net, weeks, period, employer, paramsHash, nonce }
```

So each contract proves a different property of the *same* commitment:

| Contract | Proves | Circuit cost |
|---|---|---|
| Payroll | these figures satisfy the bands for `period` under `paramsHash` | heavy — band arithmetic, ~10 MB prover key |
| Tax | the `tax` fields in these commitments sum to the coin received | a hash and a sum |
| Social | same for `social` | a hash and a sum |

The tax contract never re-derives tax from gross. It does not need to — payroll
already proved that for the same commitment. It proves only that the money
matches what is inside. Small circuit, small key, which matters because the
browser downloads them.

The commitment carries `period`, `employer` and `paramsHash`, so it is bound to
the right month, employer and rule set.

### The remaining gap

Nothing forces the tax contract to be handed the *same* commitment payroll
stored. An employer could file real figures at payroll and open a smaller,
differently-nonced commitment at the tax contract. Both proofs valid, mutually
inconsistent.

It becomes **publicly checkable** rather than invisible. Have each national
contract store the commitment it verified, and anyone can compare:

```
payroll.commitmentsFor[p][i] == tax.commitmentFor[p][i] == social.commitmentFor[p][i]
```

A mismatch is a public, unambiguous accusation.

Making it *impossible* needs either cross-contract reads (ruled out by compactc)
or bundling with shared communication commitments — `ContractCallPrototype` takes
a `communication_commitment_rand` and the ledger exports
`communicationCommitment(input, output, rand)`, but whether that is reachable
from Compact is **untested**, and worth a compile-only probe before anything
else, since a "no" there settles the question at zero cost.

### The trade, stated plainly

| | Today | Three contracts |
|---|---|---|
| Withholding correctness | **impossible to get wrong** | provable per contract |
| Cross-contract consistency | n/a — one contract | publicly checkable, not enforced |
| Treasury | a **keypair**, seed in `.env` | a contract that can govern withdrawal, reporting, access |
| Proofs per run | 1 heavy | 1 heavy + 2 light |

**The reason to move is not the withholding proof — that already works. It is the
treasury.** `4b936412…` and `f2d0dd9e…` are wallets; whoever holds a seed can
spend the balance with no rules and no audit trail. For a real tax authority that
is the weak part, not the arithmetic.

---

## 7a. `claimContractCall` — a contract CAN require a sibling call

This is the finding that moves option D from "nobody knows" to "buildable".

`kernel.claimContractCall(Bytes<32> address, Bytes<32> entryPoint, Field commitment)`
compiles (`probe/probe_claim_call.compact`) **and is enforced by the node**
(`npm run probe:claim-call`).

```
POSITIVE  bump + a claim of that bump, one transaction   → accepted
NEGATIVE  the claim alone, naming a call that isn't there → refused

tx ed9a9950156ea22d3b97d13dae8f6b1e0b339b48f2397554dac8676dd0747761
A 14f96fdbe40dd7…  count=1  lastTag=1
B c1bbc9197a5989…  claims=1
```

Verified independently: `contractAction` for both addresses returns the same
transaction hash. **The negative is what makes this a result** — the false claim
differed from the accepted one in exactly one respect, that the call it named was
absent, and the node refused it. A positive alone would have been equally
consistent with the claim never being checked.

### The commitment covers the call's DATA, not just its identity

Tested locally, no chain writes: two calls to the same contract at the same entry
point, **same randomness**, different circuit arguments.

```
same rand, tag=1 : 73f18e857d673828c128f4cb65c26fa2…
same rand, tag=2 : 732d58d34324b52c47c03547aab01735…    → arguments covered
diff rand, tag=1 : 73f1da3203eee55194684bef253a62ef…    → randomness covered
```

So a claim names a specific call *with specific arguments*, not merely "some call
to that contract happened".

### What it does NOT give, and this bounds the design

**A claiming contract cannot RECOMPUTE the commitment.** It is derived by the
ledger over the callee's finalized aligned input/output plus randomness the
employer chooses; nothing in Compact can reconstruct it. So a contract can
require *a call whose commitment the caller names* — it cannot independently
verify what is inside that commitment.

The consequence for the three-contract design:

- **Omission is closed.** Payroll can claim the tax and social calls, so a bundle
  that leaves one out does not land at all. That was option C's stated weakness.
- **Wrong amounts are closed by C's own mechanism**, not by this: each national
  contract proves its coin against the figures in the fingerprint it was handed.
- **Which fingerprint** each contract was handed remains publicly checkable
  rather than enforced, exactly as in §7.

So D = C's per-contract proofs + `claimContractCall` for completeness. That is
the governance of C with the omission gap shut.

### Two construction facts that cost six runs

**Read the commitment from the ledger; do not compute it.**
`communicationCommitment(call.private.input, call.private.output, rand)` returns
a *different* value from what the ledger derives for the finalized call:

```
computed  737c66728acb0709…
ledger    731b546bb543fb60…
```

The authoritative value is `intent.actions[0].communicationCommitment`, read
after `addCall`. Every submission built on the computed value was refused, in a
way indistinguishable from the claim being enforced.

**Encoding:** 33 bytes, leading `73` tag byte, remaining 32 read **little-endian**.
Big-endian exceeds the BLS12-381 scalar modulus, so this is arithmetic rather
than a choice.

**A multi-contract bundle needs a key provider spanning every contract in it.**
`MidnightProviders.create` scopes key lookup to one contract name, so a bundle
across two contracts dies at `check` with `failed to resolve key at 'claimIt'` —
before proving, and nothing to do with the claim. `wasmProofProvider()` with no
contract name works, because `readCircuit` then scans every managed contract.
Any three-contract bundle hits this.

---

## 8. Known gap that undermines all three proofs equally

`ruleSetHash()` in `src/utils/rule-window.ts` computes the hash locally from the
`DUTCH_V1` constant in TypeScript via the registry's *pure* circuit. It never
reads the deployed registry at `7feb657f…`. `getDeployment` is used only to check
the registry exists.

They agree today — both version 1. Edit `tax-params.ts` and they diverge
silently, with the payroll contract enforcing the edited rules while
`paramsHash` claims to reference a published, append-only record.

Fix: read `paramsFor[latestVersion]` off the registry and fall back to the
constant only when the registry is empty. This is worth doing before building
national contracts, because `paramsHash` is the field that would bind all three.

---

## 9. What to test next, in order

1. ~~`communicationCommitment` from Compact~~ — **done**, §7a. It is
   `kernel.claimContractCall`, it is enforced, and it covers the call's data.
2. **A three-call bundle with coins, one contract claiming the other two.** The
   real shape, and the first time §7a and §3 are exercised together. Needs the
   cross-contract key provider from §7a.
3. **`Transaction.addCalls` with an explicit `SegmentSpecifier`** — the proper
   single-segment route that route B approximated by hand. Resolves §4.
4. **Failure atomicity** — whether one bad call takes the others down. Fiddly: a
   Compact `assert` fails during local execution, so a doomed call cannot be
   built at all. Forcing a validation-time failure needs deliberately raced stale
   state. Lower priority now that omission is closed by §7a.
5. **Fix `ruleSetHash`** (§8) before building national contracts — `paramsHash`
   is the field that would bind all three.

---

## Appendix — artefacts

| File | What |
|---|---|
| `contracts/atomic.compact` | counter, no coins — probe 1 |
| `contracts/atomiccoin.compact` | coin receiver — probe 2 |
| `src/atomic-probe.ts` | `npm run probe:atomic` |
| `src/atomic-coin-probe.ts` | `npm run probe:atomic-coin`, `PROBE_ROUTE=auto\|merge\|intent` |
| `probe/probe_claim_call.compact` | compile-only: does `claimContractCall` exist |
| `contracts/claimer.compact` | contract B — claims a sibling call |
| `src/claim-call-probe.ts` | `npm run probe:claim-call` — positive and negative |

Contracts deployed by these probes are throwaway and recorded nowhere; their
addresses appear in the probe output and in this document only.

`contracts/vault.compact` is an **unrelated earlier probe** (can a contract hold
and pay out a shielded coin without publishing its value) and was not part of
this work.

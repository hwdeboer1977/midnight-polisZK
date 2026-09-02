# The unemployment benefit

The fund, the claim tree, and how somebody proves an entitlement without
disclosing the salary it rests on or being identifiable as a claimant.

[← back to the README](../README.md)

## The fund

One shared instance, deployed by the platform. It holds the money benefits are
paid from, the versioned benefit rules, one Merkle root per period, and the set
of spent nullifiers.

```
preview/fund  820815a16c4a94ca49d8d2b3f109d094f92b57dd0e487b198b48d1e5744ad1c1
```

An earlier fund, `8615dd7a…`, ran without withholding and is **abandoned with
€306 in it**. Adding withholding changed the ledger layout, and verifier keys are
fixed at deploy — so the money can only be reached by rebuilding from
`contracts/fund.compact.bak` and claiming against it. That is the cost of a
contract change to a contract with **no withdrawal circuit**, and it is worth
knowing before the next one: money enters a fund easily and leaves only through
a claim.

### Why it is a separate contract, and what that costs

A payroll contract cannot call the fund and the fund cannot read a payroll
ledger. Both were probed and both are walls — see **What the compiler would not
do**. So the fund cannot look up the commitment a claim rests on. It has to be
*told*, by a relay, and that relay is trusted to be faithful.

What is **enforced** is that a claimant knows an opening matching something the
fund was told. That what it was told is a true copy of payroll state is
**publicly verifiable by anyone with an indexer, and not enforced**. Stating it
the other way round would be a lie about what the proof proves.

### The anonymity set is the design

Roots are published as **one tree per period over every accredited employer on
the platform** — not per employer, and not per employee. A claim discloses the
period its attestation names and nothing else, so a claimant is
indistinguishable from everyone terminated in the same month anywhere on the
platform.

A root per employer would undo that: the disclosed root would name the employer.

Membership is proved with a **path**, not a map lookup, for the same reason. A
`Map` lookup takes a public key, and every candidate key is enumerable from
public payroll state — instance, period and slot are all published — so a lookup
would announce exactly which slot of which employer the claim was for. The path
is a witness; only the root and the period are public.

### The benefit rules live in source, because only their hash is on chain

`paramsFor` stores `persistentHash<BenefitParams>(…)`, never the figures. The
chain can therefore **check** a rule set and cannot **tell you** one — and
`claim` requires the whole struct as an argument. So the numbers must reach a
claimant from somewhere off chain, and that somewhere is
`src/utils/benefit-params.ts`, copied into the frontend bundle by
`npm run frontend:config`.

```
v1   cap €4,000.00/month · 7000 bp (70%) · minMonths 1 · from 200001
     published 2026-08-25, tx a99421c5ce1505633ea4b277fc087254ee83fba8a929d75e67306cc28bbcd226
```

⚠️ **Editing a published version in that file silently breaks every claim under
it.** The registry is append-only on purpose: a new schedule is a new version
and a new `fund params` call, never an edit. `npm run fund -- params` refuses to
publish figures that contradict a version already recorded there, and shouts if
you publish one the file does not know.

`minMonths: 1` is a **pilot figure**, not the scheme's twelve. It was chosen over
the alternative — an employer attesting twelve months against an instance whose
public filings show one — because a published rule set that says what it is stays
honest, while a fabricated attestation contradicts a record anybody can read.

### `fund-pool.json` is the only copy of the fund's coin nonces

`fundBenefits` receives a shielded coin and the contract keeps only an ordinal:
`poolOrdinal`, which of its receipts the pool is. It does **not** keep the nonce,
and the contract says why — publishing a nonce next to the public coin commitment
would let anyone try candidate values until one matched, recovering the pool
balance and with it every benefit ever paid, from the differences between claims.

The consequence is unavoidable and worth stating plainly: **the nonce exists in
exactly one place, `fund-pool.json`, and if it is lost the coin cannot be
described to `claim` again.** The money stays in the contract and nothing can
spend it. There is no recovery path — a nonce is 32 random bytes, and the only
thing that could confirm a guess is the commitment, which is what makes guessing
infeasible in the first place.

So the deposit is written to disk **before** the transaction is submitted. A
crash between the two leaves a `pending` entry that may or may not describe a
real coin, which is recoverable by looking; the other order leaves a real coin
nobody can describe, which is not. The file is gitignored as `fund-pool*` —
globbed, so a `.bak` is caught too. **Back it up.**

### Change coins, and why `reconcile` exists

`sendShielded` splits the coin it spends: the benefit goes to the claimant and
the remainder returns to the contract as a **new coin whose nonce is derived from
the spent one and published nowhere**. After a claim, the pool is therefore a
coin this machine has no record of.

The derivation is `evolveChangeNonce` in `src/utils/fund-pool.ts` —
`upgradeFromTransient(transientHash([field("midnight:kernel:nonce_evolve/2"),
degradeToTransient(nonce)]))`, read off the compiled circuit rather than off
documentation. **Verified on chain 2026-08-25**: the derived nonce reproduced the
change coin's commitment at leaf 42896 exactly.

```bash
npm run fund -- reconcile --value 96
```

It rebuilds the candidate coin from every parent it knows, hashes it, and
**refuses to record one whose commitment does not match what the chain holds**.
That turns "probably the right nonce" into "provably the coin at leaf N".

⚠️ **The value cannot be derived, only checked.** The benefit a claim paid is
private, so the operator does not know what the change came to — they must be
told, or work it out. That is not a gap in the tooling: it is the same property
that stops an observer reading the pool balance, seen from the inside.

### The benefit is taxed, under provably the same rules the salary was

A benefit is taxable income. Paying it untaxed out of a salary that *was* taxed
produced an artifact worth naming: **a benefit could exceed the take-home pay it
replaced.** €220 gross → €154 benefit, against €134.75 net pay. Nothing was
arithmetically wrong; the two sides were simply not comparable.

So `claim` withholds tax and contribution from the benefit, using the same bands
`setPayroll` applies to a salary. What makes that safe rather than a second
opinion about tax:

```
assert(persistentHash<TaxParams>(taxParams) == payrollParamsHash)
```

The claimant already supplies `payrollParamsHash` to open her salary commitment,
and payroll guarantees it is the hash of the schedule that period was filed
under. So the fund gets a **verified** tax schedule without reading the
`taxparams` registry — which it cannot do — and without trusting the claimant.
The benefit is withheld under provably the same rules her final month was.

The band arithmetic is **duplicated**, because no contract here can call
another. Duplicated arithmetic drifts, and this drift would be invisible: a
benefit taxed under a subtly different schedule still proves, still pays, and is
simply wrong. `npm run test:benefit-tax` pins it — including against the hash
payroll actually wrote on chain, so the two struct declarations cannot stop
encoding identically without a test failing.

```
€220 gross salary
  → €154.00 benefit         (min(gross, €4,000) × 70%)
  → −€55.055 tax            (35.75% band 1)
  → −€4.62 contribution     (3%)
  → €94.325 paid            against €134.75 net pay
```

### Where the withheld money goes, and what that costs

`taxPool` / `socialPool` accumulate, and `remitBenefitTax` / `remitBenefitSocial`
send them to treasuries **frozen in the constructor** — the same two keys payroll
uses, because money withheld from a salary and money withheld from the benefit
that replaces it must land in the same place. Both remit circuits are
**permissionless**: the destination cannot be redirected by whoever triggers one,
so a platform that stops running cannot strand the money.

⚠️ **This leaks what the rest of the fund hides.** Withholding is a deterministic
function of the benefit, which is a deterministic function of the gross — so a
public `taxPool + taxRemitted` discloses the fund's **aggregate outflow**, and
with `claimsPaid` alongside it, the average benefit. That was accepted
deliberately, and the alternatives were worse: withheld tax that is never
remitted is not tax, and remitting requires the contract to know what it owes,
which means public state. Retaining it silently would have been a smaller benefit
described as a tax.

What is still **not** leaked: any individual benefit, or which claim contributed
what.

### Operator commands

Flags come **after `--`**. Without it npm reads `--amount 10` as its own config
and the script never sees it; the CLI detects that case and says so.

```bash
npm run fund status                    # rules, claims paid, token, trees
npm run fund pool                      # coins, which is the pool, what is spendable
npm run fund -- pool --full            # full nonces
npm run fund -- params --version 1 --cap 4000 --rate 7000 --min-months 1
npm run fund -- deposit --amount 200   # put money in
npm run fund -- reconcile --value 96   # recover a post-claim change coin
npm run fund -- remit --what tax       # send withheld tax to its treasury
npm run fund -- remit --what social    # and the contribution to its own
```

A remit spends the pool coin, so the pool moves to its change afterwards and has
to be reconciled exactly as it does after a claim. The command prints the
`reconcile` line to run next.

Remitting needs each treasury's **encryption public key**, not just the coin key
frozen at deploy — a shielded coin can only be found by someone whose encryption
key the transaction was built with. It is derived from `TAX_TREASURY_SEED` /
`SOCIAL_TREASURY_SEED`, or read from `TAX_TREASURY_ENC_KEY` /
`SOCIAL_TREASURY_ENC_KEY` if set, which is what a machine that should not hold
the treasuries' spending keys wants.

The **first** deposit fixes `benefitToken` for the contract's lifetime. The token
is read off the deployed pEUR contract rather than out of `.env`, because a stale
copy in a config file would not cause a failed transaction — it would cause a
successful one that pins the wrong token, and the only fix after that is a new
fund.

`pool` works out which coins are spent by deriving each one's change nonce and
looking for it among the others, so a spent coin and its own remainder are not
counted twice:

```
    €        250.00  coin #2    leaf 42886  spent
  → €         96.00  coin #3    leaf 42896  change
deposited      : €460.00
spendable now  : €306.00  (unspent coins this machine can still describe)
```

## Ending employment

A period simply stops appearing when someone leaves, and "stopped appearing" is
not a statement anybody made — it is indistinguishable from a month not yet
filed. So the employer says it, once, on chain.

`endEmployment(period, index, attestation)` writes **one commitment per slot**,
write-once. What it commits to is `Termination { finalPeriod, monthsWorked,
nonce }`. Neither figure is published: months worked per slot would be a tenure
record for a worker.

> **Changed 2026-09-02.** `claimKeyHash` used to be the third field, and its
> removal is the largest simplification in the system — see
> [What the employee no longer needs](#what-the-employee-no-longer-needs).

Write-once matters: an employer who could reissue a termination could restate the
final month after seeing what it entitled someone to. Correcting one means
re-filing the period, which has its own guards.

**The employer cannot claim on it.** `claim` requires the payee's own wallet key,
which `payeeFor` binds and no employer holds.

### Nothing has to be collected first

The employer needs **nothing from the employee** to end their employment. Every
field of the attestation is theirs already: the final period and slot from
`payeeFor`, the months worked counted from the same place, and the nonce derived
from their payroll passphrase.

That was not true until 2026-09-02. The attestation used to anchor a
`claimKeyHash` the employee had to generate and hand over **before** the
dismissal — so the order was:

> employee creates a claim key → hands the **hash** to her employer → employer
> ends the employment → employee claims

She had to be in the loop at the moment she was being dismissed, holding a
secret generated earlier. That is not how a benefit office works, where you turn
up afterwards with nothing but your identity. Worse, the attestation is
write-once: an employer who anchored the wrong hash stranded the claimant
permanently, undetectably until she tried to claim months later.

The claim key is gone, and with it the ordering constraint, the hand-over, and
that failure mode. What it cost is set out under
[What was traded away](#what-was-traded-away).

### Two routes

| | Browser | CLI |
| --- | --- | --- |
| Where | `/employer/employees` → a row → **End employment** | `npm run terminate -- <instance> <period> <slot> --payee <key>` |
| Signs with | the employer's wallet extension | `.env` |
| Works for | any employer | only when employer == operator |

Both produce an **opening** — the figures behind the commitment. The browser
route publishes the month's claim tree in the same step, so in the ordinary case
there is nothing further to do.

The opening is still offered as a download, but **losing it costs nothing**:
every field is derivable. `Publish their claim tree` on the employee's row
rebuilds it from the payroll passphrase alone, because the nonce is
`sha256("polisZK/termination/v1", employerKey, "period:slot")` and the slot and
month count are read from the chain. The CLI still reads `terminations/`.

## The relay and the claim tree

```bash
npm run relay -- 202601             # build the tree, write claim bundles
npm run relay -- 202601 --publish   # and publish the root to the fund
```

The relay reads `terminations/*.json`, checks each opening against the
attestation on chain, builds one tree over every termination in the period, and
publishes the root. It writes one bundle per claimant into
`claims/<period>/claim-bundle-<instance>-<period>-slot-N.json`.

It **refuses** any opening that does not reproduce its on-chain attestation — a
relay that published a leaf the employer never attested to would be publishing
its own claim about someone's employment.

What the relay never sees: any salary. Leaves are built from commitments and
payee bindings, both already public and both opaque. The one non-public input is
the termination opening, which carries months worked — not an amount.

It also records the tree's **leaf digests** under `DATA_DIR/claim-digests.json`,
which is what `GET /api/claim-tree` serves. Digests, never leaves: a digest is
the hash of a leaf nobody can invert, and it is all a claimant needs to build a
path.

### What the trust actually is

A **forged** root is not prevented: nothing in the fund can tell a true copy from
an invented one. It is *attributable* and publicly recomputable, since every
input except the opening is public payroll state and the opening is checked
against the chain. And `publishRoot` is **permissionless**, so a relay that
declines to publish cannot silently block a claim — someone else can publish the
same root. Only the platform's root lands in `rootFor` today; widening that is a
policy change, not a contract change, because the roots are all there and
attributable.

### The pool coin, and why it is the last thing a browser cannot derive

`claim` takes the fund's coin as an argument — nonce, value and leaf. The chain
records that a fund-owned coin exists and publishes `poolOrdinal`, but never its
nonce or value, which is the point of a shielded coin. Those live in
`fund-pool.json`, written when the deposit was made.

So `GET /api/pool-coin` serves those two fields, and it is the only part of a
claim that still needs the service. It discloses nothing about who is asking: a
request names a network and gets a coin, never which leaf in a period is the
caller's.

Two consequences remain, and neither is fixable from the relay:

- she **learns that coin's value**;
- two claimants handed the same coin would **race**, the second losing to a spent
  input (node error 103, which does not say so). The fund holds many coins — one
  per deposit, plus a change coin per settled claim — so the fix is to hand out
  different ones. `/api/pool-coin` returns the largest available and takes **no
  lease**: with a single claimant in a period there is nothing to race, which is
  the pilot's case and not a general answer.

The relay also **cannot size them**. It sees commitments, never salaries, so it
has no idea what any benefit comes to. An undersized coin surfaces as a claim
that will not prove, and the fix is a deposit rather than a change to the relay.

## Claiming

A claim is made from the claimant's **own browser**, on `/claim`. It has to be:
`claim` rebuilds the leaf's `payeeBinding` from `ownPublicKey()`, so the
transaction must be signed by the wallet payroll filed as payee — not by the
fund, not by a relay, not by an agency acting for her. That assertion is what
stops an employer collecting on their own leavers, so it cannot be relaxed for
convenience.

### One input, and what removed the other two

| Input | From | Why it cannot come from anywhere else |
| --- | --- | --- |
| **Payslip** | her employer | the nonce that opens the commitment derives from *their* passphrase |

That is the whole list. Two inputs were removed on 2026-09-02:

**The claim bundle** is assembled in her browser. Her leaf is reconstructed from
`commitmentsFor` and her own key, her slot and month count recounted from
`payeeFor`, her path built from the digests at `/api/claim-tree`, and the fund
coin fetched from `/api/pool-coin`. Nobody tells her which leaf is hers — she
recomputes her own digest and looks for the match, which is better than being
told, because being told would mean the service knew.

**The claim key** is gone from the protocol entirely.

A bundle was a poor thing to hand over anyway: it names a fund coin, and any
earlier claimant spending that coin invalidates it. One handed over in September
was likely worthless by November, so she needed a fresh one regardless — and
fetching it herself keeps her former employer out of the claim path.

### What the employee no longer needs

Until 2026-09-02 a claim took **three files**: a claim bundle from the relay, a
payslip from her employer, and a claim key she had generated herself and kept.
It now takes one, and it is the one her employer would have sent anyway.

| | Before | Now |
| --- | --- | --- |
| Claim bundle | file from the relay | assembled in her browser |
| Payslip | file from her employer | unchanged |
| Claim key | 32-byte file, unrecoverable | **gone** |

The claim key was the sharpest edge in the system. It existed in one download
and nowhere else — it could not be sealed to her wallet (the DApp connector
exposes `shieldedEncryptionPublicKey` and `signData`, and **no decrypt
operation**) nor derived from a signature (the connector signs
non-deterministically, so the same message yields a different key each time).
Losing it forfeited the benefit. Creating a second one silently invalidated the
first. And her employer had to anchor its hash in a write-once statement before
dismissing her, so a wrong value stranded her with no way to notice until she
claimed.

### What was traded away

The claim key did three jobs. Two were replaceable and one was not.

| Job | After removal |
| --- | --- |
| Seed the nullifier, so a window cannot be claimed twice | `ClaimNullifier { payee, window, fund }` from `ownPublicKey()` — the wallet cannot lie about its own key |
| Bound the number of windows | unrelated to the key; see the `durationMonths` fix below |
| Keep the nullifier **unlinkable** | **lost** |

The third is the real cost and should be stated plainly: the nullifier is now
`hash(ownPublicKey, window, fund)`, so **anyone holding a claimant's payment
address can compute it and test the public `spent` set** — learning *that* she
claimed, and for how many windows. Never how much, never her salary, never which
employer.

Not the world: `payeeFor` publishes only a hash, so a passer-by cannot do it. But
a former employer can, from the workbook, and so can anyone she has given that
address to in order to be paid.

`fund.compact` records the reasoning at `ClaimNullifier`, including the shape
that would restore unlinkability without a file: a secret her wallet can
reproduce on demand. **WebAuthn PRF** is that shape; nothing in the connector is,
today. See [wave 2](privacy.md#wave-2-hardening).

### The number of windows is now enforced

⚠️ **It was not.** `claim` took `window` as an argument, put it in the nullifier
and asserted nothing about it. `PILOT_DURATION_MONTHS = 3` lived only in
TypeScript, so a claimant calling the circuit directly passed window 0, 1, 2,
3 … and drew a distinct nullifier — and a distinct payment — for each, until the
fund was empty. Everything else about them was genuine; only the *number* of
payments was theirs to choose.

`BenefitParams` now carries `durationMonths`, and `claim` asserts
`window < params.durationMonths`. Windows are zero-based **indices**, not
periods — a YYYYMM value could never satisfy that bound. The month each index
falls in is shown for readability and is not what the circuit sees.

The cost was the one the old note in `utils/benefit-params.ts` predicted: the
struct hash changed, so every published version had to be republished and the
fund redeployed.

### Every assertion is checked before proving

The circuit's checks are re-run off-circuit first, against the same pure
circuits, so a wrong file names itself instead of costing minutes of proving and
then reporting `assertion failed`:

- the payslip is for this contract, this period, this slot — and when it is
  not, the message **names both addresses**, because after a redeploy every
  payslip the previous contract issued keeps naming it, and "a different
  contract" sends someone hunting for a file that does not exist yet;
- the leaf was filed for the connected wallet (`payeeHash`);
- the payslip figures open the published commitment (`commitmentFor`);
- the rebuilt path reproduces the published root;
- the pool coin covers the benefit.

The anchored-key check is gone with the key it checked. It used to be the
likeliest failure in the whole flow.

### She can check what she has already claimed

`/employee` → *Have I already claimed?*. It runs on its own, with **no file**:
the page computes `claimNullifier(ownPublicKey, index, fund)` for each window of
the entitlement and looks it up in the public `spent` set, reporting claimed and
remaining.

This was documented as impossible, then became possible with a file, and is now
automatic. The premise was that nobody else may compute her nullifiers, which
was true while they were keyed on a secret — and it never implied she could not
compute her own. What was missing was a pure circuit, because reimplementing a
contract hash in TypeScript is what `claim-tree.ts` exists to forbid.

The page is now explicit that the convenience has a price: anyone holding her
payment address can run the same check. That is the linkability traded away with
the claim key, said where it matters rather than left for a reader to infer.

**Adding it cost nothing on chain**, which is worth recording generally: pure
circuits carry no prover or verifier keys. Recompiling `fund.compact` with
`claimNullifier` left all 12 prover keys, all 12 verifier keys and all 12 zkir
files byte-identical — only `contract/index.js` and `contract-info.json` moved —
so the deployed fund was unaffected and `findDeployedContract` still matches.
The note in `benefit-params.ts` that a pure circuit "needs a redeploy, since
verifier keys are fixed at deploy" is therefore wrong, and the
`benefitParamsHash` circuit it wants is free.

The lookup is local: the whole set is read and searched in the page. Querying an
indexer for one nullifier would hand it the linkage the construction denies,
even though the answer is public.

⚠️ **Entitlement is three months, flat — a pilot simplification**, and it is
`PILOT_DURATION_MONTHS` in `benefit-params.ts` rather than a field of
`BenefitParams`, because that struct is hashed against `paramsFor` and a new
field would stop v1 from opening. The scheme it models derives duration from
employment history, and `leaf.monthsWorked` already carries the input.

⚠️ **`claim` does not enforce it, or any limit.** `window` is an argument that
appears in the nullifier and in no assertion — it is not tied to
`leaf.finalPeriod` and not bounded, so every distinct window is a fresh
nullifier. Three months is what the app shows, not what the fund allows. See
**Where the money could go wrong** for why that is more than a display concern.

### What a claim discloses

The period, the params version, the nullifier, and that a claim happened. **Not**
the employer, not the slot, not the salary, not the benefit paid.

The nullifier is `hash(claimKey, window, fund)` — keyed on a secret. The obvious
construction, `hash(domain, ownPublicKey, window)`, is computable by everyone who
has ever been given her coin public key, which is an address she hands out to be
paid. They would enumerate windows, test membership of the public `spent` set,
and read her benefit history. It is the single most sensitive fact in the system
and it would have been recoverable by every employer she ever had.

### Where the money could go wrong

⚠️ **`claim` does not bound how many windows one claimant may claim.** This is
a reading of the source, not a demonstrated exploit — nobody has run it — but
the chain of steps is short enough to state precisely, and it deserves fixing
before this carries real money.

`window` is a `Uint<32>` argument. It appears in exactly one place: the
nullifier preimage. Of the nineteen assertions in `claim`, none mentions it. It
is not tied to `leaf.finalPeriod`, not bounded by any duration, and
`BenefitParams` has no duration field to bound it with. So a distinct `window`
is a distinct nullifier, and a distinct nullifier is a fresh payout.

The brake is supply, not rule: `claim` needs an unspent fund coin, and her
bundle carries exactly one. But the contract's own comment at the change coin
says:

> The change's ordinal, so the pool can be found again. The nonce is NOT
> recorded: **it is derivable from the spent coin's**

She knows her input coin's nonce — it is in her bundle. The change's ordinal is
published as `poolOrdinal`. Its `mtIndex` comes from the indexer by ordinal,
which is exactly what `relay.ts` already does with `contractLeaves`. Its value
is her input minus a benefit she computed herself. That appears to be everything
`claim` needs for a second call at `window + 1`, and the same again after that.

That comment is right about what it addresses — publishing the nonce beside a
public coin commitment would let anyone grind the pool balance. It was written
against a different threat, and does not seem to have been weighed against an
unconstrained `window`.

**The fix is one assertion**, and it is the same one that would make the
three-month entitlement real rather than advisory: put the duration in
`BenefitParams` and require `window` to fall inside
`[finalPeriod, finalPeriod + duration)`. Both halves are load-bearing — the
duration alone changes a hashed struct, so every published version must be
republished, and the assertion lives in an impure circuit, so the fund
redeploys. There is no cheap version of this.

Until then, `/employee` reports any claim it finds outside the entitlement
rather than assuming there cannot be one.

### The benefit is derived from the final month alone

```
benefit = min(gross, maxMonthlyGross) × rate / 10000
```

Compact has no division, so the quotient is witnessed and pinned by
`q × 10000 ≤ n < (q + 1) × 10000`, which admits exactly one value.

⚠️ **Stated rather than buried.** Real WW computes a dagloon from SV-loon across
a reference year, precisely because one month can be distorted by a bonus,
overtime, or a partial month worked. Deriving from the final month alone is more
manipulable than that. The mitigations not built are capping the final gross
against the accumulated average, or taking the median of the last three. What
**is** built is the cap, and the structural deterrent that inflating a final
salary moves the employer's own published `totalPayrollFor` and is assessed for
tax and contribution — the attack is priced rather than free.

The rate is also **flat**, where the real scheme steps it down after the opening
months. That belongs in `BenefitParams` as a schedule and is not modelled.

Months worked is **attested by the employer, not derived**. The fund cannot read
a payroll ledger to count for itself, and a public per-person counter would be a
tenure record keyed to one worker. It stays auditable after the fact, because the
filings are public.

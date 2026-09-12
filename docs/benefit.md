# The unemployment benefit

The fund, the claim tree, and how somebody proves an entitlement without
disclosing the salary it rests on or being identifiable as a claimant.

[← back to the README](../README.md)

> **Redeployed 2026-09-11.** `contracts/fund.compact` was changed after a review
> — withholding leaves inside the claim, a claim names a calendar month, the
> rules are pinned per final period, the token is frozen at deploy — and the
> fund below runs that build. No claim has been made against it yet, so the
> parts of a claim that only a real transaction can prove are still marked as
> unproven.

## The fund

One shared instance, deployed by the platform. It holds the money benefits are
paid from, the versioned benefit rules and which of them applies to each final
period, one Merkle root per period, and the set of spent nullifiers.

```
preview/fund  ae30b2888cf2c9722821dd54763d079249c576ead3e795c9d91cafe374fa31a1
              token pEUR 7ec1d9ec… · v1 recorded for final periods 202601–202612 · €300.00 deposited (coin #0)
```

An earlier fund, `8615dd7a…`, ran without withholding and is **abandoned with
€306 in it**. Adding withholding changed the ledger layout, and verifier keys are
fixed at deploy — so the money can only be reached by rebuilding from
`contracts/fund.compact.bak` and claiming against it. `820815a1…`, the first fund
with withholding, was superseded on 2026-09-02. That is the cost of a contract
change to a contract with **no withdrawal circuit**: money enters a fund easily
and leaves only through a claim.

⚠️ **`eb40dcad…`, the previous fund, is now in the same position.** Read on
2026-09-11 it shows €310.00 contributed, one claim paid, and €55.055 of tax and
€4.62 of contribution still in its pools. Those pools can be remitted only by the
previous build's `fund remit`, which the current CLI no longer has — so reaching
them means rebuilding the last commit before these changes. It is archived in
`deployment.json` as `preview/fund:pre-20260911`. Its money is in the previous
pEUR token as well, so nothing the new contracts do can use it.

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
final period its attestation names, the calendar month it pays and one
nullifier, so a claimant is indistinguishable from everyone terminated in the
same month anywhere on the platform.

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
v1   cap €4,000.00/month · 7000 bp (70%) · minMonths 1 · durationMonths 3 · from 200001
```

v1 was first published on 2026-08-25, in tx
`a99421c5ce1505633ea4b277fc087254ee83fba8a929d75e67306cc28bbcd226`, on a fund
since replaced. Every struct change since has meant republishing it on the new
fund.

⚠️ **Editing a published version in that file silently breaks every claim under
it.** The registry is append-only on purpose: a new schedule is a new version
and a new `fund params` call, never an edit. `npm run fund -- params` refuses to
publish figures that contradict a version already recorded there, and shouts if
you publish one the file does not know.

`minMonths: 1` is a **pilot figure**, not the scheme's twelve. It was chosen over
the alternative — an employer attesting twelve months against an instance whose
public filings show one — because a published rule set that says what it is stays
honest, while a fabricated attestation contradicts a record anybody can read.

### Which rules apply is recorded per final period

Publishing a version makes it **available**; it applies to nothing until the
platform records it for a range of final periods:

```bash
npm run fund -- rules --version 1 --year 2026   # every final period in 2026
```

`setParamsFor(year, fromMonth, months, params)` writes
`paramsHashFor[period] = hash(params)` for each month. It is platform-only and
write-once per month — a month already recorded is skipped, never changed — and
it only accepts a version published in `paramsFor`, with a `validFrom` no later
than the first month. That last check is one payroll cannot make: payroll's
rule-set hash comes from another contract it cannot read, while the fund's
registry is in its own ledger.

`claim` then requires `paramsHashFor[finalPeriod]` to equal the hash of the rules
it is given. **Before 2026-09-11 it checked only that the version was published
and had taken effect by the final period**, so every older version still
qualified — a claimant could pick the one with the highest rate, the lowest
`minMonths` or the longest duration. That was harmless while only v1 existed and
would have opened the day a v2 was published.

A final period with no rules recorded cannot be claimed against. The relay warns
about it, and the claim page says so before proving. The client finds the
version by hashing each locally known one with the fund's `benefitParamsHash`
pure circuit and matching it — a pure circuit carries no verifier key, so adding
it cost nothing on deploy.

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

A claim makes **three sends chained through their change**: the net to the
claimant (`sendShielded` on the pool coin), then the tax to the tax treasury and
the contribution to the social treasury (`sendImmediateShielded`, each spending
the change the previous send created a moment earlier in the same transaction).
The last change comes back to the contract as a **new coin whose nonce is derived
and published nowhere**. After a claim, the pool is therefore a coin this machine
has no record of.

Each send derives its change nonce the same way — `evolveChangeNonce` in
`src/utils/fund-pool.ts`, `upgradeFromTransient(transientHash([field(
"midnight:kernel:nonce_evolve/2"), degradeToTransient(nonce)]))`, read off the
compiled circuit rather than off documentation. For one send it is **verified on
chain**: on 2026-08-25 the derived nonce reproduced a change coin's commitment at
leaf 42896 exactly. A claim's surviving coin is the pool coin's nonce evolved
three times, `claimChangeNonce`, and its value is the pool coin **less the whole
benefit**, withholding included.

⚠️ The three-step form has run only in the local runtime so far. If the first
reconcile after a claim on the new fund finds no match, suspect it before the
value.

```bash
npm run fund -- reconcile --value 96
```

It rebuilds a candidate coin from every parent it knows, hashes it, and looks for
that commitment among the fund's leaves — **by commitment, never by indexing the
leaves with the receipt ordinal**, because the two orders disagree whenever one
transaction creates more than one coin, and every claim now does. It refuses to
record a coin whose commitment is not on chain, which turns "probably the right
nonce" into "provably the coin at leaf N".

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

### Where the withheld money goes

**Inside the claim, straight to the treasuries** frozen in the constructor — the
same two keys payroll uses, because money withheld from a salary and money
withheld from the benefit that replaces it must land in the same place. One
claim pays three shielded coins: the net to her, the tax and the contribution to
the two treasuries. Nothing withheld stays in the fund, and there are no remit
circuits.

**Why it changed on 2026-09-11.** The previous build accumulated withholding in
public `taxPool` / `socialPool` and remitted them later. That was documented as
disclosing only the fund's aggregate outflow. It disclosed **each claim**: every
claim is its own transaction, so each moved the pools by exactly its own
withholding. With the published contribution rate the contribution delta gives
the benefit, and below the cap the benefit gives the final gross — €4.62 at 3% is
€154.00, and €154.00 at 70% is €220.00, the example above. More claims do not
hide that; only settling several claims in one transaction would.

What sending it inside the claim costs, stated rather than discovered:

- **The public can no longer see how much benefit tax was withheld.** Only the
  treasuries can, by the coins they receive.
- **Each treasury receives one coin per claim**, and can invert its value to that
  claim's benefit and final gross. It learns what an observer used to learn from
  the pools — not who claimed.
- **A claim needs the treasuries' encryption public keys**, or it builds coins
  they can never find. The browser reads `VITE_TAX_TREASURY_ENC_KEY` and
  `VITE_SOCIAL_TREASURY_ENC_KEY` and passes them through `submitCallTx`, which,
  unlike the `callTx` shorthand, can carry them.

⚠️ The deployed `eb40dcad…` still has public pools, and they still disclose each
claim.

### The pool coin must cover the whole benefit

`claim` asserts `coin.value > benefitQ` — the net and both withholdings, plus at
least one unit. The previous build checked the coin against the **net** alone, so
a claim could add more to the withholding pools than the coin's change actually
held. The strict inequality guarantees change after each of the three sends.

An exact coin is not required, and would be worse: sizing a coin to a benefit
means knowing the benefit, which derives from the salary this contract exists to
hide.

### Operator commands

Flags come **after `--`**. Without it npm reads `--amount 10` as its own config
and the script never sees it; the CLI detects that case and says so.

```bash
npm run fund status                                  # rules published and recorded, claims, token, trees
npm run fund pool                                    # coins, which is the pool, what is spendable
npm run fund -- pool --full                          # full nonces
npm run fund -- params --version 1 --cap 4000 --rate 7000 --min-months 1 --duration-months 3
npm run fund -- rules --version 1 --year 2026        # apply it to final periods in 2026
npm run fund -- deposit --period 202609 --amount 200 # put money in, against a period
npm run fund -- reconcile --value 96                 # recover a post-claim change coin
```

`params` publishes, `rules` applies; a version never recorded for a period
applies to nothing.

**The token is frozen at deploy.** `benefitToken` is a constructor argument, read
from `peur_token_id` in `.env`, so pEUR must be deployed first. Earlier builds
fixed it on the **first deposit** instead — and `fundBenefits` is open to anyone,
so a stranger could pin a fresh fund to a self-minted token with a single unit,
after which every real contribution failed `wrong token for this fund`, with a
redeploy as the only recovery. `deposit` refuses a pEUR that does not match the
fund's token.

`pool` works out which coins are spent by deriving each one's claim change nonce
and looking for it among the others, so a spent coin and its own remainder are
not counted twice. Output from an earlier fund:

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
final month after seeing what it entitled someone to.

**The final month must be settled, tax included.** `endEmployment` requires the
slot paid and — since 2026-09-11 — the month's withholding funded. Without the
second, a month settled through `fundEmployee` + `payEmployee` alone could carry a
termination whose tax never arrived, and since only funded withholding stops a
re-file, that termination could then be wiped and restated by re-filing the
month. Now a month carrying a termination can never be re-filed. Both
termination routes check this before proving.

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
`claims/<period>/claim-bundle-<instance>-<period>-slot-N.json` — a fallback now,
since the browser assembles its own.

It **refuses** any opening that does not reproduce its on-chain attestation — a
relay that published a leaf the employer never attested to would be publishing
its own claim about someone's employment. It **warns** when the fund has no
benefit rules recorded for the period, because a tree nobody can claim against
yet looks exactly like one that works.

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

So `GET /api/pool-coin` serves those two fields, with the coin's leaf found by
rebuilding its commitment, and it is the only part of a claim that still needs
the service. It discloses nothing about who is asking: a request names a network
and gets a coin, never which leaf in a period is the caller's.

Two consequences remain, and neither is fixable from the relay:

- she **learns that coin's value**;
- two claimants handed the same coin would **race**, the second losing to a spent
  input (node error 103, which does not say so). The fund holds many coins — one
  per deposit, plus a change coin per settled claim — so the fix is to hand out
  different ones. `/api/pool-coin` returns the largest available and takes **no
  lease**: with a single claimant in a period there is nothing to race, which is
  the pilot's case and not a general answer.

The relay also **cannot size them**. It sees commitments, never salaries, so it
has no idea what any benefit comes to. It warns against `cap × rate`, the most
any benefit can be; a coin that does not hold more than a claim's whole benefit
surfaces as a claim that will not prove, and the fix is a deposit rather than a
change to the relay.

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
| Seed the nullifier, so a month cannot be claimed twice | `ClaimNullifier { payee, month, fund }` from `ownPublicKey()` — the wallet cannot lie about its own key |
| Bound the number of payments | unrelated to the key; see [Months, not windows](#months-not-windows) |
| Keep the nullifier **unlinkable** | **lost** |

The third is the real cost and should be stated plainly: the nullifier is now
`hash(ownPublicKey, month, fund)`, so **anyone holding a claimant's payment
address can compute it and test the public `spent` set** — learning *that* she
claimed, and for which months. Never how much, never her salary, never which
employer.

Not the world: `payeeFor` publishes only a hash, so a passer-by cannot do it. But
a former employer can, from the workbook, and so can anyone she has given that
address to in order to be paid.

`fund.compact` records the reasoning at `ClaimNullifier`, including the shape
that would restore unlinkability without a file: a secret her wallet can
reproduce on demand. **WebAuthn PRF** is that shape; nothing in the connector is,
today. See [wave 2](privacy.md#wave-2-hardening).

### Months, not windows

The number of payments has been fixed twice.

**Until 2026-09-02, nothing bounded it.** `claim` took a `window` argument, put it
in the nullifier and asserted nothing about it. `PILOT_DURATION_MONTHS = 3` lived
only in TypeScript, so a claimant calling the circuit directly passed window 0,
1, 2, 3 … and drew a distinct payment for each, until the fund was empty.

**On 2026-09-02** `BenefitParams` gained `durationMonths` and `claim` asserted
`window < durationMonths`. That bounded the count and left two faults: every
window could be claimed at once, and the nullifier `(wallet, window, fund)` capped
a person at `durationMonths` windows **for the fund's lifetime**, so a later job
loss could never be claimed.

**Since 2026-09-11** a claim names a calendar month. `claim` takes
`calendar: ClaimMonth` — the final period split into year and month, the month
being claimed, and `floor(year/4)`, `floor(year/100)`, `floor(year/400)` — and
asserts:

- the month is one of the `durationMonths` after the final period, counted as
  `year × 12 + month` so December rolls into January without a division;
- `blockTimeGte(monthStart(…))`: not before the first second of that month, UTC,
  by the block's clock. `monthStart` computes days since 1970 on chain and pins
  the three quotients, because Compact has no division. It agrees with
  JavaScript's `Date.UTC` for every one of the 12,360 months from 1970 to 2999;
- the nullifier is `hash(wallet, month, fund)`.

So one person gets at most one benefit per calendar month from this fund. A later
job loss brings new months and can be claimed; two terminations covering the
same month cannot pay it twice. The final month itself is not claimable — it was
paid as salary.

⚠️ **The fund cannot see re-employment**, because it cannot read a payroll ledger.
The date gate paces claims to the calendar; it does not stop someone who has found
work from drawing the rest.

⚠️ **Overlapping terminations still extend an entitlement.** Final periods of
202601 and 202603 with a three-month duration cover 202602 to 202606 — five
months, not three. Each termination needs its own paid, withheld month, so it is
priced, not free.

The client side is `entitlementPeriods`, `monthStartSeconds` and `claimCalendar`
in `benefit-params.ts`. The claim form claims the earliest month that has started
and carries none of her nullifiers.

### Every assertion is checked before proving

The circuit's checks are re-run off-circuit first, against the same pure
circuits, so a wrong input names itself instead of costing minutes of proving and
then reporting `assertion failed`:

- the payslip is for this contract, this period, this slot — and when it is
  not, the message **names both addresses**, because after a redeploy every
  payslip the previous contract issued keeps naming it, and "a different
  contract" sends someone hunting for a file that does not exist yet;
- the leaf was filed for the connected wallet (`payeeHash`);
- the payslip figures open the published commitment (`commitmentFor`), against
  the key that filed the period rather than whoever holds the seat now;
- the rebuilt path reproduces the published root;
- benefit rules are recorded for the final period, and this build knows them;
- the month is one of the entitlement months and has started;
- its nullifier is not already in the spent set, checked locally;
- the pool coin is in the fund's token and holds more than the whole benefit;
- the build carries both treasury encryption keys.

### She can check what she has already claimed

`/employee` → *Have I already claimed?*. It runs on its own, with **no file**:
the page reads the rules recorded for her final period, computes
`claimNullifier(ownPublicKey, month, fund)` for each entitlement month and looks
it up in the public `spent` set. Each month shows as claimed, claimable now, or
the date it opens.

This was documented as impossible, then became possible with a file, and is now
automatic. The premise was that nobody else may compute her nullifiers, which
was true while they were keyed on a secret — and it never implied she could not
compute her own. What was missing was a pure circuit, because reimplementing a
contract hash in TypeScript is what `claim-tree.ts` exists to forbid.

The page is explicit that the convenience has a price: anyone holding her
payment address can run the same check. That is the linkability traded away with
the claim key, said where it matters rather than left for a reader to infer.

**Pure circuits cost nothing on chain**, which is worth recording generally: they
carry no prover or verifier keys. Recompiling `fund.compact` with
`claimNullifier` left every prover key, verifier key and zkir file byte-identical
— only `contract/index.js` and `contract-info.json` moved. `monthStart` and
`benefitParamsHash` were added the same way.

The lookup is local: the whole set is read and searched in the page. Querying an
indexer for one nullifier would hand it the linkage the construction denies,
even though the answer is public.

⚠️ **Entitlement is three months, flat — a pilot simplification.** The scheme it
models derives duration from employment history, and `leaf.monthsWorked` already
carries the input.

### What a claim discloses

The final period, the calendar month it pays, the nullifier, the hash of the
rules recorded for that period, and that a claim happened. **Not** the employer,
not the slot, not the salary, not the benefit paid.

The nullifier is the one weak point, and it is a chosen one: anyone holding the
claimant's payment address can recompute it (see
[What was traded away](#what-was-traded-away)).

⚠️ On the deployed `eb40dcad…` a claim also discloses its benefit and final
gross, through the public withholding pools the current source removed.

### What the 2026-09-11 build closed

A review of the fund found five faults, each now fixed in source and exercised by
`tests/fund-claim.test.mjs` against the compiled contract. All five are live on
the fund deployed on 2026-09-11, `ae30b288…`; none has yet been exercised by a
real claim there.

| Fault | Now |
| --- | --- |
| Each claim moved the public withholding pools by its own withholding, disclosing its benefit and final gross | withholding sent to the treasuries inside the claim |
| Any published rule set that had taken effect qualified, so a claimant could choose the most generous | rules pinned per final period with `setParamsFor` |
| Every window claimable at once, and a later job loss never claimable | calendar months with a date gate, nullifier per month |
| The first coin deposited fixed the token, and anyone may deposit | token frozen at deploy |
| The pool coin was checked against the net only | checked against the whole benefit |

`findings.md` records how each was found and what verified the fix.

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
filings are public — but nothing enforces it: one filed, paid and withheld month
with an attested `monthsWorked` of 12 satisfies a `minMonths` of 12.

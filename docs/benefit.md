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
claimKeyHash, nonce }`. None of those figures is published: months worked per
slot would be a tenure record for a worker, and a claim-key hash per slot would
be a stable handle appearing identically at every employer that person uses it
with — rebuilding the cross-employer linkage `payeeFor` gives up convenience to
prevent.

Write-once matters: an employer who could reissue a termination could restate the
final month after seeing what it entitled someone to. Correcting one means
re-filing the period, which has its own guards.

**The employer cannot claim on it.** `claim` requires the payee's own wallet key,
which `payeeFor` binds and no employer holds.

### The claim key has to exist before the dismissal

The claim-key hash goes into the attestation, which only the employer can write.
So the order is:

> employee creates a claim key → hands the **hash** to her employer → employer
> ends the employment → employee claims

She has to be in the loop at the moment she is being dismissed, holding a secret
she generated earlier. That is not how a benefit office works, where you turn up
afterwards with nothing but your identity. The alternative — anchoring the hash
at hire, carried in the roster and written by `setPayroll` — is a contract change
and a redeploy, and has not been made.

The employer only ever sees the hash, never the key, so neither arrangement lets
them compute her nullifier.

### Two routes

| | Browser | CLI |
| --- | --- | --- |
| Where | `/employer/payroll` → **End employment** | `npm run terminate -- <instance> <period> <slot> --payee <key> --claim-key-hash <hash>` |
| Signs with | the employer's wallet extension | `.env` |
| Works for | any employer | only when employer == operator |

Both produce an **opening file** — the figures behind the commitment. It is not
stored anywhere and cannot be recovered from the page afterwards. Download it and
put it in `terminations/`; the relay reads that directory.

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
the termination opening, which carries months worked and a claim-key hash — not
an amount.

### What the trust actually is

A **forged** root is not prevented: nothing in the fund can tell a true copy from
an invented one. It is *attributable* and publicly recomputable, since every
input except the opening is public payroll state and the opening is checked
against the chain. And `publishRoot` is **permissionless**, so a relay that
declines to publish cannot silently block a claim — someone else can publish the
same root. Only the platform's root lands in `rootFor` today; widening that is a
policy change, not a contract change, because the roots are all there and
attributable.

### The bundle carries a pool coin, and that is a real cost

`claim` takes the fund's coin as an argument — nonce, value and leaf — so a
claimant cannot claim without being handed one. Two consequences follow, and
neither is fixable from the relay:

- she **learns that coin's value**;
- two claimants handed the same coin would **race**, the second losing to a spent
  input. So each gets a distinct one, and the relay warns when there are fewer
  coins than claimants.

The relay also **cannot size them**. It sees commitments, never salaries, so it
has no idea what any benefit comes to. An undersized coin surfaces as a claim
that will not prove, and the fix is a deposit rather than a change to the relay.

⚠️ **`terminations/…json` and `claims/…json` are not interchangeable.** The
employer's opening travels employer → relay; the bundle travels relay →
claimant, and only the bundle has a path. They were one character apart in
filename until the bundle was renamed to `claim-bundle-…`; the claim page now
recognises an opening loaded by mistake and says which is which.

## Claiming

A claim is made from the claimant's **own browser**, on `/claim`. It has to be:
`claim` rebuilds the leaf's `payeeBinding` from `ownPublicKey()`, so the
transaction must be signed by the wallet payroll filed as payee — not by the
fund, not by a relay, not by an agency acting for her. That assertion is what
stops an employer collecting on their own leavers, so it cannot be relaxed for
convenience.

### Three inputs, and the split is the architecture

| Input | From | Why it cannot come from anywhere else |
| --- | --- | --- |
| **Claim bundle** | the relay | a path through a tree over everyone else terminated that month — being unable to build it alone is what keeps her anonymous inside it |
| **Payslip** | her employer | the nonce that opens the commitment derives from *their* passphrase |
| **Passphrase** | her | the one input nobody else can supply |

Everything else is read from the chain rather than trusted from a file: the
employer key and the tax `paramsHash` come from the payroll ledger.

### Her claim key is random, and she keeps the file

On `/employee` → **Your claim key** → *Create my claim key*: 32 bytes from
`crypto.getRandomValues`, downloaded as `claim-key-xxxxxxxx.json` — the same
name the CLI writes, so neither half of the system renames the other's file
(not `identity` or `account` — there is no account here, and the wallet is the
identity). Only the
**hash** is displayed and only the hash is remembered; the key itself is the
nullifier secret and a page that shows it invites it into a screenshot.

**It was a passphrase until 2026-08-26** — PBKDF2-SHA256 at 600,000 iterations,
salted with her coin public key — and the reason it is not one any more is worth
keeping. `claimKeyHash` is not secret: it travels in clear in her claim bundle
and in the employer's termination opening, and the salt is her coin public key,
an address she hands out to be paid. Anyone holding a bundle therefore had an
offline grinding target. Money was never at risk — `claim` also asserts
`payeeBinding` against `ownPublicKey()`, so a guessed key spends nothing — but
the linkability the key exists to protect was recoverable at the strength of
whatever words she chose, and nothing in the UI said so. Random bytes end that.

The obvious alternative, sealing the key to her wallet so there is nothing to
keep, is not available. The connector exposes **no decrypt operation** — checked
against 4.0.1 and against the 4.1.0 canary of 2026-08-19, which adds only
proving surface — so a key encrypted to her `shieldedEncryptionPublicKey` would
be ciphertext with no reader, forever. That also rules out sealing it on chain:
a seal needs a holder, her employer must not be one, her wallet cannot be one,
and a password reintroduces exactly what this removed.

She now keeps a file. That is a smaller change than it sounds — the final
payslip is already required to claim, and it carries her salary in clear, so the
bar for "a file she looks after" was set higher than this already. A file can
also be backed up, where a memorised passphrase can only be backed up by writing
it down.

**The CLI and the browser no longer diverge.** `npm run payee <seed> --
--claim-key` still derives `sha256("polisZK/claim/v1", shieldedSeed)`, because a
CLI holds a seed and that is high-entropy already — but it now also writes the
same `claim-key-….json`. The two roots are not reconciled by making the
derivations agree, which they never could: a browser cannot reach a seed. They
are reconciled by the file. A claim key is 32 bytes, and where they came from
stops mattering once both sides load the same file.

⚠️ Anyone whose employer already anchored a passphrase-derived hash still claims
with that passphrase. `/claim` keeps the route behind a disclosure and it cannot
be removed: the anchor is write-once, so there is no migration, only a fallback.

### Every assertion is checked before proving

The circuit's checks are re-run off-circuit first, against the same pure
circuits, so a wrong file names itself instead of costing minutes of proving and
then reporting `assertion failed`:

- the payslip is for this contract, this period, this slot;
- the bundle was filed for the connected wallet (`payeeHash`);
- the payslip figures open the published commitment (`commitmentFor`);
- **the claim-key file reproduces the anchored hash** — the likeliest failure in
  the whole flow, and the one worth naming precisely, since the anchor is
  write-once. Checked as soon as the bundle and the key are both loaded rather
  than at submit: `leaf.claimKeyHash` is in the bundle in clear, so it costs a
  string comparison, and the moment she is still looking at her downloads folder
  is the only useful one to tell her in;
- the pool coin covers the benefit.

### She can check what she has already claimed

`/employee` → *Have I already claimed?* → her claim-key file. The page computes
`claimNullifier(claimKey, window, fund)` for each month of the entitlement and
looks it up in the public `spent` set, reporting claimed, remaining, and
anything outside the entitlement.

This was documented as impossible and it was not. The premise — nobody else may
compute her nullifiers — is exactly why `fund.compact` keys them on her secret
claim key, and it never implied she could not compute her own. What was missing
was a pure circuit, because reimplementing a contract hash in TypeScript is what
`claim-tree.ts` exists to forbid.

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

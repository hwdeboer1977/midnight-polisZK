# IncomeLayerZK

Private payroll on Midnight, and an unemployment benefit paid from it without
anyone learning who claimed or how much.

**This file is the project's documentation.** It absorbs what used to live in
`steps_employer.md`, `steps_employee.md`, `multi-contract-findings.md`,
`tax-and-vaults-approach.md` and `src/server/README.md`.

Five contracts:

- **`payroll`** — one instance per employer. Individual salaries never reach the
  chain; only the headcount, the totals, and one commitment per employee do. It
  also holds the withheld tax and contributions until they are remitted, and
  records the employer's attestation that someone's employment ended.
- **`taxparams`** — one shared instance. The versioned, append-only record of
  what the rates were, so a filing stays checkable against the rules in force
  when it was made.
- **`peur`** — a shielded EUR stablecoin the payroll is denominated in. Balances
  and transfer amounts are private; total supply is public so it can be audited
  against reserves.
- **`fund`** — one shared instance. Holds the money benefits are paid from and
  the per-period Merkle roots a claim proves membership of. A claimant proves
  she was employed long enough and what her final salary was, discloses neither,
  and is indistinguishable from everyone terminated in the same month anywhere
  on the platform.
- **`taxvault`** — one shared instance. Receives wage tax per period under a
  withdrawal authority frozen at deploy. Unlike the fund it never pays out
  privately, so `heldTotal` is a genuine public balance.

Nobody is recorded as unemployed anywhere. There is no claimant list, no status
field, and nothing an observer can enumerate to find one — see **The fund**.

The product is branded **IncomeLayerZK**. The repository name and the
`polisZK/...` domain-separation tags keep the older name and **must not be
renamed** — they derive keys and commitments, so changing either invalidates
every commitment already on chain.

## Prerequisites

- **Node.js 22+**
- **Docker** — runs the local devnet (node + indexer) and the proof server
- **Compact compiler**, pinned to a version whose emitted runtime matches the
  installed `@midnight-ntwrk/compact-runtime` (see [Toolchain versions](#toolchain-versions))

## Quick start (local devnet)

```bash
npm install

npm run env:up        # midnight node + indexer (compose.yml)
npm run proof:up      # standalone proof server on :6300

npm run compile       # compiles every contracts/*.compact
npm run check-balance # sanity check: wallet syncs, has tNIGHT/tDUST

INSTANCE=acme npm run deploy:tax       # registry + v1 rules + payroll + rule window
INSTANCE=acme npm run payroll          # assign employer, set salaries

npm run deploy:peur   # deploy pEUR and mint the initial supply
npm run peur          # token status, mint more

npm run deploy:fund   # the unemployment fund (needs TAX_TREASURY_KEY + SOCIAL_TREASURY_KEY)
npm run fund -- params --version 1 --cap 4000 --rate 7000 --min-months 1
npm run fund -- deposit --amount 200   # the FIRST deposit fixes the benefit token forever
npm run fund status
```

Use `deploy:tax` rather than `deploy:payroll` for the payroll contract. The
generic `deploy.js` passes no constructor arguments, and `payroll`'s constructor
now takes both treasury keys; `deploy:tax` and `npm run onboard` supply them
from `TAX_TREASURY_KEY` / `SOCIAL_TREASURY_KEY`. It also records the rule-set
hash for a window of periods, without which a freshly deployed instance can file
nothing — see **taxparams**.

`MIDNIGHT_NETWORK=local` needs no wallet secret: the devnet's `dev` genesis
preset pre-funds a well-known account, and the app falls back to it when neither
`WALLET_MNEMONIC` nor `WALLET_SEED` is set.

The proof server is started with `docker run` rather than from `compose.yml`. It
fails to fetch key material from `srs.midnight.network` when compose starts it,
but works as a standalone container. It listens on the host at `localhost:6300`,
so it does not need to share the compose network.

⚠️ **The `--` before fund flags is not decoration.** Without it npm reads
`--amount 200` as its own config and the script never sees it, so the command
fails asking for the argument you just typed. Same convention as
`npm run payee <seed> -- --balance` and `npm run relay -- <period> --publish`.

## payroll

One employer, a fixed roster of 10 employees, one contract instance per
employer.

### Ownership

The platform operator deploys an instance, then hands it to its employer exactly
once. After assignment the platform has **no privileged circuit left**: it cannot
reassign, cannot revoke, and cannot set payroll. Only employer X can write to
employer X's instance.

```bash
INSTANCE=acme npm run deploy:payroll   # platform deploys; instance is unowned
INSTANCE=acme npm run payroll          # menu 2: assign employer (once)
```

Employer X runs `INSTANCE=acme npm run payroll` on their own machine with their
own wallet, reads their **coin public key** off the header (64 hex chars), and
sends it to the platform, who pastes it into "Assign employer".

`transferEmployer` lets the *employer* rotate to a new key. Key loss would
otherwise strand the instance, and routing recovery through the employer rather
than the platform means the platform never regains write access.

Verified on the devnet with three separately funded wallets:

| Attempt                       | Result                                             |
| ----------------------------- | -------------------------------------------------- |
| platform assigns employer X   | accepted                                            |
| platform assigns again        | `failed assert: employer already assigned`          |
| platform sets payroll         | `failed assert: only the employer may set payroll`  |
| unrelated wallet sets payroll | `failed assert: only the employer may set payroll`  |
| employer X sets payroll       | accepted                                            |

Assertions fire during local circuit execution, **before** balancing, so an
unauthorised call costs nothing and never reaches the chain.

### Privacy

Salaries are circuit inputs, so only the proof leaves the machine. The chain
stores, **per period**, the headcount, the total, and one commitment per employee.

The whole roster is set in a **single** `setPayroll` call, and that is a privacy
requirement rather than a convenience. If salaries were written one at a time,
each transaction would move that period's public total by exactly that person's
salary, and anyone watching blocks could read every amount off the deltas.
Batching means public state only ever moves by the aggregate.

### Payroll is recorded per period

The ledger is keyed by period — `YYYYMM` as a number, so `202603` — rather than
holding a single current state:

```
periods           Set<Uint<32>>
latestPeriod      Uint<32>
employeeCountFor  Map<Uint<32>, Uint<8>>
totalPayrollFor   Map<Uint<32>, Uint<64>>
commitmentsFor    Map<Uint<32>, Map<Uint<8>, Bytes<32>>>
sealedFor         Map<Uint<32>, Map<Uint<8>, Bytes<68>>>
```

A commitment is only worth having if it can still be opened when someone
disputes it, and disputes are about past months. Keying by period is what makes
"prove what Anna was paid in March" answerable in June, instead of March being
overwritten the moment April is filed.

`YYYYMM` rather than a plain counter because a counter tells a reader that a run
happened without telling them which month it was for, and the mapping back would
live off-chain where it can be lost or disagreed with.

A period may be **re-submitted** — a correction to a month already filed is a
real thing that happens. It replaces that period alone and leaves every other
month standing, which is the whole point of keying by period. `latestPeriod`
only ever moves forward, so a correction filed for an old month does not make
that month look like the current one.

Each employee gets a commitment `persistentHash(salary, nonce)` stored on chain.
It reveals nothing on its own, but lets the employer later prove to an employee
what they were paid. The nonce is what stops the commitment being brute-forced —
without it, hashing every plausible salary would recover the amount.

### Losing the openings

A commitment is only useful if it can still be opened, and the opening — the
`(salary, nonce)` pair — is exactly what a hash does not contain. Two mechanisms
keep it recoverable, because either one alone leaves a gap:

**Nonces are derived, not random.** `nonce(period, i)` is a hash over a key
derived from the employer's passphrase, the contract address, the period, and
the index, so every nonce ever used is recomputable. Binding to the contract
address matters: without it, one employer running two instances would produce
identical commitments for identical salaries, leaking equality between contracts
meant to know nothing about each other.

**Openings are sealed on chain.** `sealedFor[period][i]` holds the salary and
nonce encrypted to the employer's key — AES-256-GCM, 68 bytes: a 12-byte IV, 40
bytes of ciphertext, a 16-byte tag. Derivation alone recovers the nonce but not
the amount, so an employer who lost the roster spreadsheet too would still be
stuck; sealing puts the amount on chain as well.

The IV is stored rather than derived from `(period, i)` because a period may be
legitimately re-filed — corrections are the reason the ledger is keyed by period
at all — and a derived IV would then repeat with the same key on different
plaintext. Under GCM that leaks the XOR of the two salaries and voids
authentication.

The contract cannot check that a blob decrypts to its matching commitment;
doing so would mean decrypting in-circuit. The only party a bad blob can harm is
the employer who wrote it, since they alone hold the key.

`payroll-secrets.<INSTANCE>.json` (gitignored, mode 0600) is therefore a
**cache**, not the source of truth. Menu option 6 rebuilds it from the chain
using nothing but the passphrase, and verifies every recovered opening against
its on-chain commitment before writing it.

#### Why the root is a passphrase

The root is PBKDF2-SHA256, 600,000 iterations, salted with
`polisZK/kdf/v1|<contractAddress>`. Identical in `src/utils/payroll-openings.ts`
and `frontend/src/lib/openings.ts` — verified by deriving in Node and opening
the resulting blob in the browser — so a period filed from either tool can be
recovered by the other.

That sharing is not a nicety. `setPayroll` requires the employer's own key, so
any employer who is not also the platform operator must submit from their
browser wallet, and a web page can never reach a wallet seed. A root only the
CLI could compute would leave every browser-filed period permanently unopenable
by the CLI.

Two better-looking options were tried first and both fail:

- **A wallet signature over a fixed message.** The obvious substitute for a
  seed, and it does not work: the connector signs **non-deterministically**, so
  the same message yields a different signature every time and every derived
  nonce would be unreproducible. Worth knowing before reaching for it again.

  Re-measured on **2026-08-26**, because the first probe predated an API change
  and this claim is repeated in eight places on the strength of it. `signData`
  now takes an explicit `keyType: 'unshielded'` — a different path from whatever
  was originally tested — so the finding was worth re-establishing rather than
  inheriting. It holds:

  | | |
  | --- | --- |
  | Wallet | 1AM, `com.midnight.1am` |
  | `apiVersion` | 4.0.0 (against `dapp-connector-api` 4.0.1) |
  | Network | preview |
  | Options | `{ encoding: 'text', keyType: 'unshielded' }` |
  | Result | the same message signed repeatedly returns **different bytes each time** |

  `frontend/public/signdata-determinism.html` is the probe, kept rather than
  deleted: this is a fact about one wallet build, not about Midnight, and a
  wallet could make signing deterministic in a version bump without anyone
  here noticing. Re-run it before accepting the passphrase as permanent.

  Two things it also established, both worth knowing before reaching for
  `signData` for any other purpose:

  - 1AM refuses a repeat of a payload it has just handled — *"Duplicate
    request, a similar request is already pending"* — so any design that
    re-signs one fixed message needs an alternate payload between calls or a
    retry.
  - `keyType` admits only `'unshielded'`, so a signature-derived root would
    descend from the unshielded key and would **not** reproduce the CLI's
    `deriveClaimKey(shieldedSeed)`. Even a deterministic signature would have
    left two incompatible roots, not one.
- **Encrypting to the employer's own public key.** Elegant, and dead on arrival:
  the connector exposes no decrypt operation, so the ciphertext could never be
  opened again.

PBKDF2 rather than a plain hash because the input is human-chosen — a single
SHA-256 would let anyone holding the public commitments grind candidates at
billions per second.

The cost is real and should be stated plainly: **the passphrase cannot be
reset.** Lose it and every commitment on that instance becomes permanently
unopenable. What is stored, in the browser's localStorage and nowhere else, is a
one-way fingerprint of the derived key — enough to catch a typo, useless to an
attacker.

Wrong passphrases are caught before anything is sent. Once a period exists, the
derived key must open one of its sealed openings or submission is refused; on an
empty contract there is nothing to check against, so both tools ask for the
passphrase twice.

`commitmentFor(amount, nonce)` is a **pure** circuit, so the CLI evaluates it
locally with no transaction to check a local record against the chain, using the
identical hash the proof committed to rather than a re-implementation.

### Constraints worth knowing

Salaries are capped at `Uint<60>` rather than `Uint<64>` so that ten of them
cannot overflow the `Uint<64>` total; the compiler rejects the assignment
otherwise. Compact has no mutable locals (`let` is reserved), so the sum is
written out across ten terms.

## What the compiler would not do

The tax work started as four contracts — a rule registry, `payroll`, a tax vault
and a contribution vault — with `payroll` routing withheld money into the
vaults. Five stubs in `probe/` settled whether that was buildable before
anything real was written, and it is not. Each probe records its own result at
the bottom of the file.

| Probe | Question | Answer |
| --- | --- | --- |
| `probe_xcall` | Can a contract call another contract? | **No** — `cross-contract calls are not yet supported`, compactc 0.31.1 and 0.33.0 |
| `probe_xread` | Can a contract read another's ledger? | **No** — an external `contract` block accepts circuit declarations only |
| `probe_source` + `probe_sink` | Can a contract send a shielded coin to a contract? | Compiles, then strands the coin |
| `probe_arith` | Can the band arithmetic be done without division? | **Yes** — witnessed quotient, pinned by two comparisons |

What each one actually establishes:

- **A contract value has nowhere to come from.** There is no cast from
  `ContractAddress`, and both an exported circuit argument and a witness return
  are rejected with "cannot include contract values". A constructor parameter is
  accepted — and then the call is refused. So the compiler does model external
  contracts (`contract Sink { circuit … }` resolves against
  `managed/Sink/compiler/contract-info.json`) but will not emit a call to one.
- **A vault cannot enforce what it is owed.** Reading `payroll.totalTaxFor`
  directly is a parse error (`found keyword "ledger" looking for an external
  contract circuit`), and reaching it through a declared circuit hits the same
  wall as above.
- **Contract-to-contract shielded sends strand the coin.** The receiver has to
  `receiveShielded` in the same transaction, and `Transaction.merge` throws when
  both sides carry contract interactions.
- **One transaction can carry several calls; midnight-js will not build one.**
  `Intent.addCall` is repeatable and `Transaction.addCalls` takes an array, but
  `createUnprovenCallTx` hardcodes a single `.addCall`.
- **Compact has no division operator.** Floor division is witnessed and pinned:
  `q * d <= n < (q + 1) * d` admits exactly one `q`, using only multiplication
  and comparison. The client computes the quotient, the circuit checks it.
- **`contract` and `from` are reserved words.**
- **`ledger()` is lazy.** Handed state from a different contract it returns an
  object and throws only when a field is read, so `try { ledger(…) } catch`
  guards nothing. `decodePayrollLedger` in `frontend/src/lib/contracts.ts`
  probes fields eagerly, so a stale instance fails at decode instead of
  somewhere later.

Everything in the next section is shaped by this. Withheld money stays in the
payroll contract's own pools and is remitted to treasury **wallets** — keys, not
contracts — which is the only arrangement that needs none of the missing
features. The tax-and-vault design appendix below is the pre-probe design and is superseded
by it.

## taxparams

The rule set payroll is computed under: one shared instance, holds no money, and
exists so that a period filed in August 2026 stays checkable against August
2026's rules forever. A payroll whose rates can be rewritten afterwards proves
nothing.

```compact
export ledger authority:      ZswapCoinPublicKey;
export ledger paramsFor:      Map<Uint<16>, TaxParams>;   // version -> rules
export ledger versions:       Set<Uint<16>>;
export ledger latestVersion:  Uint<16>;
export ledger versionCount:   Uint<16>;
```

**Append-only, and that is the whole safety property.** A version is written
once and can never be edited or replaced; a mistake is corrected the way a
mistake in a published statute is, by publishing a later version that supersedes
it. The design this replaced was "editable until first use, then frozen", which
is both weaker and unbuildable here — freezing on first use needs `payroll` to
tell the registry it has been used, and contracts cannot call each other.
Append-only needs no such signal, because there is no moment at which editing
must stop.

`paramsHash` is a `pure` circuit over the published fields, so the employer, the
platform and any reviewer all compute the identical value. It is what `payroll`
records per period, which is how a filing names the rules it was made under
without reading the registry — which it could not do anyway.

**The authority is not the platform.** In production this is a public body or a
threshold key; the party that sets rates is not the party that runs a payroll
platform. In this deployment it is one key, and the app says so.

### Version 1

Dutch bands as supplied, in `src/utils/tax-params.ts` so the deploy script, the
frontend and any reviewer read one copy:

| | |
| --- | --- |
| band 1, up to €38,883/yr (€3,240.25/mo) | 35.75% |
| band 2, €38,883 – €78,426/yr (€6,535.50/mo) | 37.56% |
| band 3, above €78,426/yr | 49.50% |
| social contribution, flat | 3.00% |

Thresholds are published annually and a period is a month, so each is divided by
twelve; both divide exactly into whole minor units, which is checked rather than
assumed. `maxContribBase` is a **placeholder** — no ceiling was specified for the
3%, so it is set above any salary this system will see. Capping it later means
publishing version 2, not editing version 1.

### Two implementations of one calculation

Because Compact has no division, the arithmetic exists twice: `computeLine` in
TypeScript produces the quotients, `setPayroll` pins them. `npm run test:bands`
is a differential test over every boundary value — exactly on a threshold, one
minor unit either side, zero — comparing the two.

The per-employee figures are summed to make the public totals. A rate is never
reapplied to the gross total: floor division does not distribute and the bands
are progressive, so taxing the sum gives a materially different and wrong
number.

### Which rules a period was filed under

`payroll` cannot read the registry, so the platform records the hash per period
with `setParamsFor`, and `setPayroll` rejects any period with none recorded
("no rule set recorded for that period"). Onboarding therefore opens a window —
`ruleWindow` in `src/utils/rule-window.ts`, six months starting two months back,
because an employer's first act is usually to file the month that just ended.

A contract that is deployed, assigned and owned by its employer, but has no
periods recorded, can file nothing at all.

### Withholding

Tax and contributions are withheld into pools inside the payroll contract, and
remitted to treasury wallets:

```compact
export ledger taxTreasury:    ZswapCoinPublicKey;   // frozen in the constructor
export ledger socialTreasury: ZswapCoinPublicKey;
export ledger taxPool:        Uint<64>;
export ledger socialPool:     Uint<64>;
export ledger taxRemitted:    Uint<64>;
export ledger socialRemitted: Uint<64>;
```

- `fundWithholding(period, taxCoin, socialCoin)` — employer only. Both coins
  must equal `totalTaxFor[period]` and `totalSocialFor[period]` exactly, so the
  contract cannot be underfunded; the coin ordinals are recorded the same way
  employee coins are.
- `remitTax(period, coin)` / `remitSocial(period, coin)` — employer **or**
  platform, sending that period's amount to the frozen treasury key.

The destinations are fixed at deploy and never settable again. That is what
makes exposing remit to either party safe: remitting moves money the employer
has already parted with and the employee never owned, so whoever can trigger it
must not also choose where it lands. The worst either can do is pay the treasury
early.

`TAX_TREASURY_KEY` and `SOCIAL_TREASURY_KEY` are required rather than defaulted
(`src/utils/treasury.ts`). Falling back to the deployer's key would deploy
cleanly, run correctly, and remit tax to the platform — wrong in a way nobody
notices until someone asks where the tax went. Generate them with `npm run
payee`.

**Assessed, not yet collected.** The three circuits compile and are deployed,
but nothing in the UI calls them, so `taxPool` and `socialPool` read €0.00 and
the Public page's "Tax collected" is honestly zero. Wiring them is the next step.

### Deploying the tax half

`npm run deploy:tax` does the whole sequence, because every step after the first
needs a value the previous one produced and three of them are irreversible — a
registry version cannot be edited, a payroll's treasuries cannot be changed, an
employer cannot be reassigned. Getting the order wrong does not fail; it
succeeds into a state that cannot be corrected.

```bash
REGISTRY_ONLY=1 npm run deploy:tax          # registry only — for browser signup
INSTANCE=acme EMPLOYER_KEY=… npm run deploy:tax
PERIODS=202608,202609 npm run deploy:tax    # record rules for those months
```

## peur

The stablecoin payroll is paid in. **Shielded**, so balances and transfer
amounts are private — a payroll contract that hides salaries achieves nothing if
paying them republishes the same numbers.

```bash
npm run deploy:peur                                  # deploy, then mint
npm run peur                                         # status / mint more
PEUR_INITIAL_SUPPLY=2500000000000 npm run deploy:peur # 2,500,000.00 pEUR
```

Amounts are minor units of 1e-6 pEUR: `1000000` = `1.00 pEUR`, capped at `Uint<48>` so
accumulating into the `Uint<64>` public supply cannot overflow.

### The initial mint is a second transaction

A deploy transaction **cannot** carry a zswap mint. The contract's address is not
fixed until the transaction is built, so `kernel.self()` inside a constructor
does not yet name this deployment. Minting there fails to balance with
`Wallet.InsufficientFunds` despite a funded wallet, and a token type derived
there comes out wrong — which is why `tokenId` is recorded on the first `mint`
rather than at construction. `npm run deploy:peur` runs both steps under one
command.

### Token type and minting

The token type is `tokenType(pad(32, "pEUR"), kernel.self())`, unique to the
deployment, so no other contract can mint it.

Minting is issuer-only and always pays the issuer. That sidesteps key exchange
entirely: a shielded coin can only be found and spent by someone whose
encryption key the transaction was built with, and the issuer's own wallet
already has it.

**Paying anyone else needs two keys from them** — their coin public key *and*
their encryption public key, passed to the SDK as
`additionalCoinEncPublicKeyMappings`. `npm run peur` prints both of yours for
this purpose.

### Where the pEUR actually is

Not at your `mn_addr_...` unshielded address. pEUR is held as shielded coins at
your `mn_shield-addr_...` address, and wallet apps generally will not display it
because the token type is custom to this deployment rather than tNIGHT or tDUST.
`npm run peur` lists the coins, their values, and the shielded address holding
them.

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

## Frontend

A browser app (**Vite + React + React Router**) for connecting a Midnight wallet
(1AM, Lace) and reading what it holds.

Vite rather than Next.js on purpose: this is a wallet dApp, so every page depends
on `window.midnight` and there is nothing to server-render. More importantly the
contract libraries are WASM (`ledger-v8` alone is 11 MB) and ship `browser`/`node`
export conditions — an SSR framework resolves the `node` condition on the server
and hands you a module expecting a filesystem. A backend, when it arrives, belongs
in its own service rather than in API routes bundled beside browser WASM.

```bash
npm run frontend          # generates config, then serves on :5173
npm run frontend:build    # production build into frontend/dist
```

Open <http://localhost:5173>, pick the network, and click **Connect**. The
wallet will ask you to approve — nothing happens until you do.

### Four areas, one per party

The top-level navigation names the parties, not the contracts:

| Route       | Who                                                                    |
| ----------- | ---------------------------------------------------------------------- |
| `/`         | landing page — what the product does, and what it does not publish      |
| `/app`      | **Public** — what the network publishes about itself; needs no wallet   |
| `/operator` | **Operator** — the platform's console: treasury settlement, employer access |
| `/employer` | **Employer** — run payroll, manage people, history, configuration       |
| `/employee` | **Employee** — your own income record, and unemployment benefit         |

The employer area has four tabs, each answering one question:

| Tab                    | Question                                        |
| ---------------------- | ----------------------------------------------- |
| `/employer`            | Payroll — what do I need to do this month?       |
| `/employer/employees`  | Employees — who works here?                      |
| `/employer/history`    | History — what happened in previous months?      |
| `/employer/settings`   | Settings — how is my company configured?         |

These were `Overview / Setup / Roster / History`, which named pages after their
implementation. Two were actively misleading: **Overview** was not an overview —
it is where the month is actually run — and **Setup** stops being setup the
moment onboarding is done, to the point where the page had re-titled its own
heading "Reference" while the tab still said Setup. A permanent tab named after
a finished task makes a working product feel half-built.

The employee area has two: **Salary** and **Unemployment benefit**. There is no
"unemployed" area, because a system that has to classify you before it can help
you has already published the thing you most wanted kept private. Claiming is
something you do, not something you are.

Old routes still resolve: `/register`, `/peur`, `/employer/setup`,
`/employer/roster`, `/employer/payroll` and `/claim` all redirect.

### The design system

Four visual levels, used wherever someone **operates** rather than reads:

| Level                | Means                                    | Where                              |
| -------------------- | ---------------------------------------- | ---------------------------------- |
| dark hero            | who you are, and what is outstanding     | Operator and Employer headers      |
| tinted work zone     | the thing this page exists to do         | treasury settlement, the month     |
| white card           | read-only analysis                       | national contracts, payroll record |
| neutral rows         | administration                           | the employer table                 |

Colour carries state rather than decoration: **green** complete or healthy,
**amber** attention required, **indigo/lavender** the active workflow, **grey**
not known — which is never amber, because a thing this browser has not seen is
not a thing anyone has failed to do. Status is rendered as pills (`.pill.ok`,
`.warn`, `.neutral`, `.info`) so a column can be scanned rather than read word by
word.

The **Public** page deliberately stays white. A visitor is reading, not
operating, and it is structured around the four questions someone actually
arrives with: how big is the network, what is private, where did the
contributions go, and can I verify this. Implementation status — assessed versus
collected, the demo token's permissionless minting, contracts this build cannot
decode — lives under *Technical details*, because a diagnostic nobody asked for
should be opened deliberately rather than met on the way past.

Each payroll instance renders inside an **error boundary**.Each payroll instance renders inside an **error boundary**. Ledger state decodes
lazily — `contract.ledger(...)` returns an object whose fields decode when they
are read — so a contract deployed from an older `payroll.compact` throws during
render, well past the `try/catch` that wrapped the fetch. Without a boundary that
throw unmounts the whole app and the page goes blank with no message, which is
indistinguishable from a broken build. The boundary is per instance, so one
stale contract cannot hide the others.

If a card reads *"could not be displayed"* with a `reading 'keys'` error, the
contract predates the current ledger shape: redeploy it, and re-run
`npm run frontend:config` so the browser's copy of the compiled module matches.

The landing page renders without the app shell — no network picker, no contract
navigation — because the first question a payroll product has to answer is
"what does this publish about my staff?", not "which network?".

### Bech32m in the wallet, hex on the chain

The DApp connector returns keys as `mn_shield-cpk_preview1…`; contracts and the
indexer work in raw hex. Nothing warns you when the two are mixed — a Bech32m
string simply never equals a hex string, so ownership checks quietly return
"not yours" and onboarding rejects a perfectly valid key.

`frontend/src/lib/keys.ts` decodes with `@scure/base` and every comparison goes
through `sameKey()`. The SDK's own `wallet-sdk-address-format` would do it too,
but it depends on `ledger-v8` — 11 MB of WASM for what is a base32 decode.

### Each employer sees only their own contract

The payroll page shows an employer the instance **their key controls**, and
nothing else. That filter is not cosmetic and does not come from
`deployment.json`: ownership lives on chain, so each contract is read and asked
who its employer is. An operator additionally sees instances they deployed,
labelled as such.

Verified on the devnet with three instances and three keys (with hex keys —
see the note above on why the browser path needs decoding first):

| Key                    | Sees  | As employer                          |
| ---------------------- | ----- | ------------------------------------ |
| platform (deployer)    | 3 / 3 | none — deploying is not owning        |
| employer A             | 2 / 3 | `acme`, `polis-pilot`                 |
| employer B             | 1 / 3 | `selfserve-demo`                      |
| an unrelated key       | 0 / 3 | none                                  |

### Self-service onboarding (demo only)

```bash
npm run demo:server     # ⚠️ holds the platform key, no auth, localhost only
```

With it running, `/register` gains a **Create my payroll contract** button that
deploys an instance and assigns the employer in one step. The service refuses to
bind anywhere but `127.0.0.1`, runs one onboarding at a time (concurrent deploys
would race for the same wallet coins), and streams its progress.

Onboarding takes minutes — far longer than an HTTP request should stay open — so
it returns a job id the page polls, showing the log as it arrives. A button that
sits silent for three minutes reads as broken.

**This is a demo convenience and nothing more.** The service will deploy a
contract and spend fees for anyone who can reach it. In production the same
`onboardEmployer()` function belongs behind authentication, with a human
approving a company before any contract is deployed. The CLI (`npm run onboard`)
and the service share that function, so a self-onboarded employer is identical
to one onboarded by hand.

### Registration does not create anything

There is no "create an employer address" step, and there cannot be one. The
employer's keys already exist inside their wallet, and the platform must never
see the private half — otherwise "only this employer can write to this contract"
means nothing, because the operator could write too.

Registration is the employer connecting their own wallet and handing over three
**public** values: the coin public key (names them inside the circuit), the
encryption public key (lets shielded pEUR reach them), and the unshielded address
(where fee tokens go). `/register` shows all three with a single copy button.

The operator then runs `npm run onboard` with the coin public key. An employer
also needs **tDUST** before they can submit anything: the contract is theirs, but
transactions still cost fees.

#### The coin public key is not the unshielded address

`assignEmployer` takes a `ZswapCoinPublicKey` — 64 hex characters. A Midnight
wallet exposes two Bech32m addresses and only one of them contains that key:

| Address                    | Decodes to                                          |
| -------------------------- | --------------------------------------------------- |
| `mn_shield-addr_preview1…` | 64 bytes: **coin public key** ‖ encryption public key |
| `mn_addr_preview1…`        | 32 bytes: the unshielded (fee-token) key             |

The coin public key is the **first 32 bytes of the shielded address**. The
unshielded address is a different key entirely — it is not a truncation, not an
encoding variant, and no conversion exists between them.

This matters more than a format note suggests, because `assignEmployer` is
one-shot and unconditional. Assigning a value no wallet can produce as
`ownPublicKey()` permanently strands the instance: the assert can never pass
again, the platform cannot reassign, and the only remedy is a redeploy. Verify
before assigning — decode the employer's shielded address and confirm its first
32 bytes match the key they sent you, or read the key straight off their
`/register` page or CLI header.

Wallet state lives in a `WalletProvider` context (`src/wallet/WalletContext.tsx`):
detection, connect, the connected API, the account snapshot, and refresh. Switching
network drops the connection, because balances and addresses are network-scoped and
a stale connection would keep showing figures from the network you just left.

Long values are middle-truncated with the full string on hover and a **Copy**
button, since these are values you exchange with other people rather than read.

Balances are shown in **raw ledger units with digit grouping**, not scaled into
display decimals. tDUST is denominated in STARs and fees in SPECKs; inventing a
decimal conversion that the SDK does not define would produce confidently wrong
numbers. pEUR is the exception and is formatted properly, because its minor units
are defined by our own contract to six decimals.

Wallets inject themselves into `window.midnight` under arbitrary keys, so the
app enumerates that object rather than looking for a known name, and keeps
polling briefly because an extension may inject *after* page load. Wallet-supplied
names and icons are attacker-controlled, so names are rendered as text nodes and
icons only as `img` sources, never as markup.

`npm run frontend:config` writes `frontend/public/deployments.json` from
`deployment.json`, reads pEUR's `tokenId` off the contract through the indexer,
and **copies the generated contract modules** into `frontend/src/generated/`. It
needs no wallet or keys — public state only — so it is safe in CI. Re-run it
after any deploy or recompile.

### Reading contract state in the browser

The pages show live on-chain state: payroll's employer, headcount, total and
commitments; pEUR's issuer, token type, supply and mint count. No wallet is
needed for any of it — public state is public — so those pages render before you
connect, and the wallet only adds *your* balance and *your* role.

Three things make this work:

**Only the runtime, not the ledger.** `@midnight-ntwrk/compact-runtime`
re-exports `ContractState`, `ChargedState` and `StateValue` from
`onchain-runtime-v3`, so state can be deserialized with a 1.4 MB WASM module
instead of pulling in `ledger-v8` (11 MB). The indexer is queried with plain
`fetch` — it sends `access-control-allow-origin: *` — which also avoids Apollo,
`graphql-ws` and their dependencies.

**One copy of the runtime WASM.** The generated contract module is *copied* into
the frontend rather than imported across the package boundary. Imported in place,
it would resolve `@midnight-ntwrk/compact-runtime` from the root `node_modules`
while the app resolves its own, giving two copies of the WASM — and decoding then
fails with `expected instance of ChargedState`, the same class-identity trap as
`expected instance of StateValue` in the CLI. `frontend/package.json` also pins
`onchain-runtime-v3` through `overrides` for the same reason.

**WASM in Vite.** The runtime ships wasm-bindgen's bundler target, which imports
the `.wasm` directly and initialises with top-level await. That needs
`vite-plugin-wasm`, `build.target: "esnext"` (browsers support top-level await
natively, so no transform plugin is needed — and `vite-plugin-top-level-await`
fails on this module anyway), and `optimizeDeps.exclude` for both runtime
packages, since esbuild's pre-bundling cannot handle the wasm import.

Contract modules load through a dynamic `import()`, so the WASM is a separate
chunk — 412 kB gzipped, fetched only when a contract page is opened. The initial
bundle stays at ~88 kB gzipped.

Writes are still CLI-only: submitting a transaction means proving it. The
connector API can delegate proving to the wallet, which is the path to take when
these pages grow write support.

## The service

A small Express app (`src/server/`) that exists for the three jobs a browser
cannot do: hold the platform wallet's seed, hold the two treasury seeds, and
read `fund-pool.json`. Everything else the app does happens in the page.

```bash
npm run server        # build, then serve on :8787
```

`config.ts` refuses to bind anywhere but loopback without `PLATFORM_API_TOKEN`,
so a local service needs no token and a hosted one cannot start without a real
guard. `/api/health` publishes which case it is in, and the UI hides the token
field when there is nothing to send.

### Routes

| Route                        | Guard             | Does                                            |
| ---------------------------- | ----------------- | ----------------------------------------------- |
| `GET  /api/health`           | none              | network, and whether a token is required        |
| `GET  /api/deployments`      | none              | the merged address book                         |
| `GET  /api/job/:id`          | none              | progress for a long-running job                 |
| `POST /api/onboard`          | signup limit      | assigns the payroll contract to an employer     |
| `POST /api/claim`            | signup limit      | the once-only employer starter allowance        |
| `POST /api/relay`            | work limit        | builds a period's claim bundles, optionally publishes |
| `GET/POST /api/claim-keys`   | work limit (POST) | employees publish a claim-key hash; employers read it |
| `GET/POST /api/sealed-roster`| work limit (POST) | the employer's roster, sealed under their passphrase |
| `GET  /api/registrations`    | none              | the registry of onboarded companies             |
| `POST /api/platform/*`       | platform token    | treasuries, fund deposits, mint, faucet, reset  |

**Two rate-limit buckets, because the risks differ.** `signupLimit` (3/hour,
`SIGNUP_LIMIT_PER_HOUR`) covers what spends the *platform's* money — a deploy, a
mint. `workLimit` (30/hour, `WORK_LIMIT_PER_HOUR`) covers work an employer
legitimately repeats: a relay run verifies every opening against the chain and
refuses what does not match, publishing is permissionless anyway, and the other
two write one row. Sharing one bound made a bundle rebuild after a failed claim
answer "try again in 34 minutes" — a limit protecting nothing, applied to the
recovery path for the failure it was blocking.

### What the database holds

Postgres, via `DATABASE_URL`. Every table is created by `initSchema()` on first
write rather than by a migration step, so a fresh machine needs no setup command.

| Table               | Written by                     | Contents                                        |
| ------------------- | ------------------------------ | ----------------------------------------------- |
| `registrations`     | onboarding                     | company name, instance, contract, employer key   |
| `claim_key_hashes`  | employee, on *Send to my employer* | network, **hex** coin public key, claim-key hash |
| `sealed_rosters`    | employer, on filing a period   | network, contract, **AES-GCM ciphertext**        |

**`claim_key_hashes` is inert.** It stores `persistentHash(claimKey)` over 32
random bytes: not reversible, no dictionary to guess against, and no route to a
payment — `claim` binds to `ownPublicKey()` separately. It removes a courier step
that was failing in practice, since an employee who never sent their hash cannot
be helped after the write-once attestation exists. It is a **suggestion**: the
employer's field is pre-filled and stays editable, and the employee is shown what
the service holds for them while a mismatch can still be fixed. It carries no
contract address, so it says "this key has a benefit key", never "this key works
for X".

**`sealed_rosters` the service cannot read.** A plaintext roster would rebuild
the employment map the whole design avoids — the chain stores
`payeeHash(coinPublicKey, period, instance)` and never the key, precisely so
nobody can enumerate who works where. Storing that in the platform's database,
where nobody would think to look, is arguably worse than publishing it. So what
is stored is ciphertext under a key derived from the payroll passphrase, with a
domain separator so it is not the openings' sealing key. **Names and public keys
only — never salaries**, so the worst case if the sealing were broken is "who
works here" and not "and what they earn".

Both writes are unauthenticated, and that is stated in the routes rather than
left implicit. Nothing stored is a secret or a capability. What an open write
*can* do is publish under someone else's key, or replace a blob with junk — a
wrong suggestion an employer can overwrite and an employee can spot, and a
convenience lost rather than data. That is the honest trade for a demo with no
employer login, and the mitigations are the editable field and the
employee-visible mismatch check, not a login this app has no way to issue.

### Why the server builds from its own tsconfig

`tsconfig.server.json` exists because the server and the CLIs have different
module resolution needs from the frontend, and one config that satisfied both
satisfied neither. `npm run build:server` compiles only what the service needs.

### `DATA_DIR`

Three files are written at run time and are not source: `deployment.json`,
`.onboarded-keys.json` and the wallet's sync position — plus `claims.json`, which
bounds a public route. All four resolve through `dataDir()`, so a managed host
can point them at storage that outlives a deploy.

Unset, it is the working directory and every local workflow behaves as before.
On a managed host it must be set, or a push replaces the code directory and takes
`deployment.json` with it — the contract stays on chain, permanently bound to its
employer, and nothing left anywhere knows its address. `assignEmployer` cannot be
repeated, so that is not recoverable by redeploying.

⚠️ **`deployment.json` overrides the `.env` baseline.** A stale record on a
persistent disk silently outranks a corrected environment variable; the service
logs a warning naming both addresses, which is the only signal. See
[Known sharp edges](#known-sharp-edges).

## Pilot flow

Three steps, all verified end to end on the local devnet.

### 1. Onboard an employer

The employer sends you their **coin public key** (they read it off `npm run payroll`
or the frontend). One command deploys their instance and hands it to them:

```bash
INSTANCE=acme EMPLOYER_KEY=<64 hex> npm run onboard
```

Two transactions — assignment is a circuit call and cannot happen in a constructor
— but doing both here means an instance is never left deployed and unowned, which
is the window in which the wrong party could be assigned. Assignment is permanent.

### 2. Fund the employer with pEUR

```bash
npm run peur     # option 3: Send pEUR to someone else
```

Needs **both** of the employer's keys: the coin public key identifies them inside
the circuit, and the encryption public key is what the coin ciphertext is
encrypted to. Supply only the first and the coin is created but the recipient's
wallet can never detect it. This is why `mintTo` exists alongside `mint`, and why
the CLI builds the call with `submitCallTx` — the `callTx` shorthand cannot carry
the `additionalCoinEncPublicKeyMappings` that make the coin findable.

### 3. The employer uploads a roster

```bash
npm run roster:template     # writes roster-template.xlsx
```

The workbook carries the **period** above the table, then one row per employee
— **two** of them, matching `ROSTER_SIZE` and the contract's vector lengths:

```
1  Payroll period   Year   2026
2                   Month  8
3
4  Full name | Address | Monthly gross salary
5+ one row per employee (two, at ROSTER_SIZE = 2)
```

The period lives in the file rather than being typed at submit time because it
is a property of the file: the same spreadsheet re-opened months later still
means the month it was prepared for. Typing it separately is how March's
salaries end up filed under June. Excel-side validation rejects a year outside
2000–2999 and a month outside 1–12, so a typo is caught before ten proofs have
been generated for it.

Both cells are located by **label**, and the employee table by its `Full name`
header, rather than by fixed row numbers — inserting a title row above them
shifts nothing. A roster saved from the older single-table template still loads
its ten employees; it reports the missing period as a problem rather than
guessing a month.

Amounts accept `3500`, `3500.00`, `3,500.00` or `€3.500,00` — a payroll file
that silently loses cents is worse than one that refuses to load. Numeric and
text cells land on the same minor unit; they did not always, and a salary that
parsed differently depending on how Excel happened to store the cell was off by
a factor of 10,000.

Upload it in the browser (`/payroll`) to check it and submit it: parsing happens
**in the page**, so the file is never uploaded anywhere, and the preview shows
exactly which figure becomes public before the Submit button does anything.

#### Submitting from the browser is usually the only option

`setPayroll` asserts `ownPublicKey() == employer`. The CLI signs with whatever
is in `.env` — the platform's wallet — so it can only file payroll for an
employer who is also the operator. Every other employer holds their key in a
browser wallet, and must submit from the page.

Three parties do the work and none of them sees everything: the proof server on
localhost proves the circuit and never learns which wallet is submitting; the
wallet balances, signs, and submits and never sees the salaries; the page holds
the salaries and forgets them on navigation. There is deliberately no hosted
proof server — proving takes the salaries as input, so a remote prover would be
handed exactly the figures this design keeps off chain.

Proving needs the compiled prover key and ZKIR, which a browser cannot read off
disk, so `npm run frontend:config` copies `contracts/managed/<name>/{keys,zkir}`
into `frontend/public/zk/`. That directory is gitignored: it is a build
artifact, and `setPayroll.prover` alone is about 10 MB.

The CLI route still works when the operator is the employer:

```bash
INSTANCE=acme npm run payroll    # option 3: Set payroll from roster.xlsx
```

The menu:

| # | Does                                                            |
| - | ---------------------------------------------------------------- |
| 1 | show status — every period filed, newest first                    |
| 2 | assign employer (platform, once)                                  |
| 3 | set payroll from a roster .xlsx                                   |
| 4 | verify a commitment against the chain                             |
| 5 | transfer employer rights (employer)                               |
| 6 | **recover openings from chain** — rebuild the secrets file        |
| 7 | exit                                                              |

Only the salaries enter the circuit, and only the total and ten commitments are
published. **Names and addresses never reach a transaction** — they are read,
shown for confirmation, and dropped.

A verified run: ten employees totalling 41,771.50, of which the chain learned —
for that period alone — `employeeCountFor 10`, the total, ten opaque
commitments, and ten sealed openings.

### Recompiling does not reach a running process

`npm run compile` rewrites `contracts/managed/`, but **nothing already running
picks that up**. A compiled contract reaches a process exactly once, and there
are two independent copies to think about:

| Holder                    | Refreshed by                        |
| ------------------------- | ------------------------------------ |
| `frontend/src/generated/` | `npm run frontend:config`            |
| a long-running Node process | restarting it                      |

The second is the one that bites hardest, because it fails silently and on
chain. `dist/demo-server.js` imports the contract module at startup and Node
caches ES module imports for the life of the process, so a demo server started
before a recompile keeps serving the **old** `Contract` class — old initial
ledger state, old verifier keys. It will happily deploy that old contract hours
later, and the deployment looks entirely successful. The mismatch only surfaces
when something tries to read the new fields off it:

```
CompactError: attempted to take size, only map, array, and bmt are supported
```

That is a `Uint` sitting where a `Set` was expected — the signature of state
written by a contract from a different version of the source.

**After every `npm run compile`, restart anything long-running**: `demo:server`,
and the Vite dev server if `frontend:config` re-copied the module underneath it.
Deployments made in between have to be thrown away; there is no migrating them.

### The frontend's contract module is a copy

`frontend/src/generated/` holds a **copy** of the compiled contract module,
placed there by `npm run frontend:config`. It does not update when
`npm run compile` runs. A recompiled contract plus a stale copy means the browser
decodes ledger state with the old shape, which surfaces as a blank page rather
than an error.

`npm run frontend` regenerates it first, so a normal start stays in sync. Running
`npm --prefix frontend run dev` directly skips that step.

### 4. End employment, and claim

Once a period is filed, the benefit half runs without the period being funded or
paid at all — `claim` opens `commitmentsFor` and `payeeFor` and checks the
termination; it never looks at `fundedFor` or `paidFor`.

```bash
# platform, once per fund
npm run deploy:fund
npm run fund -- params --version 1 --cap 4000 --rate 7000 --min-months 1
npm run fund -- deposit --amount 200
```

Then, in order and each by the party that must do it:

1. **Employee** — `/employee` → **Your claim key** → *Create my claim key* → keep the file, copy the hash.
   Also **View my payroll keys**, which is what the roster needs.
2. **Employer** — `/employer/payroll` → **End employment** → look the employee up
   by coin public key, paste her claim-key hash and the payroll passphrase.
   Download the opening into `terminations/`.
3. **Employer** — **Get payslips** for that period and send the employee hers.
4. **Relay** — `npm run relay -- <period> --publish`.
5. **Employee** — `/claim` → her bundle from `claims/<period>/`, her payslip, her
   passphrase → **Claim my benefit**.
6. **Operator** — `npm run fund -- reconcile --value <EUR>` to recover the change
   coin the claim left behind, so the pool stays spendable.

Step 6 is not optional bookkeeping. Until it runs, the fund's remaining balance
is a coin whose nonce exists nowhere.

## What an employer does

Rewritten for the flow as it now stands.

### Once

1. **Connect the company signing key** on Settings, and register. The platform
   assigns the payroll contract to that key; after that it cannot write payroll
   to it.
2. **Choose a payroll passphrase.** It derives every nonce and unlocks every
   sealed opening for this contract. It is never sent anywhere and **cannot be
   reset** — a forgotten one means payslips that can never be recovered.
3. **Collect two public keys per employee** — coin public key and encryption
   public key. Both, every time: with only the first, a payment succeeds, the
   contract marks the slot paid, and the wallet can never find the coin.
4. **Collect a claim-key hash per employee.** They create it on their own
   Employee page and press *Send to my employer*, which publishes the hash to the
   service; the Employees table then shows ✓ Collected. It can still be pasted by
   hand. This must happen **before** anyone is dismissed.

### Every month

On **Payroll**: load the workbook, enter the passphrase, and press
**Run payroll for &lt;month&gt;**. That is one action covering three stages:

```
✓ Payroll filed  →  ✓ Employees paid  →  ✓ Tax & contributions remitted
```

The waits between them are **not cosmetic**. `fundAndPayPeriod` reads
`commitmentsFor` and checks each opening against it, so a filing that has been
submitted but not indexed reads as a period that was never filed. Paying spends
coins funding just created, and a coin cannot be spent until its commitment has a
position in the Zswap tree. Remitting spends the pools `fundPeriod` filled. Each
hop needs the previous one **visible on chain**, not merely submitted — so the
sequence is forced by the ledger, and what the orchestration changes is who has
to know that.

Each stage is a separate wallet signature and proves for minutes. The page holds
a `beforeunload` guard and shows a pulsing indicator with elapsed time, because a
closed tab abandons a month part way through.

If a run fails, the individual step controls open automatically — a half-finished
month is recovered by performing the stage that failed, and the run resumes from
what the chain shows rather than repeating anything that landed.

Then **send the payslips**. Nothing on chain records that a file reached a
person, so that step never ticks itself.

### When someone leaves

On **Employees** → their row → **Manage** → **End employment**. Pick the final
month and sign. One action covers three technical acts:

```
✓ Termination record created
✓ Claim data prepared
✓ September 2026 claim root published
```

The relay runs from the opening already in memory — the download-and-re-upload
round trip existed only because two panels could not talk to each other. You get
the **claim bundle** to hand over, and the opening as a backup.

**Rebuild their claim bundle** stays available on the row whenever a termination
exists, not only after a failure: a bundle goes stale when the fund coin it names
is spent by an earlier claimant, and that is not a failure of anything.

## What an employee does


### When hired

1. **Connect a wallet** on `/employee` and send the employer **both** public keys.
2. **Create a benefit key** on `/employee/benefit`. One press produces two things
   with opposite destinations:

   - 🔒 **A file to keep.** Store it where you keep your wallet's recovery
     phrase. Nobody can reissue it.
   - ↗ **A hash to send your employer.** Public and safe; press *Send to my
     employer* or copy it.

   Do this **while still employed**. The employer writes the hash into a
   write-once statement, so a key made afterwards is one no claim can use.

### While employed

Pay arrives as a shielded transfer; the payslip arrives out of band. Check it on
`/employee` — the page verifies it against the commitment the employer filed and
confirms the period was filed for the connected wallet.

⚠️ **Keep every payslip.** The openings on chain are sealed under the
*employer's* key, so only they can produce one again — and without the payslip
for the final period there is no claim at all.

### Claiming

`/employee/benefit` needs three files, and the split is the architecture:

| File          | From          | If it goes astray                                        |
| ------------- | ------------- | -------------------------------------------------------- |
| Claim bundle  | the relay     | names your employer, final month and months worked, and carries a fund coin someone could spend first |
| Payslip       | your employer | your actual salary                                        |
| Claim key     | only you      | not your benefit — claiming needs your wallet too — but which months you claimed |

**None of the three lets anybody take the benefit.** `claim` binds separately to
`ownPublicKey()`. What they cost is privacy, plus one nuisance the bundle can
cause. Saying "keep this secret or someone will claim with it" would be a false
reason for a true instruction, and it collapses the moment somebody reads the
contract.

## What is private, and what is not

Everything below was verified on preview, not inferred from documentation. Where
something is unproven it says so.

### On chain

| | Visible to anyone | Why |
| --- | --- | --- |
| Period filed (`202608`) | **yes** | it is the ledger key |
| Employee count | **yes** | `employeeCountFor` |
| Total payroll for a period | **yes** | `totalPayrollFor` — this is the dashboard figure |
| Which slots are funded / paid | **yes** | `fundedFor`, `paidFor` |
| The employer's key | **yes** | `employer` |
| **Individual salaries** | no | only `persistentHash(salary, nonce)` |
| **Amounts moved when paying** | no | shielded coins |
| **Who each employee is** | no | `payeeFor` stores a hash of the coin public key |
| **The openings** | no | sealed under the employer's key |
| A termination happened, for some slot | **yes** | `terminationFor` has a key per terminated slot |
| **Months worked, and the claim-key hash** | no | committed inside the attestation |
| Which periods have a claim tree | **yes** | `rootFor` |
| How many claims have settled | **yes** | `claimsPaid` — a count, never an amount |
| One spent nullifier per claim | **yes** | opaque; the image of a secret, linked to nobody |
| **Who claimed, and for how much** | no | the benefit is a shielded coin |
| **The fund's balance** | no | a shielded coin, so the fund is *not* publicly solvent |
| Tax and contribution withheld from benefits, in total | **yes** | `taxPool`/`taxRemitted` — deliberate, and it discloses aggregate outflow |
| **Which claim withheld what** | no | only the running totals move |

The public total is deliberate and useful: an auditor can check what a company
paid in a month without learning what anyone earns.

The fund's opposite is deliberate too, and costs something real. It publishes
**counts, not amounts**, and its balance is a shielded coin — so it cannot
demonstrate solvency publicly. That cannot be fixed without also revealing
individual benefits: successive balances would give away the differences between
them. The Claim page says so rather than implying an audit that is not possible.

### Contract-held coins are private — with a condition

A contract can hold and pay out shielded pEUR without publishing the amounts,
but only if it is written to refuse to remember them. Verified with a throwaway
`vault` contract: deposited 2.0 pEUR, then searched the whole serialized state.

```
balance map: 0 entries          <- ContractState.balance stays empty for shielded coins
deposits: 1                     <- the receive happened
serialized state: 4500 bytes
contains 2000000?  BE:false  LE:false
```

Store the coin in the ledger instead — the obvious design, since it lets the
contract track its own balance — and the generated ledger type is:

```ts
readonly held: { nonce: Uint8Array, color: Uint8Array,
                 value: bigint, mt_index: bigint };
```

`value` in cleartext, readable by anyone. So the privacy is a construction you
choose and keep choosing: the coin must stay a **witness argument** on every
call, never ledger state.

The cost is that the contract does not know what it holds, so the caller must
rebuild each coin from `nonce`, `color`, `value` and `mt_index`. The first three
are derived; `mt_index` comes from the indexer:

```
queryZSwapAndContractState(addr) -> zswap.filter(addr)
coin_coms: MerkleTree { 31757: (70db1d7c…, Some(ContractAddress(3fe1db34…))) }
```

⚠️ That view lists every coin the contract ever **received**, including ones it
has since spent — there is no unspent view, and `nullifiers` reads empty. Do not
treat it as a list of available coins.

## Where proving happens

Proving needs the prover key and ZKIR that `compact compile` produced, and it
takes the salaries as input — so there is deliberately no hosted prover. It runs
on the operator's own machine either way.

| | Browser | CLI / local service |
| --- | --- | --- |
| Who signs | the employer's wallet extension | whatever is in `.env` |
| Works for any employer | yes | only when employer == operator |
| Circuits without coin operations (`setPayroll`) | **works** | works |
| Circuits with coin operations (`fundEmployee`, `payEmployee`) | **works** | works |
| The benefit claim (`claim`) | **works** — proved in the claimant's own page | n/a: needs the payee's key, which the CLI does not hold |
| Salaries leave the machine | no | no (localhost only) |
| Prover key delivery | fetched from `public/zk` (10 MB+) | read from disk |

### Proving coin circuits in the browser

This works, and getting there took removing four divergences from the documented
browser-provider pattern. For a long stretch `fundEmployee` and `payEmployee`
were rejected by the proof server with a `400` returned in about 4 ms — the
request refused at parsing, before any proving — while the same circuits proved
fine from Node against the same server.

A proof-server `400` is `WorkError::BadInput`: **a malformed or undeserializable
binary body**. `POST /prove` takes a `tagged_serialize`d tuple of
`(ProofPreimageVersioned, Option<ProvingKeyMaterial>, Option<Fr>)`, and a
transaction with coin operations sends several prove requests — one for the
contract circuit carrying our key material, plus one per zswap input and output
with `None`, proven against keys the server fetches from `srs.midnight.network`
at startup.

What fixed it was aligning with the reference implementation in the
`midnight-dapp-dev` plugin rather than continuing to reason from first
principles:

| Divergence | What it should be |
| --- | --- |
| Connector keys converted to hex | **Passed through as Bech32m.** The connector returns `mn_shield-cpk_…`; the reference does not convert, and `getCoinPublicKey`/`getEncryptionPublicKey` are only read when a transaction creates coin outputs — which is exactly why `setPayroll` was never affected |
| Hand-rolled `FetchZkConfigProvider` | The official `@midnight-ntwrk/midnight-js-fetch-zk-config-provider`, given `<origin>/zk/<contract>` |
| Network id and endpoints from a local table | `await api.getConfiguration()`, so the transaction is built for the network the wallet actually has selected |
| Private state provider with 9 of 13 methods | All 13; the export/import four throw, since an ephemeral store has nothing to export |

The hex conversion was the instructive one: it was added as a *fix*, on the
reasoning that the ledger works in hex, and it was wrong. `keys.ts` documents
that the connector speaks Bech32m — which is true, and which is why comparisons
against on-chain state must convert. Provider getters are not comparisons.

⚠️ Two things that cost hours and produced nothing: a `RUST_LOG=debug` proof
server left running (it logs nothing useful about a rejected request and makes
every subsequent proof slower), and several confident diagnoses from symptoms.
Every one of them was wrong. See **Decoding node and proof-server errors**.

### The local service, and what it can see

`npm run demo:server` exposes `POST /api/payroll/run`, which the page's **Fund
and pay** button calls when **Prove in this browser** is unticked. It signs with
the `.env` wallet, so it only works where the employer is the operator.

It is no longer the only route — the browser proves coin circuits now, and that
is the better path: the employer signs with their own key and nothing leaves the
page. The service remains useful when the employer's key is not available to the
page at all, such as an operator running payroll on someone's behalf.

What it receives is one period's derived material — amounts, nonces, and the
employees' **public** keys. It does **not** receive the payroll passphrase:

| | passphrase sent | derived material sent |
| --- | --- | --- |
| This month's amounts | visible | visible |
| Other periods' commitments | can open | **cannot** |
| Employees' spending keys | has them | **no** |

That matters because the passphrase derives every nonce for every period and
every employee keypair. Sending it would make a compromised service able to read
and spend everything, forever.

This is still the one step where the roster leaves the browser, even if only as
far as `127.0.0.1`.

## Funding and paying

Funding and payment are separate transactions, and that is forced rather than
chosen: `sendShielded` needs a coin's `mt_index`, and a coin received in the same
transaction does not have one yet. A contract cannot receive and forward
atomically.

**Funding adds coins; paying spends them.** Adds commute, so ten funding
transactions are independent. Ten slots funded as ten transactions worked; the
payments then succeeded four times and failed on the fifth with
`Invalid Transaction: Custom error: 170`, reproducibly at the same slot.

That code decodes — via the `midnight-status-codes` plugin — as
**`InvalidDustSpendProof`: the dust spend proof is invalid**, fixed by
regenerating it. It is a **fee** problem, not a contract-coin problem: DUST pays
fees, and firing transactions back to back leaves the wallet's DUST spend proof
stale.

⚠️ An earlier version of this file explained 170 as contract-coin sequencing —
each payment invalidating the view the next was built against. That was wrong,
and it survived because the symptom fits both stories. It also explains why a
"wait for the paid flag" fix changed nothing: it waited on the *contract's*
state when the stale thing was the *wallet's DUST*. **Look the code up before
theorising.**

`payPeriod` batches all ten sends into one transaction, and **this is the one to
use**. One transaction needs one DUST spend proof instead of ten, so the failure
above does not arise. Verified end to end:

```
STEP 1  setPayroll 202608     filed
STEP 2  funding 10 slots      funded 1..10/10
STEP 3  payPeriod             OK in 90s

RESULT paid 202608: 1111111111
```

Ten employees paid in a single transaction, 90 seconds of proving. The prover
key is **73 MB** against 9 MB for a single payment, but the wall-clock cost is
lower than ten sequential payments — and those do not complete anyway.

It also removes a leak, independently of the bug: ten payments publish ten
events showing which slot settled when, where one transaction settles the month
with no per-employee signal. The same argument that makes `setPayroll` a single
call.

Batching is all-or-nothing, which for payroll is the right failure mode — a
half-paid month is worse than one that failed cleanly and can be retried. The
single-slot `payEmployee` is retained for finishing months that are already
part-paid, since `payPeriod` asserts every slot is unpaid.

⚠️ Verifier keys are fixed at deploy, so adding a circuit needs a **redeploy** —
a contract deployed before `payPeriod` existed has no key for it and
`findDeployedContract` refuses with `circuitIds: ['payPeriod']`.

### Cost: eleven proofs, not one

Filing a period is one transaction and one proof. Funding and paying is eleven:
ten `fundEmployee` transactions, one per employee, then a single `payPeriod`.

| | Transactions | Prover key |
| --- | --- | --- |
| `setPayroll` | 1 | 9.5 MB |
| `fundEmployee` | 10 | 5.0 MB each |
| `payPeriod` | 1 | 73.4 MB |

Prover key size tracks circuit complexity, not proving time: the 73 MB batch
proof takes about 90 seconds, while the ten small funding transactions dominate
the wall clock. Batching funding the way payment was batched would collapse
eleven transactions into two, and the same argument applies — adds commute, so
there is no correctness objection, only proof size.

⚠️ If proving suddenly gets slower, check the proof server is not still running
with `RUST_LOG=debug` from a debugging session. It logs nothing useful about a
rejected request and slows every proof after it.

### Finding the coin that funds a slot

The contract records it, because the caller cannot work it out. `sendShielded`
needs a coin's `mt_index`, and `filter(address)` lists every coin the contract
ever RECEIVED — spent ones included, with no unspent view and `nullifiers`
reading empty.

Two bugs came from trying to infer it instead, and both only appeared once a
contract had history:

- Counting leaf positions from zero paid an **earlier period's already-spent
  coins**, surfacing as `Public transcript input mismatch` while proving, then
  as `239 NullifierAlreadyPresent` under the `103` umbrella when submitting.
- Deriving the coin nonce from `(period, index)` alone meant re-filing a period
  and funding it again rebuilt the **identical coin** — same nonce, value and
  recipient, therefore the same commitment — which Zswap rejects as
  `240 CommitmentAlreadyPresent`, also surfacing as `103`.

Both are fixed in the ledger rather than in client heuristics:

```
fileRoundFor   period -> filings so far; part of the coin nonce, so a re-filed
                         period funds fresh coins that are still derivable
coinsReceived  running count of coins received
coinOrdinalFor period -> index -> which coin funds that slot
```

Coins enter the tree in creation order, so the n-th coin the contract received
is its n-th leaf, and the ordinal maps a slot straight to it. This publishes
ordering, which the leaf list already made public, and no value.

Verified with two periods paid on one contract: slots map to ordinals 0,1 and
2,3 respectively.

### Paying needs the recipient's encryption key

`payEmployee` sends to a coin public key, but a shielded coin can only be
*found* by someone whose encryption key the transaction was built with. Without
it the payment succeeds and the money is unreachable. The `callTx` shorthand
cannot carry the mapping, so payment uses `submitCallTx`:

```ts
additionalCoinEncPublicKeyMappings: new Map([[coinKey, encKey]])
```

The same requirement is documented on `peur.mintTo`.

## What is still custodial, and what is not

Employee keys are derived from the employer's passphrase, so no keys need
collecting and payment works today. It also means **whoever holds the passphrase
can spend every employee's salary**. Money moves to addresses the employer
controls.

That is defensible while the employer is holding the money anyway, and it stops
being defensible the moment it is described as employees being paid. What is
demonstrated is a working private payment rail, not employees in possession of
their wages.

The migration is per slot: when an employee supplies a real key it replaces the
derived one in the roster, and the next period pays the real one.

Running the *service* against an instance where the operator is also the
employer collapses this further — one wallet as operator, employer and every
employee. That is what `preview/payroll:probe` is, and it is fine for a demo as
long as nobody calls it employees being paid.

The browser route does not collapse those roles. In the verified run above the
employer signed with their own wallet extension and the platform could not have
filed, funded or paid on their behalf — the contract asserts it. **Employer and
operator are genuinely separate there.**

### The 2026-08-25 run was not custodial at all

Both employees held their own 1AM wallets, supplied their own coin and encryption
public keys into the roster, and one derived her own claim key from her own
passphrase and claimed with it. No key in that chain was derived from the
employer's passphrase.

`claim` makes that structural rather than a matter of good practice: it rebuilds
`payeeBinding` from `ownPublicKey()`, so a benefit can only be claimed by the
wallet payroll filed as payee. A custodial employee — one whose key the employer
derived — is one whose *employer* could claim her benefit. The derived-key
shortcut is therefore fine for demonstrating a payment rail and **not fine once
benefits are involved**.

What is still custodial: the seed-based test employees `npm run payee`
generates, and any roster still using employer-derived keys.

## Decoding node and proof-server errors

Midnight's failures arrive as bare numbers — `Invalid Transaction: Custom error:
170` — with no message. Two of them cost real debugging time here, and both were
diagnosed wrongly from the symptom before being looked up.

Install the lookup rather than guessing:

```bash
claude plugin marketplace add https://midnightntwrk.expert
claude plugin install midnight-status-codes@midnight-expert
```

(The docs also offer `curl -fsSL https://midnightntwrk.expert/install.sh | bash`.
The two commands above do the same thing without piping a remote script into a
shell.)

Codes met so far, each one diagnosed wrongly from the symptom first:

| Code | Name | What it actually meant here |
| --- | --- | --- |
| `170` | `InvalidDustSpendProof` | The **fee** proof went stale across rapid transactions — nothing to do with the contract's coins |
| `138` | `BalanceCheckOverspend` | A balance went negative **after fees**. Fees are paid in DUST: *raising NIGHT will not help*, and DUST registration is self-funding so it is not the cause |
| `400` (proof server) | `WorkError::BadInput` | Malformed or undeserializable binary body — the request never reached proving |

The `138` entry is worth reading in full before touching DUST registration: it
explicitly rules out both theories that seemed obvious at the time — that the
UTXO was already registered, and that more NIGHT was needed.

Other plugins in that marketplace cover the proof server API, dApp development,
the indexer, the node and wallets. Skills activate immediately; **slash commands
only appear after restarting Claude Code**.

`midnight-dapp-dev` is worth installing before writing any browser provider
code — its `dapp-connector/references/browser-providers.md` is the reference
that resolved the proving failure above, and every divergence from it turned out
to be a bug.

## Deployments and instances

`deployment.json` keys every deployment as `<networkId>/<contract>[:instance]`:

```
undeployed/payroll:acme
preview/payroll:blockstat-solutions-v5
preview/taxparams
preview/peur
```

`taxparams` has no instance suffix: there is one registry per network, shared by
every employer.

The network is part of the key because the same contract is routinely deployed
to the local devnet and to preview, and those are entirely different chains.
The instance suffix exists because one payroll contract is deployed per
employer, so the contract name alone is not unique. Each instance also gets its
own private state store and its own secrets file.

Older layouts — a single record at the top level, or network-less keys — are
re-keyed on read from each record's own `networkId`, so nothing is lost.

## Networks

| `MIDNIGHT_NETWORK` | Network id   | Wallet                                  |
| ------------------ | ------------ | --------------------------------------- |
| `local` (default)  | `undeployed` | pre-funded dev seed, no config needed   |
| `preview`          | `preview`    | funded wallet required                  |
| `preprod`          | `preprod`    | funded wallet required                  |

Set `MIDNIGHT_NETWORK` to match your wallet — the address prefix says which
network it is on (`mn_addr_preview1...` vs `mn_addr_preprod1...`). Funds do not
cross networks.

### Using a wallet you funded elsewhere

Browser wallets (Lace, IAM) export a **24-word recovery phrase**, never a raw
private key. Put it in `.env` as `WALLET_MNEMONIC` and the app derives the same
keys the wallet uses — BIP-39 to a master seed, then HD roles at account 0,
index 0, which is byte-for-byte what the Midnight SDK's own wallet builder does.

```bash
# .env — never commit this, never paste the phrase into a chat or an issue
MIDNIGHT_NETWORK=preview
WALLET_MNEMONIC="word1 word2 ... word24"
```

Then confirm it derived the wallet you meant:

```bash
npm run check-balance
```

It prints the unshielded address before touching the network. **That address
must equal the one your wallet app shows.** If it does not, the phrase is for a
different wallet or a different network — stop there rather than funding it.

If you have no funded wallet yet, run `npm run check-balance` anyway to get the
address, fund it at that network's faucet, and re-check. tNIGHT must be
registered for DUST generation before fees can be paid; a wallet that already
shows a DUST balance is registered.

### Sync is cached between runs

A first sync on a remote network replays the whole chain — on preview that is
~115k indices for the shielded and dust wallets, the dust wallet being the slow
one, and it takes roughly 20 minutes. Every command would otherwise pay that
again, so sync state is serialized to `.wallet-state/` (gitignored, mode 0600)
once the wallet reaches the tip, and later runs resume and fetch only the delta.
That turns a ~20 minute wait into ~3 seconds. Each run says which it did:

```
Syncing (resuming from cached state)...
Syncing (no cached state — this can take a while)...
```

The cache holds sync state, not keys, and is keyed by a hash of the master seed
and network — never the seed itself. It is only written after a sync completes,
so a cached state is always one that reached the tip. Drop it with
`npm run wallet:reset` if a chain is reset underneath it, for example after
`docker compose down -v` on the local devnet.

## Finding things on an explorer

Explorer links come from `EXPLORERS` in `frontend/src/lib/chain.ts`, keyed by
network id. A network with no entry renders addresses as plain text rather than
as dead links, on both the public page and the employer's setup page — a link
that goes nowhere in front of a reviewer is worse than no link. This note used
to live in the employer UI, which is a page no developer opens and every
employer does.


Searchable: **contract addresses** (64 hex chars) and **transaction hashes**
(64 hex chars). The CLIs print `Tx hash: ...` for exactly this reason — the
SDK's `txId` is a 66-character midnight-js identifier, *not* the chain hash, and
searching it returns nothing.

Not searchable: a **token type** such as pEUR's. It is a derived identifier, not
an object on chain, and shielded coins leave only commitments in the Zswap tree,
so there is no public per-token balance to look up. To confirm a token exists,
look at the issuing contract instead: its public ledger holds `tokenId`,
`totalSupply` and `issuer`, which `npm run peur` reads.

Confirm any deployment straight from the indexer:

```bash
curl -s -X POST -H 'content-type: application/json' \
  -d '{"query":"{ contractAction(address: \"<address>\") { address transaction { hash block { height } } } }"}' \
  https://indexer.preview.midnight.network/api/v4/graphql
```

## Deploying it

Two hosts, and they need different things.

### The service (Render)

Runs `node dist/server/index.js`. It must have:

| Variable | Why |
| --- | --- |
| `WALLET_MNEMONIC` or `WALLET_SEED` | the platform wallet |
| `TAX_TREASURY_SEED`, `SOCIAL_TREASURY_SEED` | the treasuries it spends |
| `PROOF_SERVER_URL` | **critical** — defaults to `127.0.0.1:6300`, which does not exist in a container, so every proving operation fails without it |
| `payroll_address`, `peur_address`, `taxparams_address`, `fund_address`, `taxvault_address` | `deployment.json` is gitignored, so on a fresh disk the env baseline is the **only** source of addresses |
| `DATA_DIR` | storage that outlives a deploy |
| `DATABASE_URL` | the registry, claim-key hashes and sealed rosters |
| `PLATFORM_API_TOKEN` | required to bind anywhere but loopback |
| `ALLOWED_ORIGINS` | must include the frontend's origin, or CORS blocks it |

`*_TREASURY_ENC_KEY` is **not** needed when the seeds are set —
`treasuryEncryptionKeys()` derives it. Set it instead on any machine that should
not hold the treasuries' spending keys.

`PAYROLL_CONTRACT` is a **pin**, not a source: it filters records that already
exist. Setting it without `payroll_address` yields no payroll contract at all.

### The frontend (Vercel)

Build-time substitution, so **adding a variable does nothing until you
redeploy** — an existing deployment keeps the old values baked into its bundle.

`VITE_NETWORK_ID`, `VITE_PAYROLL_ADDRESS`, `VITE_PEUR_ADDRESS`,
`VITE_PEUR_TOKEN_ID`, `VITE_TAXPARAMS_ADDRESS`, `VITE_FUND_ADDRESS`,
`VITE_TAXVAULT_ADDRESS`, `VITE_TAX_TREASURY_ENC_KEY`,
`VITE_SOCIAL_TREASURY_ENC_KEY`, and `VITE_API_BASE` pointing at the service.

⚠️ `loadStatic()` opens with `if (!networkId) return {}` — **without
`VITE_NETWORK_ID` the frontend resolves zero contracts** and every page reports
nothing deployed. Addresses used to come from a committed
`public/deployments.json`; that fetch was removed and the file is now dead
weight, so its presence is not reassurance.

Variables **without** the `VITE_` prefix are never exposed to client code. Four
of them (`MIDNIGHT_NETWORK`, `PROOF_SERVER_URL`, `CONTRACT_NAME`, `DEBUG_LEVEL`)
sat on the project doing nothing but looking like configuration.

## Toolchain versions

The compiler and the runtime must be a compatible pair. The compiler emits
JavaScript targeting a specific `@midnight-ntwrk/compact-runtime` version; if
the installed runtime differs, the contract module throws at import time:

```
CompactError: Version mismatch: compiled code expects 0.18.0-rc.1, runtime is 0.16.0
```

`npm run deploy` checks this up front and tells you to recompile rather than
failing deep inside deployment. To fix:

```bash
compact compile --version                # what you have
npm ls @midnight-ntwrk/compact-runtime   # what the repo needs
compact update <version>                 # install and set as default
npm run reset                            # recompile
```

This repo currently expects compiler **0.31.1** → runtime **0.16.0**.

`compact-runtime` is deliberately *not* a direct dependency — it arrives via
`@midnight-ntwrk/midnight-js-protocol`, so its version cannot drift from what
the protocol package expects.

## Dependency pinning

`@midnight-ntwrk` versions are pinned exactly, and `overrides` forces single
copies of `wallet-sdk` and `onchain-runtime-v3`. The runtime override matters:
two physical copies of the on-chain runtime WASM module produce two distinct
`StateValue` classes, and the first call transaction dies with

```
expected instance of StateValue
```

If you ever add or bump a `@midnight-ntwrk` dependency, run `npm dedupe` and
confirm there is exactly one copy:

```bash
find node_modules -path '*onchain-runtime-v3/package.json'
```

## Available scripts

| Script                   | Does                                              |
| ------------------------ | ------------------------------------------------- |
| `npm run env:up/down`    | local node + indexer                              |
| `npm run proof:up/down`  | standalone proof server on :6300                  |
| `npm run compile`        | compile every `contracts/*.compact`               |
| `npm run build`          | TypeScript → `dist/`                              |
| `npm run onboard`        | deploy a payroll instance and assign its employer  |
| `npm run server`         | the platform service on :8787                      |
| `npm run demo:server`    | ⚠️ demo-only self-service onboarding on :8787      |
| `npm run roster:template`| write roster-template.xlsx                        |
| `npm run deploy:payroll` | deploy a payroll instance (`INSTANCE=x`)          |
| `npm run deploy:tax`     | registry, v1, payroll, employer, rule window — in the one order that works |
| `npm run registry`       | inspect `taxparams`: versions, rates, `paramsHash` |
| `npm run payee`          | generate a keypair — used for the treasury keys   |
| `npm run test:bands`     | differential test: TypeScript bracket arithmetic vs the circuit's |
| `npm run payroll`        | assign employer, set payroll, verify, recover openings |
| `npm run deploy:peur`    | deploy pEUR, then mint the initial supply         |
| `npm run peur`           | pEUR status, mint, send to an employer            |
| `npm run check-balance`  | print address, sync wallet, show tNIGHT/tDUST     |
| `npm run reset`          | drop artifacts + `dist` and recompile             |
| `npm run clean`          | drop artifacts, `dist`, `deployment.json`         |
| `npm run wallet:reset`   | drop cached wallet sync state                     |
| `npm run frontend`       | generate config + serve the wallet UI on :5173     |
| `npm run frontend:build` | production build of the frontend                  |
| `npm run frontend:config`| copy contract module, ZK assets and addresses into `frontend/` — also available from inside `frontend/` as `npm run config` |
| `npm run validate`       | typecheck + compile                               |
| `npm run deploy:fund`    | deploy the unemployment fund                      |
| `npm run fund`           | fund status, params, deposit, pool, reconcile, remit — **flags need `--`** |
| `npm run test:benefit-tax`| the fund's band arithmetic against payroll's, and the schedule hash against the chain |
| `npm run terminate`      | end an employee's employment from the CLI         |
| `npm run relay`          | build a period's claim tree, optionally publish the root |
| `npm run test:payslip`   | payslip encode/decode and commitment round-trip   |
| `npm run test:tree`      | claim-tree paths fold to the root, and tampering does not |
| `npm run test`           | bands + payslip + tree                            |

`npm run deploy` is the generic form the two deploy scripts wrap; it takes
`CONTRACT_NAME` and `INSTANCE` from the environment.

## Project structure

```
midnight-polisZK/
├── compose.yml                    # local devnet: node + indexer
├── contracts/
│   ├── payroll.compact            # private salaries, public aggregate, terminations
│   ├── taxparams.compact          # versioned, append-only tax rules
│   ├── peur.compact               # shielded stablecoin
│   ├── fund.compact               # unemployment fund: rules, roots, nullifiers, pool
│   ├── taxvault.compact           # wage tax, under a frozen withdrawal authority
│   └── managed/                   # compiled artifacts, per contract (gitignored)
├── src/
│   ├── deploy.ts                  # deploys whichever CONTRACT_NAME names
│   ├── payroll-cli.ts             # payroll CLI
│   ├── peur-cli.ts                # pEUR CLI
│   ├── fund-cli.ts                # fund: status, params, deposit, pool, reconcile
│   ├── terminate-cli.ts           # end employment (CLI route)
│   ├── relay.ts                   # build + publish a period's claim tree
│   ├── check-balance.ts           # address + tNIGHT/tDUST
│   ├── server/                    # the platform service (Express)
│   │   ├── app.ts                 # routes: onboard, relay, claim-keys, sealed-roster, platform/*
│   │   ├── config.ts              # host/port/token rules, the two rate-limit buckets
│   │   └── guards.ts              # rate limiting, platform token, signup code
│   ├── providers/                 # midnight-js provider wiring
│   └── utils/
│       ├── benefit-params.ts      # the published rule sets — only their HASH is on chain
│       ├── claim-tree.ts          # the tree, hashed by the contract's own pure circuits
│       ├── fund-pool.ts           # coin nonces + change-nonce derivation
│       ├── peur.ts                # the pEUR token id, read off the contract
│       └── …                      # network config, wallet, contract, deployments
├── frontend/                      # wallet-connect UI (Vite + TypeScript)
│   ├── public/deployments.json    # generated by npm run frontend:config
│   └── src/
│       ├── wallet/WalletContext.tsx   # connect, account snapshot, refresh
│       ├── pages/                     # Public, Operator, EmployerPayroll/Employees/
│       │                              #   History/Settings, Employee, EmployeeBenefit
│       ├── components/                # DashHero, ClaimForm, ClaimKey, EndEmployment,
│       │                              #   EmployerTable, FundDeposit, NationalTotals, …
│       └── lib/                       # claim.ts, claimKey.ts, runMonth.ts, sealedRoster.ts,
│                                      #   publishedClaimKeys.ts, useRunGuard.ts, …
├── terminations/                  # employers' termination openings — input to the relay
├── claims/<period>/               # claim bundles the relay writes, one per claimant
├── .env                           # config (keep private!)
├── deployment.json                # addresses, keyed <network>/<contract>[:instance]
├── fund-pool.json                 # ⚠️ the ONLY copy of the fund's coin nonces (gitignored)
├── .wallet-state/                 # cached sync state (gitignored, 0600)
└── payroll-secrets.*.json         # local cache of openings, rebuildable from chain (gitignored, 0600)
```

## Verified end to end

Two periods, filed, funded and paid entirely from the browser, on `preview`,
with the employer's key held in a wallet extension rather than by the operator.

```
contract  225836c5205003d1681e7336127675322d352900d415e14835b12dc8cab807e1
employer  9e584bd4…                    (1AM wallet, not the platform)

period 202608   total=8050500000   funded=11  paid=11   round=0
  slot 0 -> coin ordinal 0      slot 1 -> coin ordinal 1
period 202609   total=8050500000   funded=11  paid=11   round=0
  slot 0 -> coin ordinal 2      slot 1 -> coin ordinal 3

salary 4200000000 present in public state?  false
salary 3850500000 present in public state?  false
```

Every claim this project makes, in one contract:

- **The aggregate is public.** 8,050.50 pEUR per period, readable by anyone.
- **The individual salaries are not.** Searched the serialized contract state
  for both figures; neither appears. Only commitments do.
- **Payment matched the commitment.** The circuit refuses any amount that does
  not open the commitment filed for that employee, so `paid=11` means each
  employee received exactly what was committed for them — verifiable without
  learning either amount.
- **The employer signed.** Not the platform. `setPayroll`, `fundEmployee` and
  `payPeriod` all assert `ownPublicKey() == employer`, and the key never left
  the wallet extension.
- **Nothing left the page.** Salaries, passphrase and proving all stayed in the
  browser; the local service was not involved.
- **A second period did not disturb the first.** Each slot spends the coin the
  contract recorded for it, so August's payment and September's are independent.
  This is the case that broke every earlier attempt.

### Tax and net pay, verified on chain

Preview, 2026-08-20. One registry, one payroll instance, one period.

```
taxparams  7feb657fb4a0541e3308d8fb14eca4538e6343d16f0a7540b620ed7547492910
           version 1 published — 35.75 / 37.56 / 49.50 %,
           thresholds 3,240.25 and 6,535.50 per month, contribution 3.00 %

payroll:blockstat-solutions-v5
           7fd5cddcef5c8945ce0b563dd6ceff0a71fdaeff9ac59339aec7b3656db89a7f
           employer assigned, period 202610 filed

period 202610   gross €560.00 = tax €200.20 + social €16.80 + net €343.00
taxPool €0.00   socialPool €0.00     (withholding not yet called)
```

Recomputing the same period offline from the gross figures alone reproduces
those totals exactly — the point of publishing the rules and the `paramsHash`
rather than only the result. The pools being zero is the honest reading of the
chain, not a failed decode: nothing has funded them yet.

Three payroll instances still in `deployment.json` predate the current contract.
The Public page counts them as unreadable and says so, rather than dropping them
and reporting a total that silently omits whatever they hold.

### Both proving routes work

Proofs can be generated by the local proof server or by the wallet, and the page
offers both. Measured on a two-employee roster, funding two slots and paying the
period in one transaction:

```
Funded 2, paid 2 employees — 159s, proved by the wallet
```

Delegated proving is reached through `api.getProvingProvider(...)`, adapted to
midnight-js with `createProofProvider`. It is the route the SDK is moving to:
`Configuration.proverServerUri` is deprecated in its favour.

**Feature-detect it.** Coverage varies — 1AM implements `getProvingProvider` and
proves in the tab with a WASM prover; Lace does not and requires a local proof
server at `localhost:6300`. The page checks `typeof api.getProvingProvider ===
"function"` and disables the option when it is absent, rather than offering a
choice that cannot work.

On privacy: proving consumes the witness, and here the witness is the salaries.
A wallet that proves in-tab keeps them on the machine; one that forwards to a
hosted prover does not, and which of those happens is the wallet's decision.
That makes it a privacy question before it is a performance one — worth
establishing for whichever wallet a deployment targets.

### A benefit claimed, end to end

Preview, 2026-08-25. One fund, one termination, one claim — every step signed by
the key that should sign it, and the claim proved in the claimant's own browser.

```
fund      8615dd7a691ab805874e089efdb10e8b0572cdc518387a662d8ea0baf6c356a6
          v1 published        tx a99421c5ce1505633ea4b277fc087254ee83fba8a929d75e67306cc28bbcd226
          €460 deposited      3 coins, nonces in fund-pool.json

payroll:blockstat-solutions-v6
          6220bb394fbb3c6c3a08fe85329de1f6bf78d6138781917975f0742c790b7a0a
          employer 9e584bd4…  (a browser wallet, NOT the platform)
          202601 filed, 2 employees

termination  slot 0, 1 month  tx 202f43bd649b5cc6ca96655ce502cfd192485b85a9bd16c3853cd4f02d272f1d
claim tree   root 52386831…  over 1 leaf
             published       tx 492b2178a3c8fa49e13fb371472dd5343c9bd6bf2a88eeb55ed741e97668c705

claim        €154.00 paid    tx aa50aa27e5003a…0074d0da36
             claimsPaid 1    pool moved to change coin #3
```

What that run establishes:

- **The claimant signed.** Not the platform, not the employer, not a relay. The
  wallet payroll filed as payee is the only key that can produce the
  `payeeBinding` the circuit rebuilds from `ownPublicKey()`.
- **The employer signed the termination**, from their own browser wallet, on an
  instance the platform cannot sign for.
- **The benefit is arithmetically pinned.** €220 gross × 70%, capped at €4,000 →
  €154.00. The witnessed quotient admits exactly one value, so no other figure
  would have proved.
- **The path was checked before publishing.** `pathRoot(path) == root` via the
  contract's own pure circuit, and `payeeHash` confirmed slot 0 was the employee
  it was supposed to be.
- **The change coin was recovered and verified.** `evolveChangeNonce` reproduced
  the on-chain commitment at leaf 42896 exactly — so the €96 remainder is
  spendable rather than stranded.

⚠️ **That run predates withholding.** €154 exceeded the employee's €134.75 net
pay — being dismissed paid better than working. The fund above (`8615dd7a…`) has
since been replaced by one that withholds tax and contribution from the benefit,
so the same claim now pays **€94.325**. The figures and hashes here are kept as
they were rather than restated, because they are what that contract actually did.

One gap remains and it is not the benefit's: the tax model has **no allowance**,
applying 35.75% + 3% from the first cent, so a €220 salary is taxed like a
mid-range one. That is a `tax-params.ts` question, not a contract one.

### Withholding, remitted and received

Preview, 2026-08-25, on the fund that withholds (`820815a1…`). The same claim as
above, run again after withholding existed — then both treasuries paid and
checked.

```
deposited                                    €300.00      coin #0

claim   benefit  €154.00
        − tax     €55.055
        − contrib  €4.62
        = paid    €94.325   to the claimant   tx aa50aa27…  (pre-withholding run: €154.00)

remit tax        €55.055   → 4b936412…       tx 43f90e25…
remit contrib     €4.62    → f2d0dd9e…       tx 1c9275f9…

remaining in the fund                        €146.00      coin #3, leaf 42904
```

€94.325 + €55.055 + €4.62 + €146.00 = **€300.00**. Every circuit in the system
has now been called at least once.

**The treasuries can see their coins**, which is the check that matters and not
the same thing as a green transaction hash:

```
tax treasury     55055000 minor units, leaf 42903
social treasury   4620000 minor units
```

Both change coins along the way were recovered with `fund reconcile`, each
verified against its on-chain commitment before being recorded. The command also
reports what the spend paid — €94.325, then €55.055, then €4.62 — derived from
the parent coin's value rather than supplied. Worth noticing that with a single
claimant the aggregate *is* the individual; with a handful of claims that
inference disappears.

### Remitting needed the recipient's encryption key — twice over

The first `remit` failed:

```
Unable to resolve encryption public key for recipient 4b936412…
```

`remit` used the `callTx` shorthand, which **cannot carry
`additionalCoinEncPublicKeyMappings`** — the same limitation that already forced
`payPeriod` through `submitCallTx`. A shielded coin can only be found by someone
whose encryption public key the transaction was built with, so the balancer
refused to build one it knew nobody could detect.

Fixed by routing through `submitCallTx` and resolving the treasuries' encryption
keys from the seeds already in `.env` — or from `TAX_TREASURY_ENC_KEY` /
`SOCIAL_TREASURY_ENC_KEY` on a machine that should not hold the treasuries'
spending keys.

⚠️ **`remitTax` and `remitSocial` in `payroll.compact` almost certainly have the
same defect.** They send to the same treasury keys, and they have never been
called — so nobody has hit it. It is a known bug waiting in the withholding
work, not a discovery for later.

And note how narrowly this was caught. The balancer refused *before* building,
which is luck rather than design: the note on `mintTo` describes the identical
missing mapping producing a coin that is created successfully and can never be
found. Checking that the recipient can actually **see** the coin is what
distinguishes those two outcomes, and it belongs in the loop.

### Roster size is two

`ROSTER_SIZE` is **2**, not ten. Compact vector lengths are compile-time
constants, so the size is written out in every `Vector<N, …>`, every `0..N`
loop, the sum in `setPayroll`, and `employeeCountFor` — changing it means
editing all of them, recompiling, and redeploying.

Two keeps the cycle short, and the cost is almost entirely in the roster size:

| | 10 employees | 2 employees |
| --- | --- | --- |
| `setPayroll` prover | 9.5 MB | 2.7 MB |
| `payPeriod` prover | 73.4 MB | 18.7 MB |
| Transactions to fund and pay | 11 | 3 |

Funding is one transaction per employee, so it dominates. Batching it the way
payment was batched would make that 2 regardless of roster size.

## Status at a glance

| Capability | State |
| --- | --- |
| Per-period commitments, salaries private | **working**, verified on chain |
| Sealed openings recoverable from chain | **working**, cross-verified Node ↔ browser |
| Filing payroll from the browser | **working** |
| Full cycle in the browser, employer's own key | **working** — filed, funded and paid; see **Verified end to end** |
| Contract holding shielded pEUR privately | **working**, verified byte level |
| Funding slots (one tx each) | **working** |
| Paying a whole period in one tx (`payPeriod`) | **working** — from CLI and from the browser |
| Paying slot by slot (`payEmployee`) | **retained but avoid** — fails part way with `170`; use `payPeriod` |
| Proving coin circuits in the browser | **working** — funding and payment both proved in the page |
| Wallet-delegated proving (`getProvingProvider`) | **working** — 2 funded, 2 paid, 159s |
| Several periods paid on one contract | **working** — coin ordinals map each slot to its own leaf |
| DUST sponsorship | **untested** — mechanism exists in the SDK; attempts failed with `138` |
| Employees holding their own keys | **working for wallet employees** — both employees in the 2026-08-25 run held their own 1AM wallets and supplied their own keys; the seed-based test employees the CLI generates are still custodial |
| Versioned tax rules (`taxparams`) | **working** — v1 published on preview, append-only |
| Tax and net pay computed in-circuit | **working** — bands pinned by witnessed quotients, verified on chain |
| Withholding into the contract's pools | **built, not wired** — `fundWithholding` compiles and is deployed; no UI calls it, so the pools read €0.00 |
| Remitting to the treasuries | **built, not wired** — same; `remitTax` / `remitSocial` are deployed and uncalled |
| Unemployment fund deployed and funded | **working** — €460 in, rule set v1 published |
| Ending employment | **working** — from the employer's browser and from the CLI |
| Claim tree relay | **working** — root published for 202601 |
| Claims and benefit payment | **working** — €154.00 claimed end to end from the claimant's browser on the pre-withholding fund; see **A benefit claimed** |
| Claimant's claim key in the browser | **working** — 32 random bytes kept in a downloaded file (passphrase route retained for anchors written before 2026-08-26) |
| Recovering a post-claim change coin | **working** — `fund reconcile`, verified against the on-chain commitment |
| Anchoring the claim key at hire rather than termination | **not built** — needs a contract change; today she must hand the hash over before being dismissed |
| Benefit withholding | **working** — tax and contribution withheld under the schedule the final month was filed under, pinned by hash |
| Remitting withheld benefit tax | **working** — €55.055 and €4.62 sent to their treasuries and confirmed received |
| Stepped benefit rate | **not modelled** — `BenefitParams` carries one flat rate, not a schedule |

### Known sharp edges

- **Every contract change invalidates every deployed instance.** Verifier keys
  are fixed at deploy, so adding a circuit makes `findDeployedContract` refuse
  with `circuitIds: [...]`. There were several redeploys in one day for this.
- **Old instances left in `deployment.json` break the page.** Decoding one with
  a newer module throws `tried to idx, only map, array, and bmt are supported`.
  Instances are now decoded individually so one failure drops a single card
  instead of the whole list, but prune stale deployments anyway.
- **`npm run dev` in `frontend/` skips `frontend:config`.** The compiled
  contract module, ZK assets and deployment addresses are copied by that step,
  so run `npm run frontend:config` (it works from either directory) after any
  `npm run compile` or redeploy.
- **Long-running processes hold their own copy of the contract.** Restart
  `demo:server` after recompiling; see **Recompiling does not reach a running
  process**.
- **Roster size is compile-time.** Changing it means editing every
  `Vector<N, …>`, recompiling and redeploying.
- **A shielded send needs the recipient's ENCRYPTION key, and `callTx` cannot
  carry it.** Use `submitCallTx` with `additionalCoinEncPublicKeyMappings` for
  any circuit that sends a coin to someone else. `payPeriod` already did;
  `remitBenefitTax` did not, and failed. **`payroll`'s `remitTax`/`remitSocial`
  are the same shape and have never been run.**
- **A green transaction hash is not proof the money arrived.** Without the
  encryption mapping a coin can be created that its owner can never find. Check
  the recipient's balance, not the tx.
- **`fund-pool.json` is unrecoverable.** It is the only copy of the fund's coin
  nonces. Lose it and the money stays in the contract, unspendable, forever.
- **npm eats CLI flags without `--`.** `npm run fund deposit --amount 10` passes
  npm's own config, not the script's; the flag vanishes and the command fails
  asking for the argument you just typed. Use `npm run fund -- deposit --amount
  10`. The CLI detects this case and says so.
- **A termination opening is not a claim bundle.** `terminations/…json` goes
  employer → relay; `claims/<period>/claim-bundle-…json` goes relay → claimant,
  and only the second has a path. Their filenames were nearly identical until the
  bundle was renamed.
- **`connectContract` took a `contractName` it did not use.** It always imported
  the payroll module while pointing the ZK provider at the named contract's
  assets, so the first non-payroll caller fetched a verifier key for a circuit
  that contract does not have. Fixed by loading through the same `LOADERS` map —
  worth remembering as a shape: a parameter that is only *partly* honoured is
  worse than one that is missing.
- **A stale comment outlived the bug it described.** `payroll-run.ts` claimed
  coin circuits could not be proved in the browser for a long time after that was
  fixed and written up here. When the README and a code comment disagree about a
  defeat, check the README.
- **`deployment.json` silently outranks the `.env` baseline.** On a managed host
  it lives under `DATA_DIR`, so a stale record on a persistent disk overrides a
  corrected environment variable. The only signal is a warning naming both
  addresses. A fund pinned to a superseded address decoded *plausibly wrong* —
  `contributedTotal` read `1` — before throwing `expected a cell, received map`
  on the first field whose layout had moved.
- **Two installs of `compact-runtime` break `instanceof`.** A module under
  `frontend/src/generated/` resolves the runtime from `frontend/node_modules`; a
  file under `src/` resolves the root one. **Both the same version**, so nothing
  in a lockfile hints at it — but a `ContractState` deserialized by one is not
  `instanceof` the other's `ChargedState`, and `ledger()` throws
  `expected instance of ChargedState`. Server code must resolve generated modules
  through `contractModulePath()`. Bit `fund-deposit.ts` and later `relay-run.ts`,
  where it surfaced as *"contract state unreadable, or it predates this build"* —
  blaming a contract that was fine.
- **A generated ledger is lazy.** `ledger()` succeeds on any state and each
  getter decodes on access, so a `try/catch` around `ledger()` protects nothing.
  Extract the fields **inside** the try, or a mismatch escapes as an unhandled
  rejection and the page waits forever instead of reporting "unreadable".
- **Bech32m in the wallet, hex everywhere else — and it fails silently.** A key
  published from `account.coinPublicKey` and looked up against a workbook's hex
  matches nothing, with no error. Normalise with `keyToHex` at *both* ends of any
  cross-boundary comparison.
- **`payeeHash` includes the period**, deliberately, so a worker cannot be linked
  across months. Grouping employees by it therefore produces one row per person
  *per period* — a roster that grows by its own headcount every month.
- **A claim bundle goes stale.** It carries a specific fund coin, and the coin
  dies the moment another claimant spends it. The entitlement evidence never goes
  stale; only the coin does. Rebuilding is the fix, and the coin is not bound to
  the claim — `claim` asserts only `coin.value >= benefitNet`, so any spendable
  fund coin works.
- **The pool file had no `spent` status until it cost a claim.** `reconcile`
  recorded the change coin and left its parent looking spendable — and the parent
  is usually the *largest* record, so everything that picks by value picked the
  dead coin first. It now marks the parent, which it can do reliably because it
  identifies it by rebuilding the change's commitment from the parent's nonce.
- **The relay cannot size a coin to a benefit**, because the benefit derives from
  a salary it never sees. It warns against `cap × rate` — the most any benefit can
  be — which is the strongest honest statement available, and it warns when
  `coinsReceived` on chain exceeds the records in the pool file, which is
  reconciliation being overdue.
- **`PILOT_DURATION_MONTHS` is not enforced.** `claim` never constrains `window`
  against `leaf.finalPeriod` or any limit, so three monthly payments is what the
  app *shows*, not what the fund *allows*. Closing it needs the duration inside
  `BenefitParams` and an assertion in `claim` — which means republishing every
  version and redeploying, since `claim` is impure and its verifier keys are fixed
  at deploy.
- **"Rate limited" is usually the public indexer, not this app.** It answers a
  burst with that bare string, which lands in a red box under a claim form and
  reads as the claim being refused. Nothing was submitted. `explainError()`
  recognises it and says so.

## Appendix: multi-contract transactions

Probe results, with transaction hashes, that decided the architecture.

| Question | Answer | Evidence |
| --- | --- | --- |
| Can one transaction call two contracts? | **Yes** | `d6531c86…` |
| Can both calls sit in one intent (one segment)? | **Yes, without coins** | `d6531c86…` |
| Can both calls move a coin? | **Yes** | `13d1f74f…` |
| Can both move a coin *and* share one intent? | **Unresolved** | route B rejected |
| Does a failing call take the others down? | **Untested** | |
| Are ZK proofs stored on chain? | **Yes** | |
| Can a contract require a sibling call to exist? | **Yes, enforced** | `ed9a9950…` |
| Does that requirement cover the call's data? | **Yes** | |

Bundling across contracts works, and `claimContractCall` lets a contract refuse
to act unless a named sibling call is present — which is what makes a
cross-contract design buildable, since the chain rejects an incomplete bundle
rather than the shortfall merely being visible afterwards.

### Two recorded beliefs that were wrong

Both had cost design decisions before being retested.

**`Transaction.merge` does not throw on contract interactions.** An earlier note
said it did, which is why a four-contract design was abandoned. On ledger-v8
8.1.0 it merged two single-call transactions that each receive a shielded coin,
first try, and the merged transaction landed.

**The CLI does not use the proof server.** `provingMode()` returns `wasm` unless
`PROVING_MODE=http`, so every Node path proves in-process. `PROOF_SERVER_URL`
applies to the browser only. Several failures were misdiagnosed as "the proof
server is down" when it was irrelevant.

**The lesson worth keeping: these notes have a shelf life. Retest before
designing around a recorded limit.**

## Appendix: the tax and vault design

The reasoning behind splitting rules, payroll and custody into separate
contracts, recorded before the probes above.

| Contract    | Instances    | Holds money   | Purpose                                    |
| ----------- | ------------ | ------------- | ------------------------------------------ |
| `taxparams` | one, shared  | no            | versioned rule sets, keyed by period        |
| `payroll`   | one/employer | net, briefly  | files periods, funds slots, pays employees  |
| `taxvault`  | one, shared  | yes           | receives withheld tax; pays one authority   |
| `fund`      | one, shared  | yes           | pools contributions; pays benefits          |

Two unknowns dictated the shape and were settled with stubs before anything was
written: whether a contract can send a shielded coin to another contract, and
what three sends do to transaction size and proving cost. The recorded fallback —
the employer funding all destinations directly in one transaction, with `payroll`
asserting the vault amounts against a shared totals hash — is worth keeping in
mind, since it gives the same guarantees with no contract-to-contract call and
more coordination in the client.

What the split newly leaks was decided deliberately rather than discovered: the
withholding totals are public per period, because tax that is never remitted is
not tax and remitting requires the contract to know what it owes.

## Not built yet

Money is **assessed, not collected**. `setPayroll` computes tax, contribution
and net per employee in circuit and publishes the totals, and the payment path
from contract to employee works end to end — but the three withholding circuits
that would move the withheld money have no caller. Until the UI calls
`fundWithholding`, `taxPool` and `socialPool` are genuinely zero, and the Public
page says so rather than showing an assessed figure as if it had been collected.

The benefit side is now the opposite shape: it works end to end, and the money
in it got there by hand. **Contributions do not reach the fund.** A payroll
contract cannot call the fund, so a remittance is a transfer to a key and then a
deliberate `fund deposit` by whoever holds it. The €460 in the fund was put there
by the operator, not collected from anyone's payroll.

In order:

1. **Wire withholding.** `fundWithholding`, then `remitTax` / `remitSocial`.
   The circuits are deployed; this is client work.
2. **Connect contributions to the fund.** Today the two halves are assessed and
   paid independently: the fund's own withholding reaches its treasuries, but
   nothing carries payroll contributions *into* the fund. Closing that loop is an
   operational design — who holds the key between `remitSocial` and
   `fund deposit` — before it is code.
3. **Anchor the claim key at hire.** Today it is written into the termination
   attestation, so an employee must hand the hash to her employer *before* being
   dismissed. Carrying it in the roster and writing it in `setPayroll` is the
   faithful shape, and it needs a contract change and a redeploy.
4. **Model the benefit properly.** ~~Withholding~~ is done — the benefit is taxed
   under the same schedule the final salary was, so it can no longer exceed net
   pay. Still missing: a rate that **steps down** after the opening months, which
   needs a schedule in `BenefitParams` rather than one flat rate, and deriving
   the benefit from a **reference year** rather than the final month alone.
5. **Employees holding their own keys** is **done for wallet-based employees**:
   both employees in the 2026-08-25 run held their own 1AM wallets, supplied
   their own coin and encryption public keys, and one derived her own claim key
   and claimed with it. What remains custodial is the seed-based test employees
   the CLI generates.

The tax-and-vault appendix describes a four-contract version of this with
separate tax and contribution vaults. It is superseded — see **What the compiler
would not do** for why that shape cannot be built.

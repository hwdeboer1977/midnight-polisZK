# The payroll contracts

`payroll`, `taxparams`, `peur` — what each one stores, what it refuses, and
what the compiler would not let us write.

[← back to the README](../README.md)

## payroll

One employer, a fixed roster of 10 employees, one contract instance per
employer.

### Ownership

The platform operator deploys an instance and hands it to its employer. After
assignment the platform cannot set payroll, cannot reassign the seat to anyone
else, and keeps exactly one privileged circuit: `revokeEmployer`. Only employer
X can write to employer X's instance.

**One contract, one employer, for the life of the contract.** `revokeEmployer`
vacates the seat, and `lastEmployer` remembers who held it, so `assignEmployer`
can refuse every key but that one. A revoke therefore ends an employer's access
to their contract without handing that contract to anybody else — the payroll
history in it stays theirs, and their own key is the only way back in.

That is a narrower power than it used to be, and the narrowing is the point.
While the seat could be refilled with any key, a revoked instance could be given
to an unrelated company along with write access to the previous one's records —
`endEmployment` is write-once per slot, so a stranger in the seat could
permanently burn a termination attestation the real employee still needed. No
salary was ever exposed by that (commitments are hashes, and sealed openings
stay encrypted under the first employer's passphrase), but the write access and
the mixing of two companies' pools in one contract were reason enough.

The cost is that a contract can no longer be recycled: onboarding deploys one
per employer rather than refilling a shared seat.

```bash
INSTANCE=acme npm run deploy:payroll   # platform deploys; instance is unowned
INSTANCE=acme npm run payroll          # menu 2: assign employer (once)
```

Employer X runs `INSTANCE=acme npm run payroll` on their own machine with their
own wallet, reads their **coin public key** off the header (64 hex chars), and
sends it to the platform, who pastes it into "Assign employer".

`transferSeat` rotates either seat, selected by its `isPlatform` flag, and in
both directions only the current holder may move it.

`transferSeat(false, …)` lets the *employer* rotate to a new key. Key loss would
otherwise strand the instance, and routing recovery through the employer rather
than the platform means the platform never regains write access.

`transferSeat(true, …)` lets the *platform* do the same for its own key. That
half closes a sharper gap: `setParamsFor` is the gate on every future filing —
`setPayroll` refuses a period with no recorded rule set, and only the platform
can record one — so losing the platform key used to end the instance's useful
life, leaving already-filed periods fundable and payable and no month ever
fileable again.

The two are one circuit because a payroll deploy sits on the network's
per-transaction ceiling, which measures ZKIR plus verifier keys and where
verifier size tracks circuit count (see `findings.md`); they merge safely
because they are the same statement, differing only in which fields they read
and write. `assignEmployer` and
`revokeEmployer` are deliberately NOT folded in — their guard sets differ, and
conditional authorisation behind one opcode is how that kind of bug is written.

Verified on the devnet with three separately funded wallets:

| Attempt                       | Result                                             |
| ----------------------------- | -------------------------------------------------- |
| platform assigns employer X   | accepted                                            |
| platform assigns again        | `failed assert: employer already assigned`          |
| platform sets payroll         | `failed assert: only the employer may set payroll`  |
| unrelated wallet sets payroll | `failed assert: only the employer may set payroll`  |
| employer X sets payroll       | accepted                                            |

The seat rule is exercised in `tests/employer-seat.test.mjs`, which drives the
compiled circuits locally — no wallet, no node, no proofs:

| Attempt                                  | Result                                             |
| ---------------------------------------- | -------------------------------------------------- |
| platform assigns a first employer        | accepted                                            |
| revoke, then assign a DIFFERENT employer | `failed assert: this contract belongs to another employer` |
| revoke, then assign the same employer    | accepted                                            |
| employer rotates their key, then revoked | the rotated key is restorable; the retired one is not |
| platform rotates the employer's seat     | `failed assert: only the holder of that seat may transfer it` |
| employer rotates the platform's seat     | `failed assert: only the holder of that seat may transfer it` |
| employer seat rotated while vacant       | `failed assert: no employer assigned yet`           |
| platform rotates its own seat            | accepted; the retired key no longer sets rule sets  |

### Which employer a period was filed by

`PayrollCommitment` binds the employer key, so reopening a commitment needs the
key that FILED the period. `employer` is not that key — it is whoever holds the
seat now, and it moves: `revokeEmployer` zeroes it, `transferSeat` replaces
it. Every circuit that recomputed a commitment read the moving value, which made
two ordinary acts destructive:

- a revoke stopped every payslip already issued from verifying, reported by
  `checkPayslip` as a figures mismatch — the message that means fraud;
- a key rotation left any still-unpaid period unpayable, because `payEmployee`
  could no longer reproduce the commitment it must open. The circuit that exists
  so a lost key cannot strand an instance was the thing that stranded it.

`employerFor` records the filer when the period is filed, exactly as
`paramsHashFor` records its rule set, and both are facts about the period rather
than about who is filing next. `tests/period-employer.test.mjs` drives a filing
through a revoke and a rotation and checks the commitment still opens — with the
old behaviour kept as a negative control, so the fix cannot be quietly undone.

### Remitting: one circuit, not two

`remitTax` and `remitSocial` were the same circuit twice — identical guards,
token check, amount check and send, differing only in six paired fields
(`taxCoinFor`/`socialCoinFor`, `totalTaxFor`/`totalSocialFor`,
`taxTreasury`/`socialTreasury`, `taxPool`/`socialPool`,
`taxRemitted`/`socialRemitted`, and which record is cleared). They are now one
`remit(period, isTax, treasury, coin)`.

This was forced rather than chosen: the contract no longer fit in a deploy
transaction. See "The deploy ceiling" in `findings.md` for how that was
established and what it costs to ignore.

The merge preserves the one property that matters. There is exactly **one**
`sendShielded`, and `treasury` still reaches it as a disclosed argument —
`findings.md` records that reading the recipient from the ledger got every
remittance refused with the retired catch-all 103, and that passing it as an
argument is what fixed it. The branch selects reads before the send and writes
after it, so the send itself never moved. The destination is still frozen at
deploy; naming it as an argument cannot redirect anything, because the assert
pins it to the frozen value.

Callers pass `isTax`: `frontend/src/lib/payPayroll.ts` sends
`what === "tax"` as the second argument.

### Why `endEmployment` is not gated on the filer

It is write-once per slot, so whoever can call it can permanently deny an
employee the attestation their claim needs. Binding it to `employerFor` was
planned and then dropped, because the seat rule above already closes the hole
and the binding would open a worse one. The hazard was a stranger in the seat,
reachable only while a revoked contract could be handed to a different key —
which `assignEmployer` now refuses. What remains reachable is the employer's own
lineage, and a filer-gate would break exactly that: an employer who rotated
their key could no longer end employment for periods filed under the old one,
which is the same bug `employerFor` was written to fix.

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

⚠️ Minting is open to ANYONE, in any amount — see the demo warning at the top of
`peur.compact`. `issuer` records who deployed and gates nothing; no circuit
reads it.

`mint` pays the caller, which sidesteps key exchange entirely: a shielded coin
can only be found and spent by someone whose encryption key the transaction was
built with, and the caller's own wallet already has it. `mintTo` pays someone
else, and needs more from them.

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

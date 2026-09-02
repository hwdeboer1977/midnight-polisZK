# What is private, and what is not

The disclosure boundary, stated rather than implied — including the places
where privacy costs something and the places where it is not yet complete.

[← back to the README](../README.md)

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
| **Months worked** | no | committed inside the attestation |
| How many monthly windows anyone gets | **yes** | `durationMonths` in `BenefitParams` — a rule, not a fact about a person |
| Which periods have a claim tree | **yes** | `rootFor` |
| How many claims have settled | **yes** | `claimsPaid` — a count, never an amount |
| One spent nullifier per claim | **yes** | ⚠️ derived from the claimant's wallet — see below |
| **Who claimed, and for how much** | no | the benefit is a shielded coin |
| **The fund's balance** | no | a shielded coin, so the fund is *not* publicly solvent |
| Tax and contribution withheld from benefits, in total | **yes** | `taxPool`/`taxRemitted` — deliberate, and it discloses aggregate outflow |
| **Which claim withheld what** | no | only the running totals move |

The public total is deliberate and useful: an auditor can check what a company
paid in a month without learning what anyone earns.

⚠️ **The nullifier stopped being unlinkable on 2026-09-02.** It was
`hash(claimKey, window, fund)` over a secret only the claimant held, so the
`spent` set was a list of values nothing could tie to a person. It is now
`hash(ownPublicKey, window, fund)`, so **anyone holding a claimant's payment
address can compute it and test the set** — learning *that* she claimed and for
how many windows.

Not the world: `payeeFor` publishes only a hash, so a passer-by cannot. But a
former employer can, from the workbook, and so can anyone she has given that
address to in order to be paid. What is still hidden: the amount, the salary it
derives from, and which employer she left.

That was a deliberate trade for removing a 32-byte file that could not be
reissued, could not be sealed to her wallet, and had to be handed to her employer
*before* a write-once statement. [Wave 2](#wave-2-hardening) records what would
buy it back.

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

Both employees held their own 1AM wallets and supplied their own coin and
encryption public keys into the roster. No key in that chain was derived from the
employer's passphrase. (That run predates the claim key's removal — one of them
derived her own claim key from her own passphrase and claimed with it.)

`claim` makes that structural rather than a matter of good practice: it rebuilds
`payeeBinding` from `ownPublicKey()`, so a benefit can only be claimed by the
wallet payroll filed as payee. A custodial employee — one whose key the employer
derived — is one whose *employer* could claim her benefit. The derived-key
shortcut is therefore fine for demonstrating a payment rail and **not fine once
benefits are involved**.

What is still custodial: the seed-based test employees `npm run payee`
generates, and any roster still using employer-derived keys.


## Wave 2 hardening

What is knowingly unfinished, in the order I would fix it. Each names the
mechanism rather than an intention, because a roadmap that cannot be checked is
a wish.

### 1. Make the nullifier unlinkable again

**Now:** `hash(ownPublicKey, window, fund)` — computable by anyone with the
claimant's payment address.

**Needs:** a secret her wallet can reproduce on demand. Two candidates, and the
constraint that kills the obvious ones is recorded in `lib/payslip.ts`: the DApp
connector exposes `shieldedEncryptionPublicKey` and `signData`, **no decrypt
operation**, and it signs **non-deterministically**.

- **WebAuthn PRF.** A passkey's PRF extension yields a deterministic
  per-credential secret, so the key comes back from a touch — no file, nothing
  guessable. Strongest of the three; depends on authenticator support, and an
  unsynced authenticator lost is the key lost.
- **A claimant passphrase.** `PBKDF2(passphrase, coinPublicKey)`, mirroring the
  employer's payroll passphrase exactly. Reproducible anywhere, nothing stored —
  but the claim-key hash would be public again, so a weak passphrase becomes an
  offline target.

### 2. Allocate pool coins with a lease

**Now:** `/api/pool-coin` returns the largest confirmed coin and takes no lease.
With one claimant per period there is nothing to race; with two, the second loses
to a spent input and sees node error 103, which does not say so.

**Needs:** a reservation with an expiry — five minutes is generous against a
minute of proving — returning expired holds to the pool. The fund already holds
many coins (one per deposit, plus a change coin per settled claim), so there is
something to allocate; `poolOrdinal` is a bookmark to the newest, not the pool.

### 3. Enforce the no-logging policy

**Now:** stated in `utils/pool-coin.ts` and honoured by not having written any.
A period, an IP and a timestamp on `/api/claim-tree` or `/api/pool-coin` is a
claim-timing record that would rebuild off chain the linkage the design pays to
avoid.

**Needs:** something a future contributor cannot undo by accident — an explicit
opt-out in the request logger rather than a comment.

### 4. Seal the roster the way `sealed_rosters` is sealed

**Now:** `registrations` holds `company_name` beside `contract_address` and
`employer_key`, **in plaintext**, in the platform's own database. That
reconstructs the company-to-contract map the rest of the design avoids.

**Needs:** the pattern already two tables away. `sealed_rosters` holds AES-GCM
ciphertext under a key derived from a passphrase the service never sees.

### 5. A second payslip copy, sealed to the employee

**Now:** the openings on chain are sealed under the **employer's** key, so a
former employee needing a replacement has to ask a company she no longer works
for — precisely when goodwill is thinnest.

**Needs:** a second `Bytes<100>` field per slot, written by `setPayroll` and
sealed to the employee. ⚠️ **Blocked**, and worth stating so nobody re-proposes
it: the connector has no decrypt operation, so ciphertext sealed to her
`shieldedEncryptionPublicKey` has no reader. This waits on the same capability
as item 1.

### What is not on this list, and why

**Small-roster inference.** `totalPayrollFor` and `employeeCountFor` are both
public and `setPayroll` is unrolled to two employees, so the average is within a
whisker of each person's pay. That is inherent to publishing exact totals at
small headcount. It eases as the roster grows and it does not go away; the fix
is a bigger roster, not a code change.

**The open pEUR mint.** `peur.compact`'s `mint` asserts nothing about its caller
— the issuer check was removed so a demo can fund itself — so `totalSupply`
measures nothing. A real deployment restores the check in the contract. No
amount of frontend work substitutes for that, which is why minting now happens
from the connected wallet: a service route in front of an open circuit is a door
beside an open wall.

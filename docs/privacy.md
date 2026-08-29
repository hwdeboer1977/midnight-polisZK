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

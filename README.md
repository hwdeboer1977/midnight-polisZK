# midnight-polisZK

Private payroll on Midnight. Two contracts:

- **`payroll`** — one instance per employer. Individual salaries never reach the
  chain; only the headcount, the total, and one commitment per employee do.
- **`peur`** — a shielded EUR stablecoin the payroll is denominated in. Balances
  and transfer amounts are private; total supply is public so it can be audited
  against reserves.

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

INSTANCE=acme npm run deploy:payroll   # deploy an employer's payroll
INSTANCE=acme npm run payroll          # assign employer, set salaries

npm run deploy:peur   # deploy pEUR and mint the initial supply
npm run peur          # token status, mint more
```

`MIDNIGHT_NETWORK=local` needs no wallet secret: the devnet's `dev` genesis
preset pre-funds a well-known account, and the app falls back to it when neither
`WALLET_MNEMONIC` nor `WALLET_SEED` is set.

The proof server is started with `docker run` rather than from `compose.yml`. It
fails to fetch key material from `srs.midnight.network` when compose starts it,
but works as a standalone container. It listens on the host at `localhost:6300`,
so it does not need to share the compose network.

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

| Route       | Shows                                                            |
| ----------- | ---------------------------------------------------------------- |
| `/`         | landing page: what the product does, and what it does not publish |
| `/register` | employer registration — connect a wallet, hand over public keys    |
| `/app`      | balance tiles, keys to receive pEUR, addresses, deployed contracts |
| `/payroll`  | live payroll state per instance, roster upload                     |
| `/peur`     | live token state, your pEUR balance, token type                    |

Each payroll instance renders inside an **error boundary**. Ledger state decodes
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

The public total is deliberate and useful: an auditor can check what a company
paid in a month without learning what anyone earns.

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
operator are genuinely separate there; only employer and employee are not.**

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
preview/payroll
preview/peur
```

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
| `npm run demo:server`    | ⚠️ demo-only self-service onboarding on :8787      |
| `npm run roster:template`| write roster-template.xlsx                        |
| `npm run deploy:payroll` | deploy a payroll instance (`INSTANCE=x`)          |
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

`npm run deploy` is the generic form the two deploy scripts wrap; it takes
`CONTRACT_NAME` and `INSTANCE` from the environment.

## Project structure

```
midnight-polisZK/
├── compose.yml                    # local devnet: node + indexer
├── contracts/
│   ├── payroll.compact            # private salaries, public aggregate
│   ├── peur.compact               # shielded stablecoin
│   └── managed/                   # compiled artifacts, per contract (gitignored)
├── src/
│   ├── deploy.ts                  # deploys whichever CONTRACT_NAME names
│   ├── payroll-cli.ts             # payroll CLI
│   ├── peur-cli.ts                # pEUR CLI
│   ├── check-balance.ts           # address + tNIGHT/tDUST
│   ├── providers/                 # midnight-js provider wiring
│   └── utils/                     # network config, wallet, contract, deployments
├── frontend/                      # wallet-connect UI (Vite + TypeScript)
│   ├── public/deployments.json    # generated by npm run frontend:config
│   └── src/
│       ├── wallet/WalletContext.tsx   # connect, account snapshot, refresh
│       ├── pages/                     # Overview, Payroll, Peur
│       ├── components/                # CopyRow, Tile, WalletPicker
│       └── lib/                       # formatting, deployments
├── .env                           # config (keep private!)
├── deployment.json                # addresses, keyed <network>/<contract>[:instance]
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
| Employees holding their own keys | **not started** — wave 1 is custodial |
| Tax / net pay | **not started** |

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

## Not built yet

`payroll` records what each employee is owed; `peur` holds the value. **Nothing
connects them** — there is no payment path today.

The interesting version is a treasury model: pEUR held by the payroll contract
and disbursed against the salary commitments already stored there, so an
employer provably pays what they committed. That needs an employee key registry,
because the contract currently knows commitments but not identities — and each
employee must supply both a coin public key and an encryption public key before
a shielded coin can reach them.

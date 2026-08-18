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
stores the headcount, the total, and one commitment per employee.

The whole roster is set in a **single** `setPayroll` call, and that is a privacy
requirement rather than a convenience. If salaries were written one at a time,
each transaction would move the public `totalPayroll` by exactly that person's
salary, and anyone watching blocks could read every amount off the deltas.
Batching means public state only ever moves by the aggregate.

Each employee gets a commitment `persistentHash(salary, nonce)` stored on chain.
It reveals nothing on its own, but lets the employer later prove to an employee
what they were paid. The nonce is what stops the commitment being brute-forced —
without it, hashing every plausible salary would recover the amount.

Salaries and nonces are written to `payroll-secrets.<INSTANCE>.json`
(gitignored, mode 0600). **Lose that file and no commitment can ever be
reopened** — it is the private half of the contract's state.

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
PEUR_INITIAL_SUPPLY=250000000 npm run deploy:peur    # 2,500,000.00 pEUR
```

Amounts are minor units (cents): `100` = `1.00 pEUR`, capped at `Uint<48>` so
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
are defined by our own contract as cents.

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

Columns: **Full name · Address · Monthly gross salary**, one row per employee, ten
rows. Amounts accept `3500`, `3500.00`, `3,500.00` or `€3.500,00` — a payroll file
that silently loses cents is worse than one that refuses to load.

Upload it in the browser (`/payroll`) to check it: parsing happens **in the page**,
so the file is never uploaded anywhere, and the preview shows exactly which figure
becomes public. Then submit from the CLI, which needs the file path:

```bash
INSTANCE=acme npm run payroll    # option 3: Set payroll from roster.xlsx
```

Only the salaries enter the circuit, and only the total and ten commitments are
published. **Names and addresses never reach a transaction** — they are read,
shown for confirmation, and dropped.

A verified run: ten employees totalling 41,771.50, of which the chain learned
`employeeCount 10`, `totalPayroll 4177150`, and ten opaque commitments.

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
| `npm run payroll`        | assign employer, set payroll, verify a commitment |
| `npm run deploy:peur`    | deploy pEUR, then mint the initial supply         |
| `npm run peur`           | pEUR status, mint, send to an employer            |
| `npm run check-balance`  | print address, sync wallet, show tNIGHT/tDUST     |
| `npm run reset`          | drop artifacts + `dist` and recompile             |
| `npm run clean`          | drop artifacts, `dist`, `deployment.json`         |
| `npm run wallet:reset`   | drop cached wallet sync state                     |
| `npm run frontend`       | generate config + serve the wallet UI on :5173     |
| `npm run frontend:build` | production build of the frontend                  |
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
└── payroll-secrets.*.json         # salaries + nonces per instance (gitignored, 0600)
```

## Not built yet

`payroll` records what each employee is owed; `peur` holds the value. **Nothing
connects them** — there is no payment path today.

The interesting version is a treasury model: pEUR held by the payroll contract
and disbursed against the salary commitments already stored there, so an
employer provably pays what they committed. That needs an employee key registry,
because the contract currently knows commitments but not identities — and each
employee must supply both a coin public key and an encryption public key before
a shielded coin can reach them.

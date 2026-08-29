# The frontend

Four areas, one per party, and the design system that tells them apart.

[← back to the README](../README.md)

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

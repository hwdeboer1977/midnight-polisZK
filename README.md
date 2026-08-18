# midnight-polisZK

A Midnight Network application created with `create-midnight-app`.

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

npm run compile       # Compact -> contracts/managed/hello-world
npm run check-balance # sanity check: wallet syncs, has tNIGHT/tDUST
npm run deploy        # writes deployment.json
npm run cli           # store / read the message
```

`MIDNIGHT_NETWORK=local` needs no wallet seed: the devnet's `dev` genesis preset
pre-funds a well-known account, and the app falls back to it when `WALLET_SEED`
is unset.

The proof server is started with `docker run` rather than from `compose.yml`. It
fails to fetch key material from `srs.midnight.network` when compose starts it,
but works as a standalone container. It listens on the host at `localhost:6300`,
so it does not need to share the compose network.

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

## Networks

| `MIDNIGHT_NETWORK` | Network id   | Seed                              |
| ------------------ | ------------ | --------------------------------- |
| `local` (default)  | `undeployed` | pre-funded dev seed, no config    |
| `preprod`          | `preprod`    | `WALLET_SEED` required, funded    |
| `preview`          | `preview`    | `WALLET_SEED` required, funded    |

For remote networks, run `npm run check-balance` to print the unshielded
address, fund it at that network's faucet, and re-check. tNIGHT must be
registered for DUST generation before fees can be paid.

## Available scripts

| Script                  | Does                                             |
| ----------------------- | ------------------------------------------------ |
| `npm run env:up/down`   | local node + indexer                              |
| `npm run proof:up/down` | standalone proof server on :6300                  |
| `npm run compile`       | compile the Compact contract                      |
| `npm run build`         | TypeScript → `dist/`                              |
| `npm run deploy`        | build + deploy, writes `deployment.json`          |
| `npm run cli`           | interactive store/read against the deployment     |
| `npm run check-balance` | print address, sync wallet, show tNIGHT/tDUST     |
| `npm run reset`         | drop artifacts + `dist` and recompile             |
| `npm run clean`         | drop artifacts, `dist`, `deployment.json`         |
| `npm run validate`      | typecheck + compile                               |

## Project structure

```
midnight-polisZK/
├── compose.yml                    # local devnet: node + indexer
├── contracts/
│   ├── hello-world.compact        # contract source
│   └── managed/                   # compiled artifacts (gitignored)
├── src/
│   ├── deploy.ts                  # deployment script
│   ├── cli.ts                     # interactive CLI
│   ├── providers/                 # midnight-js provider wiring
│   └── utils/                     # network config + wallet facade
├── .env                           # config (keep private!)
└── deployment.json                # written by deploy
```

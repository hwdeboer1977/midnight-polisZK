# Running it locally

The live deployment needs none of this. It is here so the whole system can be
reproduced from source — a devnet, a proof server, and the contracts compiled
from the `.compact` files in this repository.

[← back to the README](../README.md)

## Prerequisites

- **Node.js 22+**
- **Docker** — runs the local devnet (node + indexer) and the proof server
- **Compact compiler**, pinned to a version whose emitted runtime matches the
  installed `@midnight-ntwrk/compact-runtime` (see [Toolchain versions](running-locally.md#toolchain-versions))

## Quick start (local devnet)

```bash
npm install

npm run env:up        # midnight node + indexer (compose.yml)
npm run proof:up      # standalone proof server on :6300

npm run compile       # compiles every contracts/*.compact
npm run check-balance # sanity check: wallet syncs, has tNIGHT/tDUST

npm run deploy:peur   # deploy pEUR and mint the initial supply — first, the others freeze its token
npm run peur          # token status, mint more

INSTANCE=acme npm run deploy:tax       # registry + v1 rules + payroll
YEARS=2026 npm run deploy:tax          # open a calendar year for filing
INSTANCE=acme npm run payroll          # assign employer, set salaries

npm run deploy:fund   # the unemployment fund (needs TAX_TREASURY_KEY, SOCIAL_TREASURY_KEY, peur_token_id)
npm run fund -- params --version 1 --cap 4000 --rate 7000 --min-months 1 --duration-months 3
npm run fund -- rules --version 1 --year 2026          # apply v1 to final periods in 2026
npm run fund -- deposit --period 202609 --amount 200
npm run fund status
```

**pEUR comes first.** The fund and every payroll contract freeze their token in
the constructor, read from `peur_token_id` in `.env`, which `npm run deploy:peur`
writes. Deploying either before pEUR exists is refused rather than producing a
contract that pays in the wrong thing.

Use `deploy:tax` rather than `deploy:payroll` for the payroll contract. Both
supply the constructor arguments — the two treasury keys from
`TAX_TREASURY_KEY` / `SOCIAL_TREASURY_KEY` and the token — but `deploy:tax` also
records the rule-set hash for a window of periods, without which a freshly
deployed instance can file nothing — see **taxparams**.

A benefit rule set does nothing until `fund rules` records it for the final
periods it covers: `claim` checks the rules against what is recorded for the
claimant's final period.

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
| `npm run deploy:tax`     | registry, v1, payroll, employer, `YEARS=`/`PERIODS=` — in the one order that works |
| `npm run registry`       | inspect `taxparams`: versions, rates, `paramsHash` |
| `npm run payee`          | generate a keypair — used for the treasury keys   |
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
| `npm run fund`           | fund status, params, rules, deposit, pool, reconcile — **flags need `--`** |
| `npm run terminate`      | end an employee's employment from the CLI         |
| `npm run relay`          | build a period's claim tree, optionally publish the root |
| `npm run test`           | every test below, plus wallet-auth and routes     |
| `npm run test:bands`     | differential test: TypeScript bracket arithmetic vs the circuit's |
| `npm run test:payslip`   | payslip encode/decode and commitment round-trip   |
| `npm run test:tree`      | claim-tree paths fold to the root, and tampering does not |
| `npm run test:benefit-tax`| the fund's band arithmetic against payroll's, and the schedule hash against the chain |
| `npm run test:nullifier` | the claim nullifier, entitlement months, and `monthStart` against `Date.UTC` |
| `npm run test:fund-claim`| a claim driven through the compiled fund: three coins out, months, rules per period, token |
| `npm run test:payroll-token`| payroll's frozen token, and a termination that needs its withholding funded |

`npm run deploy` is the generic form the deploy scripts wrap; it takes
`CONTRACT_NAME` and `INSTANCE` from the environment.

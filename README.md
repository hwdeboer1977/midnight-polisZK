# IncomeLayerZK

**Private payroll on Midnight, and an unemployment benefit paid out of it
without anyone learning who claimed or how much.**

An employer files a month's payroll. The chain learns the headcount, the totals
and one sealed commitment per person — never a salary. Tax and social
contributions are computed *inside the circuit* from published rules, so an
employer cannot choose a rate. When somebody's employment ends, they can later
prove they qualify for a benefit and collect it, while remaining
indistinguishable from everyone else terminated that month across every employer
on the platform.

Nobody is recorded as unemployed anywhere. There is no claimant list, no status
field, and nothing an observer can enumerate to find one.

## Live on Midnight preview

| | |
| --- | --- |
| Payroll | `2747020da58755a08787386a3c999f47c3570c8b8e019603cdd866974124024d` |
| Settlement asset (pEUR) | `763fd7a5f8237249a549c591b7b320abe83c7c621ea0846e1af44e1559b017e3` |
| Tax rules | `fdcb22a8508a1ec437f2d3ad83cf87f0e08f3610da6fcf2638aad5df37af7532` |
| Benefit fund | `ae30b2888cf2c9722821dd54763d079249c576ead3e795c9d91cafe374fa31a1` |
| Tax vault | `efc7a884ae9aec09715369f6b51e873626001fccaeba794022a54f4c022a6fb2` |

**All five were redeployed on 2026-09-11**, after a review closed six faults —
among them a benefit withholding pool that disclosed each claim's benefit, and
claim windows that could all be drawn at once. pEUR is a new token
(`7ec1d9ec…`), so every balance held in the previous one does not work with
these contracts. The new payroll has nothing filed yet, and no claim has been
made against the new fund. Deploy transactions are in
[docs/findings.md](docs/findings.md#deployed-2026-09-11).

Two payroll periods have been filed, funded, paid and remitted end to end, and a
benefit has been claimed against the fund — from the browser, with the salaries
never leaving the employer's machine. The transaction hashes are in
[docs/findings.md](docs/findings.md).

## The five contracts

| Contract | Instances | Holds money | What it is for |
| --- | --- | --- | --- |
| **`payroll`** | one per employer | net pay, briefly | Files a period: headcount, totals, one commitment per employee. Holds withheld tax and contributions until remitted, and records the employer's write-once attestation that someone's employment ended. |
| **`taxparams`** | one, shared | no | The versioned, append-only record of what the rates were, so a filing stays checkable against the rules in force when it was made. |
| **`peur`** | one, shared | — | A shielded EUR stablecoin payroll is denominated in. Balances and transfer amounts are private; total supply is public so it can be audited against reserves. |
| **`fund`** | one, shared | yes | The money benefits are paid from, the rules each final period is claimed under, and the per-period Merkle roots a claim proves membership of. |
| **`taxvault`** | one, shared | yes | Receives wage tax under a withdrawal authority frozen at deploy. Unlike the fund it never pays out privately, so its balance *is* public. |

## Architecture

```mermaid
flowchart TB
    PU["Public"]
    EE["Employee"]
    EM["Employer"]
    OP["Operator"]

    subgraph FE["Frontend — Vite + React, in the browser"]
        PUS["/app"]
        EES["/employee"]
        EMS["/employer"]
        OPS["/operator"]
    end

    WAL["Wallet extension<br/>signs, and may prove"]

    subgraph SVC["Service — Express, port 8787"]
        API["/api routes"]
        KEYS["platform wallet seed<br/>treasury seeds<br/>fund-pool.json"]
        DB[("Postgres")]
    end

    subgraph CH["Midnight preview"]
        PAY["payroll"]
        TAXP["taxparams"]
        PEUR["peur"]
        FUND["fund"]
        VAULT["taxvault"]
    end

    PU ~~~ EE ~~~ EM ~~~ OP

    PU --> PUS
    EE --> EES
    EM --> EMS
    OP --> OPS

    PUS -.->|public reads only| CH
    EES --> WAL
    EMS --> WAL

    EES -->|claim tree, pool coin| API
    EMS -->|relay, sealed roster| API
    OPS -->|platform token| API

    WAL -->|file, pay, remit, terminate| PAY
    WAL -->|claim| FUND

    API --> DB
    API --> KEYS
    API -->|publishRoot| FUND
    KEYS -->|treasury spends| FUND
    KEYS --> VAULT

    PAY -.->|reads the rules| TAXP
    PAY -.->|settles in| PEUR
```

The dotted lines are reads, not calls: `payroll` looks up the rule set in force
for a period, and settles in `peur`. Everything else is a transaction.

**Who touches what, and why it is split that way:**

| Actor | Uses | Signs with | Needs the service? |
| --- | --- | --- | --- |
| **Public** | `/app` | — | no — every figure is a public chain read |
| **Employee** | `/employee` | own wallet | reads only — the period's leaf digests and a fund coin |
| **Employer** | `/employer` | own wallet | for the relay and the sealed roster |
| **Operator** | `/operator` | platform wallet, held by the service | yes — it holds the seeds |

The service exists for exactly three things a browser cannot do: hold the
**platform wallet's seed**, hold the **two treasury seeds**, and read
**`fund-pool.json`** — the only record of the fund's coin nonces anywhere. It is
not a backend in the usual sense: it never sees a salary, and the payroll
workbook never leaves the employer's machine.

The database can read little of what it holds. `registrations` is bookkeeping,
and `sealed_rosters` is ciphertext under the employer's payroll passphrase, which
the service never receives.

## How a month works

```
EMPLOYER                          CHAIN                        EMPLOYEE
--------                          -----                        --------
workbook (salaries)  ──file──▶   totals + commitments
                     ──pay───▶   net as shielded coins  ──────▶ wallet
                     ──remit─▶   pools → treasury wallets       payslip (out of band)

OPERATOR
--------
treasury wallets     ──────────▶ benefit fund + tax vault
```

Filing, paying and remitting are one action in the UI and three signatures on
chain. The waits between them are forced by the ledger, not by the interface:
paying spends coins that funding just created, and a coin cannot be spent until
its commitment has a position in the Zswap tree.

## How a claim works

When employment ends, the employer signs a write-once attestation — needing
**nothing from the employee** to do it — and the month's terminations are folded
into one Merkle tree whose root is published.

To claim, she proves — in zero knowledge — that a leaf naming her wallet is in
that tree, that she worked long enough, and what her final salary was. Each claim
pays one calendar month, from the month after her final period, and not before
that month has started. The chain learns the final period, the month, that *a*
claim happened, and one nullifier. Not who, not which employer, not how much.
The tax and contribution withheld from the benefit go to the treasuries in the
same transaction, as shielded coins, so they are not published either.

**She needs one file: the payslip her employer already sends her.** Everything
else is assembled in her browser — her leaf reconstructed from public payroll
state and her own key, her path built from the period's published leaf digests.
Nobody tells her which leaf is hers; she recomputes her own digest and finds the
match.

⚠️ One thing this buys convenience with: the nullifier is derived from her
wallet, so **anyone holding her payment address can tell that she claimed, and
for which months** — never how much, never her salary, never which employer.
Removing the claim key is what traded that away, and
[docs/privacy.md](docs/privacy.md#wave-2-hardening) records what would restore
it.

The anonymity set is everyone terminated in the same month, platform-wide. That
is the design, and it is why the fund is one shared contract rather than one per
employer.

## Documentation

| | |
| --- | --- |
| [Contracts](docs/contracts.md) | `payroll`, `taxparams`, `peur` — what each stores and refuses |
| [The benefit](docs/benefit.md) | the fund, terminations, the claim tree, claiming |
| [Privacy](docs/privacy.md) | the disclosure boundary, proving, what is still custodial |
| [Frontend](docs/frontend.md) | four areas, one per party, and the design system |
| [The service](docs/service.md) | routes, rate limits, and what the database holds |
| [Walkthroughs](docs/walkthroughs.md) | what an employer does, what an employee does |
| [Operations](docs/operations.md) | funding, paying, networks, reading errors |
| [Deployment](docs/deployment.md) | Render and Vercel, and the variables each needs |
| [Running locally](docs/running-locally.md) | devnet, proof server, scripts, toolchain |
| [Findings](docs/findings.md) | what was verified on chain, and the probes behind the design |
| [Status](docs/status.md) | where it stands, known sharp edges, what is not built |

**Start with [Status](docs/status.md#known-sharp-edges) before changing
anything.** It lists the traps that cost the most time — silent Bech32m/hex
mismatches, two installs of the same runtime breaking `instanceof`, and a
deployment record that outranks the environment.

## A note on the name

The product is **IncomeLayerZK**. The repository and the `polisZK/...`
domain-separation tags keep the older name and **must not be renamed** — they
derive keys and commitments, so changing either invalidates every commitment
already on chain.

## Project structure

```
midnight-polisZK/
├── compose.yml                    # local devnet: node + indexer
├── contracts/
│   ├── payroll.compact            # private salaries, public aggregate, terminations
│   ├── taxparams.compact          # versioned, append-only tax rules
│   ├── peur.compact               # shielded stablecoin
│   ├── fund.compact               # unemployment fund: rules per period, roots, nullifiers
│   ├── taxvault.compact           # wage tax, under a frozen withdrawal authority
│   └── managed/                   # compiled artifacts, per contract (gitignored)
├── src/
│   ├── deploy.ts                  # deploys whichever CONTRACT_NAME names
│   ├── payroll-cli.ts             # payroll CLI
│   ├── peur-cli.ts                # pEUR CLI
│   ├── fund-cli.ts                # fund: status, params, rules, deposit, pool, reconcile
│   ├── terminate-cli.ts           # end employment (CLI route)
│   ├── relay.ts                   # build + publish a period's claim tree
│   ├── check-balance.ts           # address + tNIGHT/tDUST
│   ├── server/                    # the platform service (Express)
│   │   ├── app.ts                 # routes: onboard, relay, claim-tree, pool-coin, sealed-roster, platform/*
│   │   ├── config.ts              # host/port/token rules, the two rate-limit buckets
│   │   └── guards.ts              # rate limiting, platform token, signup code
│   ├── providers/                 # midnight-js provider wiring
│   └── utils/
│       ├── benefit-params.ts      # the published rule sets, entitlement months — only their HASH is on chain
│       ├── claim-tree.ts          # the tree, hashed by the contract's own pure circuits
│       ├── fund-pool.ts           # coin nonces, change-nonce derivation, coins found by commitment
│       ├── peur.ts                # the pEUR token id, read off the contract
│       └── …                      # network config, wallet, contract, deployments
├── frontend/                      # wallet-connect UI (Vite + TypeScript)
│   ├── public/deployments.json    # generated by npm run frontend:config
│   └── src/
│       ├── wallet/WalletContext.tsx   # connect, account snapshot, refresh
│       ├── pages/                     # Public, Operator, EmployerPayroll/Employees/
│       │                              #   History/Settings, Employee, EmployeeBenefit
│       ├── components/                # DashHero, ClaimForm, ClaimStatus, EndEmployment,
│       │                              #   EmployerTable, FundDeposit, NationalTotals, …
│       └── lib/                       # claim.ts, claimStatus.ts, runMonth.ts, sealedRoster.ts,
│                                      #   useRunGuard.ts, …
├── terminations/                  # employers' termination openings — input to the relay
├── claims/<period>/               # claim bundles the CLI relay writes — a fallback; the browser assembles its own
├── .env                           # config (keep private!)
├── deployment.json                # addresses, keyed <network>/<contract>[:instance]
├── fund-pool.json                 # ⚠️ the ONLY copy of the fund's coin nonces (gitignored)
├── .wallet-state/                 # cached sync state (gitignored, 0600)
└── payroll-secrets.*.json         # local cache of openings, rebuildable from chain (gitignored, 0600)
```

## License

This project is licensed under the Apache License, Version 2.0.

See [LICENSE](./LICENSE) for details, and [NOTICE](./NOTICE) for attribution.

Original source files carry a short SPDX header:

```
// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0
```

Applied to `contracts/*.compact`, `src/**`, and `frontend/src/**` — **excluding
`frontend/src/generated/`**, which is copied from the Compact compiler's output
by `npm run frontend:config` and is not original work. Third-party dependencies
keep their own licenses.

# Where every value lives

Five storage locations, and each holds something the others deliberately do not.

The principle running through all of them: **the chain never learns who works for
whom, and the platform never learns what anyone earns.** This is the inventory of
how well that holds — including five places where it does not.

Compiled from `contracts/*.compact`, `src/utils/registry.ts`, `src/utils/data-dir.ts`
and `frontend/src/lib/` on 2026-09-02, against the `preview` deployment. Field names
and exposure levels are read from source, not inferred.

| Level | Meaning |
| --- | --- |
| **Public** | Readable by anyone, permanently. No key, no permission, no expiry. |
| **Hashed** | On chain as a hash. Not reversible in bulk — but testable if you already hold a candidate preimage. |
| **Sealed** | AES-256-GCM ciphertext. Exactly one party holds the key, and it is never transmitted. |
| **Secret** | Exists on one device, in one file. No copy anywhere else — losing it is unrecoverable. |

---

## 1 · On chain

*Midnight preview · 5 contracts · permanent*

Everything below is world-readable and cannot be deleted. The privacy work is in
*what was chosen not to go here* — but note how much is still in the clear.
**Every monetary total is public; only the per-person split is not.**

### payroll.compact — `649f60e4…4485f`

| Ledger field | Exposure | What it actually reveals |
| --- | --- | --- |
| `employer`, `lastEmployer` | Public | The employer's coin public key, in the clear. |
| `platform`, `taxTreasury`, `socialTreasury` | Public | The three institutional wallets. Same keys across every instance. |
| `periods`, `latestPeriod` | Public | Which months this employer has filed. A filing calendar. |
| `employeeCountFor` | Public | Headcount per month. Hiring and layoffs are visible as a curve. |
| `totalPayrollFor`, `totalTaxFor`, `totalSocialFor`, `totalNetFor` | Public | **The month's four money totals, exact, in minor units.** With headcount this gives average pay — see finding 04. |
| `taxPool`, `socialPool`, `taxRemitted`, `socialRemitted` | Public | Withholding held and forwarded, running totals. |
| `withheldFor`, `fundedFor`, `paidFor` | Public | Booleans per period and per slot. Who has been paid — by slot, not by name. |
| `paramsHashFor`, `employerFor`, `fileRoundFor`, `payToken` | Public | Which rule set, which employer key, which filing round each month was pinned to. |
| `coinsReceived`, `coinOrdinalFor`, `taxCoinFor`, `socialCoinFor` | Public | Zswap leaf ordinals, so a coin can be rebuilt. Values are not stored — an ordinal alone spends nothing. |
| `payeeFor` | Hashed | `payeeHash(coinKey, period, contract)`. Bound to the month *and* the instance, so the same worker is a different value every month and at every employer. Bulk linkage is gone; a targeted guess still works. |
| `commitmentsFor` | Hashed | The payslip commitment. Binds gross, tax, social, net, weeks, employer, period and a nonce — reveals none of them. |
| `terminationFor` | Hashed | Presence = employment ended, publicly. The contents — final period, months worked, *and the claim-key hash* — are inside one hash with a random nonce, so none is readable or testable. |
| `sealedFor` | Sealed | 100 bytes: IV + AES-256-GCM of the four amounts, weeks worked and the nonce. Encrypted to **the employer's** passphrase key — the employer's own backup. *The employee cannot open it.* |

### fund.compact — the benefit pool

| Ledger field | Exposure | What it actually reveals |
| --- | --- | --- |
| `rootFor` | Hashed | Merkle root of each period's claim tree. Leaves stay off chain. |
| `rootAuthor` | Public | Which coin key published each root. Publication is permissionless by design, so a relay cannot block a claim by staying silent — but it does put the publisher's key on the record. |
| `spent` | Hashed | Nullifiers. Each is the image of a secret, so the set links to nobody. Safe to be public, and it is what stops a double claim. |
| `claimsPaid`, `contributedTotal`, `contributionCount` | Public | Coarse counters — how many claims, never who or how much each. |
| `contributedFor`, `contributionSourceFor` | Public | Per period: the amount contributed and **the payroll contract address it came from**. A public edge from employer to fund. |

### taxvault · taxparams · peur

| Ledger field | Exposure | What it actually reveals |
| --- | --- | --- |
| `taxvault.receivedFor`, `taxvault.sourceFor` | Public | Per period: how much tax arrived, and which payroll contract *claimed* to send it. The vault cannot verify the named contract really assessed that figure. |
| `taxvault` totals & counts | Public | `heldTotal` is the current balance; `receivedTotal` and `withdrawnTotal` only ever rise, so a balance back at zero still shows what passed through. |
| `taxparams.paramsFor` | Public | The tax rules themselves — brackets, rates, contribution base — in the clear, versioned. These *should* be public: they are law. |
| `peur.issuer`, `tokenId`, `totalSupply`, `mintCounter` | Public | Who may mint the payment token, and how much exists. |

> **Not on chain anywhere:** any person's name, any home address, any individual
> salary, any wallet identity beyond a coin public key, and — until a termination
> is filed — any trace of a benefit claim key. The chain stores no employee
> registry at all: a worker exists only as a slot index inside a filed month.

---

## 2 · In the database

*Postgres · Render Frankfurt · `midnight_poliszk`*

Three tables, reached through the Render service at `midnight-poliszk.onrender.com`.
Two of them hold plaintext. **This is where the identity map the chain refuses to
publish actually lives.**

| Table | Exposure | Columns, and who can read them |
| --- | --- | --- |
| `registrations` | Plaintext | `company_name`, `instance`, `network_id`, `contract_address`, `employer_key`, term and status. **A direct company name ↔ contract address ↔ employer wallet map, unencrypted, held by the platform.** The chain gives you the last two; this table adds the name. |
| `claim_key_hashes` | Public | `network_id`, `coin_public_key`, `claim_key_hash`, `created_at`. Plaintext, unique on *(network, coin key)* — no contract scope — and readable by anyone with no arguments. See findings 01 and 02. |
| `sealed_rosters` | Sealed | One base64 blob per *(network, contract)*: `iv ‖ AES-256-GCM ciphertext` under `SHA-256(employerKey ‖ "polisZK/roster/1")`, derived in the browser from the payroll passphrase. The server holds ciphertext and can do nothing with it. Contents: full name, coin key, encryption key — **deliberately no salaries and no home addresses.** |

> **Why `sealed_rosters` is the right shape and `registrations` is not.** Both answer
> "who works here". One is unreadable to the platform; the other is a `SELECT` away.
> The asymmetry is not deliberate — the registry predates the sealing pattern, and
> the pattern was never applied backwards to it.

---

## 3 · In the browser

*localStorage · per device, per origin*

Five keys, none synced, none backed up, all lost when site data is cleared. This
layer is where the "✓ Collected" badge and every remembered name come from — and
`collected.ts` is honest in its own header that it holds *"what this browser has
been told, not what is true."*

| Key | Held by | Contents |
| --- | --- | --- |
| `polisZK/collected/v1` | Employer | contract → coin key → `{ fullName, claimKeyHash, at }`. **Employee names in plaintext local storage.** This is what lets a rebuilt roster show a person instead of a slot number. |
| `polisZK/claim-key-hash/<key>` | Employee | The employee's own claim-key *hash* — a reminder of what they generated. The key itself is never written here. |
| `polisZK/fingerprint/pbkdf2-v1/<contract>` | Employer | A SHA-256 fingerprint of the payroll key that successfully filed a period, so a wrong passphrase is caught early. Written only *after* a successful submission — trying a passphrase does not bind the browser to it. |
| `polisZK/platform-token` | Operator | **The `PLATFORM_API_TOKEN` bearer credential, in plaintext.** See finding 03. |
| `polisZK/wallet-session` | — | Dead. Wallet auth was removed; `lib/walletAuth.ts` is no longer imported by anything. |

> **Never in browser storage, in any role:** the payroll passphrase, the benefit
> claim key, any wallet seed, any salary. The passphrase is typed each session and
> used to derive keys in memory; the claim key exists only in a downloaded file.

---

## 4 · Files on people's disks

*Downloads folder · no copy elsewhere*

The most sensitive material in the whole system is here, not on chain and not in
Postgres. **None of these files is backed up by anything.**

| File | Whose | Exposure | Contents |
| --- | --- | --- | --- |
| `polisZK-claim-key-….json` | Employee | Secret | The 32 random bytes of the claim key, in hex, plus its hash and the owner's coin key. **The only copy in existence.** Lose it and the unemployment benefit cannot be claimed — by anyone, ever. |
| the payroll workbook (`.xlsx`/`.csv`) | Employer | Secret | Six columns: *Full name · Address · Monthly gross salary · Weeks worked · Coin public key · Encryption public key.* **The single most sensitive artifact in the system** — and the only place a home address exists at all. The sealed roster carries a subset of this, never the salary or the address. |
| `payslip-<period>-slot-N.json` | Employer → Employee | Plaintext | Gross, tax, social, net, weeks and the nonce, in the clear. Handed over out of band; `checkPayslip` lets the employee verify it against the on-chain commitment. Plaintext is correct here — they are the employee's own figures. |
| `termination-opening-….json` | Employer | Secret | The opening of the write-once termination commitment. Without it the claim bundle cannot be rebuilt, and the commitment cannot be revised to compensate. |
| `claim-bundle-….json` | Relay / Employee | Secret | Merkle path plus the fund coin to claim against. Goes stale when another claimant spends the named pool coin — rebuildable, which is why the rebuild is exposed in the UI. |

---

## 5 · On the operator's machine

*`DATA_DIR`, or cwd when unset*

The deployer role holds everything that can spend money. Four files follow
`DATA_DIR` so a redeploy cannot wipe them; the rest belong to CLIs that run on a
person's own machine.

| File | Exposure | Contents, and why it must survive a deploy |
| --- | --- | --- |
| `.env` | Secret | `WALLET_MNEMONIC` / `WALLET_SEED`, `TAX_TREASURY_SEED`, `SOCIAL_TREASURY_SEED`, `PLATFORM_API_TOKEN`, and `DATABASE_URL` with its password. **Every spending key in the system.** |
| `deployment.json` | Local | Contract addresses per network and instance. Gitignored. Losing it orphans a deployed payroll: `assignEmployer` cannot be repeated, so a lost address is only recoverable by finding it again on chain. |
| `claims.json` | Local | Who has drawn the starter allowance. **This file *is* the bound on a public route** — `/api/claim` is gated on "has not claimed before", so losing it re-opens the allowance to everyone who already drew it. |
| `fund-pool.json` | Secret | Deposit records including **coin nonces** for the fund's pool coins. Stays in cwd deliberately — it belongs to an operator CLI on a durable machine. |
| `claims/`, `terminations/` | Secret | Per-period termination openings and payslips accumulated by the CLIs. Plaintext salary figures for anyone processed through the command line. |

---

## Who can learn what

The column that matters is the last one: a stranger with no credentials, using only
the public chain and the public API.

| Fact | Employee | Employer | Platform | Stranger |
| --- | --- | --- | --- | --- |
| Their own salary | yes | yes | — | — |
| A colleague's salary | — | yes | — | — |
| The month's total payroll | yes | yes | yes | **yes** |
| Headcount per month | yes | yes | yes | **yes** |
| Average pay per employee | yes | yes | yes | **yes** |
| Employee names | self only | yes | sealed | — |
| Home addresses | self only | workbook | — | — |
| Company name ↔ contract | — | yes | **plaintext** | — |
| Which wallet is the employer | yes | yes | yes | **yes** |
| That a given slot was paid | yes | yes | yes | **yes** |
| That a given slot was terminated | yes | yes | yes | **yes** |
| Which person a slot is | self only | yes | — | guess only |
| Someone's claim-key hash | own | yes | **plaintext** | **plaintext** |
| Someone's claim key | own file | — | — | — |
| Cross-employer work history | — | — | — | **via claim keys** |

---

## Where the design leaks

Each of these undoes, somewhere else in the stack, a property the contracts spend
real effort to establish.

### 01 — The claim-key table is publicly enumerable

`GET /api/claim-keys?networkId=preview` with no coin key returns *every* row to
anyone — a downloadable map of coin public key → claim-key hash. That pairing is
exactly the stable per-person handle `payeeFor` gives up convenience to prevent:
the chain refuses to publish it, and this endpoint hands it over on request.
Requiring `coinPublicKey` on GET turns it back into a lookup rather than a directory.

### 02 — Claim-key rows are network-global and permanent

The unique key is *(network, coin key)* — no contract address, no expiry, no delete
route. A hash published once at one employer marks that person as "collected" at
*every* employer on the network, forever. This is what put a stale **✓ Collected**
against an employee who had published a hash on 29 August during an unrelated test.
Scoping the table to *(network, contract, coin key)* fixes the bleed and the
staleness together.

### 03 — The platform token sits in localStorage in plaintext

`polisZK/platform-token` holds the bearer credential that authorises minting, the
faucet and fund-and-pay — the three operations that spend the platform wallet. Any
script running on that origin can read it. The operator pages are meant to be
local-only (`servedLocally` gates them), which limits exposure but does not remove it.

### 04 — Public totals plus public headcount ≈ individual salary

`totalPayrollFor` and `employeeCountFor` are both in the clear, and `setPayroll` is
unrolled to **two employees**. Dividing one by the other gives the average, and with
a roster of two the average is within a whisker of each person's pay. The commitments
hide the split; the totals hand most of it back. This is inherent to publishing exact
totals at small headcount — it eases as the roster grows, and it does not go away.

### 05 — The registry holds in plaintext what the roster holds sealed

`registrations.company_name` beside `contract_address` and `employer_key`
reconstructs, unencrypted and in the platform's own database, the company-to-contract
map the rest of the design works to avoid. The sealing pattern that protects
`sealed_rosters` already exists two tables away; it was simply never applied backwards.

# Walkthroughs

What each party actually does, start to finish.

[← back to the README](../README.md)

## What an employer does

Rewritten for the flow as it now stands.

### Once

1. **Connect the company signing key** on Settings, and register. The platform
   assigns the payroll contract to that key; after that it cannot write payroll
   to it.
2. **Choose a payroll passphrase.** It derives every nonce and unlocks every
   sealed opening for this contract. It is never sent anywhere and **cannot be
   reset** — a forgotten one means payslips that can never be recovered.
3. **Collect two public keys per employee** — coin public key and encryption
   public key. Both, every time: with only the first, a payment succeeds, the
   contract marks the slot paid, and the wallet can never find the coin.
4. **Collect a claim-key hash per employee.** They create it on their own
   Employee page and press *Send to my employer*, which publishes the hash to the
   service; the Employees table then shows ✓ Collected. It can still be pasted by
   hand. This must happen **before** anyone is dismissed.

### Every month

On **Payroll**: load the workbook, enter the passphrase, and press
**Run payroll for &lt;month&gt;**. That is one action covering three stages:

```
✓ Payroll filed  →  ✓ Employees paid  →  ✓ Tax & contributions remitted
```

The waits between them are **not cosmetic**. `fundAndPayPeriod` reads
`commitmentsFor` and checks each opening against it, so a filing that has been
submitted but not indexed reads as a period that was never filed. Paying spends
coins funding just created, and a coin cannot be spent until its commitment has a
position in the Zswap tree. Remitting spends the pools `fundPeriod` filled. Each
hop needs the previous one **visible on chain**, not merely submitted — so the
sequence is forced by the ledger, and what the orchestration changes is who has
to know that.

Each stage is a separate wallet signature and proves for minutes. The page holds
a `beforeunload` guard and shows a pulsing indicator with elapsed time, because a
closed tab abandons a month part way through.

If a run fails, the individual step controls open automatically — a half-finished
month is recovered by performing the stage that failed, and the run resumes from
what the chain shows rather than repeating anything that landed.

Then **send the payslips**. Nothing on chain records that a file reached a
person, so that step never ticks itself.

### When someone leaves

On **Employees** → their row → **Manage** → **End employment**. Pick the final
month and sign. One action covers three technical acts:

```
✓ Termination record created
✓ Claim data prepared
✓ September 2026 claim root published
```

The relay runs from the opening already in memory — the download-and-re-upload
round trip existed only because two panels could not talk to each other. You get
the **claim bundle** to hand over, and the opening as a backup.

**Rebuild their claim bundle** stays available on the row whenever a termination
exists, not only after a failure: a bundle goes stale when the fund coin it names
is spent by an earlier claimant, and that is not a failure of anything.

## What an employee does


### When hired

1. **Connect a wallet** on `/employee` and send the employer **both** public keys.
2. **Create a benefit key** on `/employee/benefit`. One press produces two things
   with opposite destinations:

   - 🔒 **A file to keep.** Store it where you keep your wallet's recovery
     phrase. Nobody can reissue it.
   - ↗ **A hash to send your employer.** Public and safe; press *Send to my
     employer* or copy it.

   Do this **while still employed**. The employer writes the hash into a
   write-once statement, so a key made afterwards is one no claim can use.

### While employed

Pay arrives as a shielded transfer; the payslip arrives out of band. Check it on
`/employee` — the page verifies it against the commitment the employer filed and
confirms the period was filed for the connected wallet.

⚠️ **Keep every payslip.** The openings on chain are sealed under the
*employer's* key, so only they can produce one again — and without the payslip
for the final period there is no claim at all.

### Claiming

`/employee/benefit` needs three files, and the split is the architecture:

| File          | From          | If it goes astray                                        |
| ------------- | ------------- | -------------------------------------------------------- |
| Claim bundle  | the relay     | names your employer, final month and months worked, and carries a fund coin someone could spend first |
| Payslip       | your employer | your actual salary                                        |
| Claim key     | only you      | not your benefit — claiming needs your wallet too — but which months you claimed |

**None of the three lets anybody take the benefit.** `claim` binds separately to
`ownPublicKey()`. What they cost is privacy, plus one nuisance the bundle can
cause. Saying "keep this secret or someone will claim with it" would be a false
reason for a true instruction, and it collapses the moment somebody reads the
contract.

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

### 4. End employment, and claim

Once a period is filed, the benefit half runs without the period being funded or
paid at all — `claim` opens `commitmentsFor` and `payeeFor` and checks the
termination; it never looks at `fundedFor` or `paidFor`.

```bash
# platform, once per fund
npm run deploy:fund
npm run fund -- params --version 1 --cap 4000 --rate 7000 --min-months 1
npm run fund -- deposit --amount 200
```

Then, in order and each by the party that must do it:

1. **Employee** — `/employee` → **Your claim key** → *Create my claim key* → keep the file, copy the hash.
   Also **View my payroll keys**, which is what the roster needs.
2. **Employer** — `/employer/payroll` → **End employment** → look the employee up
   by coin public key, paste her claim-key hash and the payroll passphrase.
   Download the opening into `terminations/`.
3. **Employer** — **Get payslips** for that period and send the employee hers.
4. **Relay** — `npm run relay -- <period> --publish`.
5. **Employee** — `/claim` → her bundle from `claims/<period>/`, her payslip, her
   passphrase → **Claim my benefit**.
6. **Operator** — `npm run fund -- reconcile --value <EUR>` to recover the change
   coin the claim left behind, so the pool stays spendable.

Step 6 is not optional bookkeeping. Until it runs, the fund's remaining balance
is a coin whose nonce exists nowhere.

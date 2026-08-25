# What an employer has to do

Everything an employer does, from the moment the platform has deployed their
payroll contract and assigned them as its employer. Written to be read before
simplifying it, so each step says **where it comes from** — a contract assertion
we cannot move without a redeploy, or a choice we made and can revisit.

Scope: one employer, one payroll instance. The platform's own steps (deploying
the registry, pEUR, the fund, and this employer's contract) are in the README.

---

## 0. Before anything works

| | What | Where it comes from |
| --- | --- | --- |
| 0.1 | Hold **the exact wallet key** assigned as employer | **Contract.** `setPayroll`, `fundEmployee`, `payPeriod` and `endEmployment` all assert `ownPublicKey() == employer`. Not delegable, not transferable, not recoverable. |
| 0.2 | tNIGHT **registered for DUST generation**, giving them tDUST | **Network.** Fees. Nothing submits without it, and the failure is opaque if you do not check first. |
| 0.3 | Hold **pEUR ≥ the period's total net pay** | **Contract.** Funding moves the *net* per slot out of the employer's shielded balance. Gross is never moved. |
| 0.4 | A proof server on `:6300`, **or** a wallet that proves in-tab | **Environment.** 1AM implements `getProvingProvider`; Lace does not. The page feature-detects rather than assuming. |

Nothing in 0.1–0.4 is visible in the UI as a checklist item. An employer who is
missing 0.2 or 0.3 finds out by a transaction failing.

---

## 1. One-time setup

### 1.1 Choose a payroll passphrase

The heaviest single thing the system asks of an employer.

It derives, for this contract, forever:

- every salary nonce (which opens every commitment),
- every coin nonce,
- the sealing key for the openings stored on chain,
- every termination nonce.

Lose it and the employer cannot recover a payslip, cannot end anyone's
employment, and cannot open any commitment they ever published. There is no
reset: nothing on chain can check a passphrase except by trying to open
something with it.

It is salted with the contract address, so an employer with two payroll
instances has two passphrases and must know which is which.

**Where it comes from:** *chosen*, but the alternatives were each ruled out and
recorded — a page cannot read a wallet seed, the connector signs
non-deterministically so a signature cannot be a root, and it exposes no decrypt
operation. Minimum 8 characters; typed twice on the first filing only, because
after that a wrong one is caught by failing to open an existing opening.

### 1.2 Collect two public keys from every employee

The **coin public key** and the **encryption public key**. Both, every time.

The first identifies the slot. The second is what the shielded coin is encrypted
to. With only the first, payment **succeeds**, the contract marks the slot paid,
and the employee can never see the money.

**Where it comes from:** **contract + zswap.** The employee reads both off
`/employee` → *View my payroll keys*.

### 1.3 Collect a claim-key hash from every employee

Needed only when someone leaves — but it must be obtained **before** the
employer attests to the termination, because that attestation is write-once.

**Where it comes from:** **contract.** The hash is committed inside the
termination attestation, and `claim` checks the claimant can reproduce it. See
[Ending employment](#3-when-someone-leaves) for why the ordering is awkward.

---

## 2. Every period

### 2.1 Get the workbook

`npm run roster:template`, or reuse last month's file. The same workbook carries
both the employee keys and this month's salaries, so filing a period is also what
keeps the roster current.

**There is no employee record on chain.** `/employer/roster` reconstructs who is
on the payroll from the periods already filed — it is a view, not a store. The
workbook is the roster of record, and it lives on the employer's machine.

### 2.2 Fill it

Year and Month above the table, then one row per employee:

| Column | Notes |
| --- | --- |
| Full name | display only |
| Address | display only |
| Monthly gross salary | the only money figure an employer supplies |
| Weeks worked | blank means 4 (a full month); recorded in the commitment, **does not prorate the salary** |
| Coin public key | from the employee |
| Encryption public key | from the employee |

Tax, contribution and net are deliberately **not columns**. They are computed
from gross by the published rule set, in circuit — so there is no figure an
employer could understate independently of gross.

### 2.3 Upload it

On `/employer/payroll` → *Run new payroll*. Parsed in the browser and checked
against the published rules, with a preview before anything is signed. The file
is never uploaded anywhere.

### 2.4 Enter the passphrase

Twice on the very first filing for this contract; once after that.

### 2.5 File the period

`setPayroll` — **1 transaction.** Publishes the headcount, the four column
totals, and one commitment per employee. The salaries themselves never reach the
chain.

### 2.6 Fund and pay

One button. Underneath: `fundEmployee` once per employee, then `payPeriod` once
for the whole period — **N + 1 transactions.**

Funding is per employee because each slot's coin carries exactly that employee's
committed net, so a payment can be checked against a commitment without anything
being split. Payment was batched into one transaction; funding was not.

### 2.7 Recover payslips and send them

*Get payslips* + passphrase, then one file per person, handed over out of band.

**This is the only way an employee learns what they were paid.** The amounts are
not on chain, and the page cannot show them either — it can only rebuild them
from the openings using the employer's passphrase.

---

## 3. When someone leaves

### 3.1 Ask the leaver for their claim-key hash

They derive it on `/employee` → *Your claim key* from a passphrase of their own.

**This has to happen before the dismissal**, which is the wrong way round from
how a benefit office works: normally you turn up afterwards with nothing but your
identity. It is this way because the hash is written into the termination
attestation and only the employer can write that.

Anchoring it at hire instead — carried in the roster, written by `setPayroll` —
is the faithful shape. It needs a contract change and a redeploy, and has not
been made.

### 3.2 End employment

`/employer/payroll` → **End employment**:

1. pick the period,
2. paste the employee's coin public key → **Look up** (finds their slot and
   counts their months from the chain),
3. paste their claim-key hash and the payroll passphrase,
4. submit — **1 transaction, write-once.**

Write-once matters: an employer who could reissue a termination could restate
someone's final month after seeing what it entitled them to.

### 3.3 Download the opening and send it to the relay

Not stored anywhere and **not recoverable once the page is left.** Without it the
attestation on chain is an opaque hash and no claim can ever be built from it.

---

## 4. What the employer never does

`fundWithholding`, `remitTax` and `remitSocial` are written, compiled and
deployed, and **nothing calls them.**

So the employer's tax and contribution are computed in circuit and published as
totals — and then the employer keeps the money. `taxPool` and `socialPool` read
€0.00, and the Public page says so rather than showing an assessed figure as if
it had been collected.

From the employer's side this is the largest gap in the flow: the withholding
half of their obligations is assessed and never settled.

---

## The recurring cost, per period

| | Count |
| --- | --- |
| Workbooks to maintain | 1 |
| Passphrase entries | 1 per action (filing, paying, payslips, termination) |
| Clicks to run payroll | 2 (file, then fund-and-pay) |
| On-chain transactions | **N + 2** (`setPayroll`, `fundEmployee` × N, `payPeriod`) |
| Files handed to other people | **N** payslips, plus 1 opening per leaver |
| Secrets that cannot be recovered | 1 (the passphrase) |

## Where it looks compressible

Listed without proposing fixes — these are observations, not decisions.

1. **The passphrase is asked for on every action.** Filing, funding, paying,
   recovering payslips and terminating each prompt separately, though they all
   derive from the same root. Session-scoped entry is client work.
2. **Funding is N transactions where payment is 1.** Payment was already batched;
   the same argument applies to funding, and it is a contract change.
3. **Four separate handoffs between the same two people.** The employee sends two
   public keys and a claim-key hash; the employer sends back a payslip each
   period and, at the end, nothing — the opening goes to the relay instead.
4. **Prerequisites 0.2 and 0.3 are invisible until something fails.** Neither
   appears in the setup checklist.
5. **The workbook is the only roster.** Losing it does not lose the money or the
   history, but it does lose the employee keys, which then have to be collected
   again.

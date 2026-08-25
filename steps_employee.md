# What an employee has to do

Everything an employee does, from being hired to claiming an unemployment
benefit. Companion to [`steps_employer.md`](steps_employer.md), written the same
way: each step says **where it comes from** — a contract assertion we cannot move
without a redeploy, or a choice we made and can revisit.

The short version: an employee is passive while employed and active only twice —
once at the start, to hand over keys, and once at the end, to claim. Everything
in between happens to them rather than by them.

---

## 0. Before anything works

| | What | Where it comes from |
| --- | --- | --- |
| 0.1 | A **Midnight wallet**, on the same network as the contracts | **Contract.** `payeeFor` binds a slot to a coin public key, and `claim` rebuilds that binding from `ownPublicKey()`. No wallet, no pay and no claim. |
| 0.2 | The wallet's **recovery phrase, kept** | **Cryptography.** Their shielded balance is visible to their viewing key and nothing else. Lose the phrase and the money is gone — there is no login, no reset, and nobody who can look it up for them. |
| 0.3 | **tDUST**, in order to claim | **Network.** A claim is a transaction *they* sign and balance, so they pay the fee. |

⚠️ **0.3 deserves attention before a real deployment.** It means a person who has
just lost their job must already hold the network's fee token in order to collect
an unemployment benefit. On preview this did not bite — the 1AM wallet reported
`DUST SPONSORED` and the claim went through — but whether that sponsorship
exists on a production network is a question to settle rather than assume.

Nothing else is required. There is no account, no registration and no login
anywhere in this system: an employee is a key, and the contract knows a hash of
it.

---

## 1. When they are hired

### 1.1 Connect a wallet on `/employee`

Nothing is stored. The page finds their payroll periods by recomputing
`payeeHash` from the connected wallet and matching it against what employers
published — so a different wallet, or a mistyped key, simply matches nothing.

### 1.2 Send the employer **two** public keys

*View my payroll keys* → **coin public key** and **encryption public key**.

Both, every time. The first identifies their slot. The second is what the
shielded coin is encrypted to — and if the employer files only the first, the
payment **succeeds**, the contract marks the slot paid, and the employee can
never see the money.

**Where it comes from:** **contract + zswap.** Neither key is a secret and
neither lets anyone spend their pay.

### 1.3 Set up a claim key — long before they need it

`/employee` → *Your claim key* → choose a passphrase (typed twice) → send the
employer the **hash**.

The passphrase never leaves the browser. The key is derived from it with
PBKDF2-SHA256 at 600,000 iterations, salted with their own coin public key, so
two people who choose the same words still get different keys. Only the hash is
ever displayed: the key itself is the nullifier secret, and a page that showed it
would invite it into a screenshot.

⚠️ **This has to be done before they are dismissed, not after.** The hash is
written into the employer's termination attestation, which is write-once. An
employee who turns up afterwards with a freshly chosen passphrase has an anchor
they cannot open, and the only correction is re-filing the period.

That is the wrong way round from how a benefit office works, where you arrive
afterwards with nothing but your identity. Anchoring the hash at hire — carried
in the roster, written by `setPayroll` — is the faithful shape; it needs a
contract change and has not been made.

**Where it comes from:** **contract** (the anchoring, and its ordering);
*chosen* (the passphrase, for the same reasons as the employer's — no extension
hands a page a seed, and the connector signs non-deterministically).

---

## 2. While employed

The employee does nothing on chain. Three things arrive.

### 2.1 Their pay arrives, privately

A shielded pEUR coin lands in their wallet. Its value is not published, and no
observer learns the amount, the employer or the recipient.

### 2.2 Their payslip arrives, out of band

One file per period, from the employer. **This is the only way they learn what
they were paid** — the amounts were never on chain, and `/employee` cannot show
them either.

### 2.3 They check it on `/employee`

*Check your payslip* → file, pasted text, or a link. The page rebuilds the
commitment from the figures and compares it against what the employer published
before payday.

This works **without a wallet connected**, deliberately: a payslip is itself the
credential, and putting an extension install in front of "what was I paid" would
protect nothing. Connecting a wallet adds the two things a payslip alone cannot
prove — that the slot is bound to *their* key, and what their spendable balance
is.

What the check establishes:

- the amounts open the commitment published *before* payday, so nothing was
  edited afterwards;
- the slot is bound to their own wallet key, so a payslip issued to someone else
  will not match;
- the circuit refused any coin whose value was not the committed net — so the
  amount shown is the amount that reached them.

⚠️ **Keep every payslip.** The openings on chain are sealed under the
**employer's** key, so an employee cannot regenerate one. Losing the final
month's payslip means asking the employer who dismissed them to produce it again
— and without it, no claim can be made at all.

---

## 3. When employment ends

The employee does nothing on chain here either.

The employer attests to the termination — naming the final period, the months
worked, and the claim-key hash from step 1.3. Nothing about it is published in
the clear: months worked per slot would be a tenure record, and a claim-key hash
per slot would be a stable handle appearing identically at every employer that
person ever used it with.

**The employer cannot claim on it.** `claim` requires the payee's own wallet key,
which `payeeFor` binds and no employer holds. That assertion is the whole reason
a custodial employee — one whose key their employer derived — is unacceptable
once benefits are involved.

---

## 4. Claiming a benefit

### 4.1 Collect three things

| | From | Why it cannot come from anywhere else |
| --- | --- | --- |
| **Claim bundle** | the fund's relay | It carries the path proving their termination is in that month's tree, alongside everyone else's. They cannot build it — they hold nobody else's leaf, and being unable to is exactly what keeps them anonymous inside it. |
| **Final payslip** | their employer | The nonce that opens the commitment derives from the *employer's* passphrase. |
| **Their passphrase** | themselves | The only input nobody else can supply. |

### 4.2 Claim on `/claim`

Load both files, enter the passphrase, submit. The proof is built in the page;
neither file is uploaded anywhere.

Everything the circuit checks is checked here first, so a wrong file names
itself instead of failing as `assertion failed` after minutes of proving:

- the payslip is for this contract, this period, this slot;
- the bundle was filed for the connected wallet;
- the payslip figures open the published commitment;
- **the passphrase reproduces the anchored claim key** — the likeliest failure,
  and the one worth naming precisely, since the anchor is write-once;
- the pool coin covers the benefit.

### 4.3 What they receive

The benefit, **net of withholding**, as a shielded coin:

```
€220 gross salary
  → €154.00 benefit          min(gross, cap) × rate
  → −€55.055 tax             the same bands their salary was taxed under
  → −€4.62 contribution
  → €94.325 paid
```

The tax schedule is not chosen by anyone at claim time: the circuit checks it
hashes to the `paramsHash` bound into their own salary commitment, so the benefit
is withheld under provably the same rules their final month was.

### 4.4 What claiming discloses

The period, the rule-set version, one nullifier, and that a claim happened.
**Not** their identity, their employer, their salary, or the benefit paid.

The nullifier is keyed on their claim key — a secret — rather than on their coin
public key, which is an address they hand out to be paid. Had it been the latter,
every employer they ever had could enumerate windows, test the public spent set,
and read their entire benefit history.

Claiming the same window twice is refused on chain. The spent set is public and
says nothing about whose entries those are.

---

## What they must keep, and what happens if they do not

| | If lost |
| --- | --- |
| Wallet recovery phrase | Their pay and any benefit are unreachable. Nobody can restore it. |
| Claim passphrase | They cannot claim. The anchor their employer published is write-once, so it cannot be re-pointed at a new key. |
| Payslips | They cannot see what they were paid, and cannot claim. Only their former employer can regenerate one. |

Three unrecoverable things, and the third depends on a person they no longer work
for.

---

## The recurring cost

| | Count |
| --- | --- |
| Actions while employed | **0** on chain |
| Files received per period | 1 payslip |
| Files needed to claim | 2 (bundle, final payslip) |
| Passphrases to remember | 1 |
| On-chain transactions they sign | **1**, ever — the claim |

## Where it looks compressible

Observations, not decisions.

1. **A claimant needs the network's fee token.** Someone who has just lost their
   job must hold tDUST to collect a benefit. Sponsorship appears to exist on
   preview; it needs establishing rather than assuming.
2. **Claiming needs a file from the employer who dismissed you.** The final
   payslip is required, and only the employer can regenerate it. That is a
   dependency on a relationship that has just ended badly.
3. **The claim bundle is public data delivered by hand.** Every input to it is
   public payroll state; it is sent as a file only because nothing serves it.
4. **The claim key must exist before the dismissal.** The one ordering
   requirement that no amount of interface work can hide, and the only item here
   that needs a contract change.
5. **Payslips are the employee's only record and their only backup is a former
   employer.** Sealing the openings to the *employee's* encryption key was ruled
   out — the connector exposes no decrypt operation — so this is a wall, not an
   oversight.

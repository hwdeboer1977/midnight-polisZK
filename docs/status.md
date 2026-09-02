# Status, sharp edges, and what is not built

Where the project actually stands, including every trap worth knowing before
changing anything.

[← back to the README](../README.md)

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
| Employees holding their own keys | **working for wallet employees** — both employees in the 2026-08-25 run held their own 1AM wallets and supplied their own keys; the seed-based test employees the CLI generates are still custodial |
| Versioned tax rules (`taxparams`) | **working** — v1 published on preview, append-only |
| Tax and net pay computed in-circuit | **working** — bands pinned by witnessed quotients, verified on chain |
| Withholding into the contract's pools | **built, not wired** — `fundWithholding` compiles and is deployed; no UI calls it, so the pools read €0.00 |
| Remitting to the treasuries | **built, not wired** — same; `remitTax` / `remitSocial` are deployed and uncalled |
| Unemployment fund deployed and funded | **working** — €460 in, rule set v1 published |
| Ending employment | **working** — from the employer's browser and from the CLI |
| Claim tree relay | **working** — root published for 202601 |
| Claims and benefit payment | **working** — €154.00 claimed end to end from the claimant's browser on the pre-withholding fund; see **A benefit claimed** |
| Claimant's claim key | **removed 2026-09-02** — the protocol no longer has one; the nullifier is seeded from the claimant's wallet |
| Claim assembled in the claimant's browser | **working** — leaf, path and fund coin gathered without a bundle file |
| Benefit duration enforced on chain | **working** — `claim` asserts `window < params.durationMonths`; it asserted nothing before 2026-09-02 |
| Recovering a post-claim change coin | **working** — `fund reconcile`, verified against the on-chain commitment |
| Unlinkable nullifiers | **not built** — traded away with the claim key; needs a secret the wallet can reproduce, e.g. WebAuthn PRF. See privacy.md |
| Pool-coin leasing | **not built** — one claimant per period races nobody; two would |
| Benefit withholding | **working** — tax and contribution withheld under the schedule the final month was filed under, pinned by hash |
| Remitting withheld benefit tax | **working** — €55.055 and €4.62 sent to their treasuries and confirmed received |
| Stepped benefit rate | **not modelled** — `BenefitParams` carries one flat rate, not a schedule |

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
- **A shielded send needs the recipient's ENCRYPTION key, and `callTx` cannot
  carry it.** Use `submitCallTx` with `additionalCoinEncPublicKeyMappings` for
  any circuit that sends a coin to someone else. `payPeriod` already did;
  `remitBenefitTax` did not, and failed. **`payroll`'s `remitTax`/`remitSocial`
  are the same shape and have never been run.**
- **A green transaction hash is not proof the money arrived.** Without the
  encryption mapping a coin can be created that its owner can never find. Check
  the recipient's balance, not the tx.
- **`fund-pool.json` is unrecoverable.** It is the only copy of the fund's coin
  nonces. Lose it and the money stays in the contract, unspendable, forever.
- **npm eats CLI flags without `--`.** `npm run fund deposit --amount 10` passes
  npm's own config, not the script's; the flag vanishes and the command fails
  asking for the argument you just typed. Use `npm run fund -- deposit --amount
  10`. The CLI detects this case and says so.
- **A termination opening is not a claim bundle.** `terminations/…json` goes
  employer → relay; `claims/<period>/claim-bundle-…json` goes relay → claimant,
  and only the second has a path. Their filenames were nearly identical until the
  bundle was renamed. Less consequential now: the browser assembles its own
  bundle, so the second file is a fallback rather than the route.
- **The write-once guard fired on the rebuild path.** `surveyEmployment` refused
  a period whose slot was already terminated — right for *ending* employment,
  and exactly backwards for *rebuilding* the opening of one, which by definition
  only happens after a termination exists. It is now opt-in (`allowEnded`).
- **A payslip names the contract that issued it.** After a redeploy, every
  payslip the previous instance issued is refused — correctly, since the
  commitment it opens lives elsewhere now. The message names both addresses,
  because "a different contract" sends someone hunting for a file that does not
  exist yet.
- **`connectContract` took a `contractName` it did not use.** It always imported
  the payroll module while pointing the ZK provider at the named contract's
  assets, so the first non-payroll caller fetched a verifier key for a circuit
  that contract does not have. Fixed by loading through the same `LOADERS` map —
  worth remembering as a shape: a parameter that is only *partly* honoured is
  worse than one that is missing.
- **A stale comment outlived the bug it described.** `payroll-run.ts` claimed
  coin circuits could not be proved in the browser for a long time after that was
  fixed and written up here. When the README and a code comment disagree about a
  defeat, check the README.
- **`deployment.json` silently outranks the `.env` baseline.** On a managed host
  it lives under `DATA_DIR`, so a stale record on a persistent disk overrides a
  corrected environment variable. The only signal is a warning naming both
  addresses. A fund pinned to a superseded address decoded *plausibly wrong* —
  `contributedTotal` read `1` — before throwing `expected a cell, received map`
  on the first field whose layout had moved.
- **Two installs of `compact-runtime` break `instanceof`.** A module under
  `frontend/src/generated/` resolves the runtime from `frontend/node_modules`; a
  file under `src/` resolves the root one. **Both the same version**, so nothing
  in a lockfile hints at it — but a `ContractState` deserialized by one is not
  `instanceof` the other's `ChargedState`, and `ledger()` throws
  `expected instance of ChargedState`. Server code must resolve generated modules
  through `contractModulePath()`. Bit `fund-deposit.ts` and later `relay-run.ts`,
  where it surfaced as *"contract state unreadable, or it predates this build"* —
  blaming a contract that was fine.
- **A generated ledger is lazy.** `ledger()` succeeds on any state and each
  getter decodes on access, so a `try/catch` around `ledger()` protects nothing.
  Extract the fields **inside** the try, or a mismatch escapes as an unhandled
  rejection and the page waits forever instead of reporting "unreadable".
- **Bech32m in the wallet, hex everywhere else — and it fails silently.** A key
  published from `account.coinPublicKey` and looked up against a workbook's hex
  matches nothing, with no error. Normalise with `keyToHex` at *both* ends of any
  cross-boundary comparison.
- **`payeeHash` includes the period**, deliberately, so a worker cannot be linked
  across months. Grouping employees by it therefore produces one row per person
  *per period* — a roster that grows by its own headcount every month.
- **A claim bundle goes stale.** It carries a specific fund coin, and the coin
  dies the moment another claimant spends it. The entitlement evidence never goes
  stale; only the coin does. Rebuilding is the fix, and the coin is not bound to
  the claim — `claim` asserts only `coin.value >= benefitNet`, so any spendable
  fund coin works.
- **The pool file had no `spent` status until it cost a claim.** `reconcile`
  recorded the change coin and left its parent looking spendable — and the parent
  is usually the *largest* record, so everything that picks by value picked the
  dead coin first. It now marks the parent, which it can do reliably because it
  identifies it by rebuilding the change's commitment from the parent's nonce.
- **The relay cannot size a coin to a benefit**, because the benefit derives from
  a salary it never sees. It warns against `cap × rate` — the most any benefit can
  be — which is the strongest honest statement available, and it warns when
  `coinsReceived` on chain exceeds the records in the pool file, which is
  reconciliation being overdue.
- **`PILOT_DURATION_MONTHS` is not enforced.** `claim` never constrains `window`
  against `leaf.finalPeriod` or any limit, so three monthly payments is what the
  app *shows*, not what the fund *allows*. Closing it needs the duration inside
  `BenefitParams` and an assertion in `claim` — which means republishing every
  version and redeploying, since `claim` is impure and its verifier keys are fixed
  at deploy.
- **"Rate limited" is usually the public indexer, not this app.** It answers a
  burst with that bare string, which lands in a red box under a claim form and
  reads as the claim being refused. Nothing was submitted. `explainError()`
  recognises it and says so.

## Not built yet

Money is **assessed, not collected**. `setPayroll` computes tax, contribution
and net per employee in circuit and publishes the totals, and the payment path
from contract to employee works end to end — but the three withholding circuits
that would move the withheld money have no caller. Until the UI calls
`fundWithholding`, `taxPool` and `socialPool` are genuinely zero, and the Public
page says so rather than showing an assessed figure as if it had been collected.

The benefit side is now the opposite shape: it works end to end, and the money
in it got there by hand. **Contributions do not reach the fund.** A payroll
contract cannot call the fund, so a remittance is a transfer to a key and then a
deliberate `fund deposit` by whoever holds it. The €460 in the fund was put there
by the operator, not collected from anyone's payroll.

In order:

1. **Wire withholding.** `fundWithholding`, then `remitTax` / `remitSocial`.
   The circuits are deployed; this is client work.
2. **Connect contributions to the fund.** Today the two halves are assessed and
   paid independently: the fund's own withholding reaches its treasuries, but
   nothing carries payroll contributions *into* the fund. Closing that loop is an
   operational design — who holds the key between `remitSocial` and
   `fund deposit` — before it is code.
3. ~~**Anchor the claim key at hire.**~~ **Done differently, 2026-09-02.** The
   problem was that an employee had to hand a hash to her employer *before*
   being dismissed, into a write-once statement that stranded her if it was
   wrong. Rather than move the anchor earlier, the claim key was removed: the
   nullifier is now seeded from `ownPublicKey()`, which the wallet cannot lie
   about. The ordering constraint, the hand-over and the failure mode all went
   with it. What it cost is unlinkability — see
   [privacy.md](privacy.md#wave-2-hardening).
4. **Model the benefit properly.** ~~Withholding~~ is done — the benefit is taxed
   under the same schedule the final salary was, so it can no longer exceed net
   pay. Still missing: a rate that **steps down** after the opening months, which
   needs a schedule in `BenefitParams` rather than one flat rate, and deriving
   the benefit from a **reference year** rather than the final month alone.
5. **Employees holding their own keys** is **done for wallet-based employees**:
   both employees in the 2026-08-25 run held their own 1AM wallets, supplied
   their own coin and encryption public keys, and one claimed with her own
   wallet. What remains custodial is the seed-based test employees the CLI
   generates.

The tax-and-vault appendix describes a four-contract version of this with
separate tax and contribution vaults. It is superseded — see **What the compiler
would not do** for why that shape cannot be built.

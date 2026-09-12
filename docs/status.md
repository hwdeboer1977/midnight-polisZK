# Status, sharp edges, and what is not built

Where the project actually stands, including every trap worth knowing before
changing anything.

[← back to the README](../README.md)

> **All five contracts were redeployed on preview on 2026-09-11**, from the
> reviewed source and with a new pEUR token — addresses and transactions in
> [findings.md](findings.md#deployed-2026-09-11). The new payroll has nothing
> filed and the new fund has paid no claim, so rows that need a real run on the
> new contracts say so.

## Status at a glance

| Capability | State |
| --- | --- |
| Per-period commitments, salaries private | **working**, verified on chain |
| Sealed openings recoverable from chain | **working**, cross-verified Node ↔ browser |
| Filing payroll from the browser | **working** |
| Full cycle in the browser, employer's own key | **working** — filed, funded, paid and remitted, all five transactions, in the 202609 run on `payroll:pilot-v1` |
| Contract holding shielded pEUR privately | **working**, verified byte level |
| Funding slots (one tx each) | **working** |
| Paying a whole period in one tx (`payPeriod`) | **working** — from CLI and from the browser |
| Paying slot by slot (`payEmployee`) | **retained but avoid** — fails part way with `170`; use `payPeriod` |
| Proving coin circuits in the browser | **working** — funding and payment both proved in the page |
| Wallet-delegated proving (`getProvingProvider`) | **working** — 2 funded, 2 paid, 159s |
| Several periods paid on one contract | **working** — coin ordinals map each slot to its own leaf |
| DUST sponsorship | **untested** — mechanism exists in the SDK; attempts failed with `138` |
| Employees holding their own keys | **working for wallet employees** — both employees in the 2026-08-25 run held their own 1AM wallets and supplied their own keys; the seed-based test employees the CLI generates are still custodial |
| Versioned tax rules (`taxparams`) | **working** — `fdcb22a8…` deployed 2026-09-11, v1 published, append-only |
| Tax and net pay computed in-circuit | **working** — bands pinned by witnessed quotients, verified on chain |
| Withholding into the contract's pools | **working on the previous instances** — `fundWithholding` ran for 202609 on `payroll:pilot-v1` and on the previous `preview/payroll`; €200.20 tax and €16.80 contribution moved into the pools |
| Remitting to the treasuries | **working on the previous instances** — `remit` ran twice for 202609 (once per destination); €200.20 and €16.80 sent to the treasury wallets frozen at deploy, and both pools back to €0.00. Verified against the indexer 2026-09-08 |
| Payroll on the new contracts | **deployed, nothing filed** — `2747020d…`, employer `9e584bd4…` assigned, 2026 open. The employer needs pEUR in the new token before funding anything |
| Pay token frozen at deploy | **deployed 2026-09-11** — payroll and taxvault frozen to pEUR `7ec1d9ec…`, read back from chain |
| Termination requires funded withholding | **deployed 2026-09-11** — tested locally; not yet exercised on chain |
| Unemployment fund deployed and funded | **working** — `fund` `ae30b288…`, deployed 2026-09-11; €300.00 deposited by the operator (coin #0); rule set v1 published and recorded for final periods 202601–202612 (cap €4,000/mo, 70%, `minMonths` 1, three months) |
| Ending employment | **working** on the previous payroll — from the employer's browser and from the CLI |
| Claim tree relay | **working** on the previous fund — root published for 202609. None on the new fund yet: the new payroll has no termination |
| Claims and benefit payment | **working on the previous build** — €154.00 benefit (final gross €220.00 × 70%) claimed end to end from the claimant's browser on `eb40dcad…`, taxed inside the claim circuit and paid out at €94.325 net. **Not yet run on the new fund**; the new claim has run only locally |
| Claimant's claim key | **removed 2026-09-02** — the protocol no longer has one; the nullifier is seeded from the claimant's wallet |
| Claim assembled in the claimant's browser | **working** — leaf, path and fund coin gathered without a bundle file |
| Benefit duration enforced on chain | **deployed 2026-09-11** — `claim` names a calendar month after the final period, not before it starts, once per wallet. Not yet exercised by a real claim |
| Benefit rules pinned per final period | **deployed 2026-09-11** — v1 recorded for 202601–202612 on `ae30b288…` |
| Recovering a post-claim change coin | **working** for one send — `fund reconcile`, verified against the on-chain commitment. The new claim's three chained sends have been recovered only locally |
| Unlinkable nullifiers | **not built** — traded away with the claim key; needs a secret the wallet can reproduce, e.g. WebAuthn PRF. See privacy.md |
| Pool-coin leasing | **not built** — one claimant per period races nobody; two would |
| Benefit withholding | **working** — tax and contribution withheld under the schedule the final month was filed under, pinned by hash. Since 2026-09-11 it is sent to the treasuries inside the claim |
| Remitting withheld benefit tax | **removed** — nothing withheld stays in the fund. The previous fund `eb40dcad…` still holds €55.055 tax and €4.62 contribution in its pools (read 2026-09-11), remittable only by the previous build |
| Stepped benefit rate | **not modelled** — `BenefitParams` carries one flat rate, not a schedule |

### Known sharp edges

- **A redeployed site has to move as a unit.** The committed
  `frontend/public/zk` and `frontend/src/generated` now hold the 2026-09-11
  build; Vercel's `VITE_*` values, Render's `.env` addresses and its
  `deployment.json` under `DATA_DIR` must all name the new contracts at the same
  time, or the site runs one build against another's contracts. The removed remit
  circuits' key files also stay behind in `public/zk/fund`: the copy step never
  deletes.
- **A new pEUR is a new token.** Every balance held in the previous one — the
  employer's, the employees', the treasuries' — is unusable with the 2026-09-11
  contracts, which froze `7ec1d9ec…`. Anyone who needs pEUR mints it again.
- **Every contract change invalidates every deployed instance.** Verifier keys
  are fixed at deploy, so adding a circuit makes `findDeployedContract` refuse
  with `circuitIds: [...]`. There were several redeploys in one day for this.
- **A fund has no withdrawal circuit, so a redeploy strands the old one.**
  `eb40dcad…` still holds its pools and its remaining coins; only the previous
  build can move them.
- **Old instances left in `deployment.json` break the page.** Decoding one with
  a newer module throws `tried to idx, only map, array, and bmt are supported`.
  Instances are now decoded individually so one failure drops a single card
  instead of the whole list, but prune stale deployments anyway.
- **An archived record can shadow a live one.** `frontend:config` used to take
  the pEUR token id from every pEUR record it listed, so the archived
  `preview/peur:pre-20260911` overwrote the live token with the retired one. It
  now reads only the live, un-retired record. Anything else that picks "the"
  contract by name from a list deserves the same suspicion.
- **`npm run dev` in `frontend/` skips `frontend:config`.** The compiled
  contract module, ZK assets and deployment addresses are copied by that step,
  so run `npm run frontend:config` (it works from either directory) after any
  `npm run compile` or redeploy.
- **Long-running processes hold their own copy of the contract.** Restart
  `demo:server` after recompiling.
- **Roster size is compile-time.** Changing it means editing every
  `Vector<N, …>`, recompiling and redeploying.
- **A shielded send needs the recipient's ENCRYPTION key, and `callTx` cannot
  carry it.** Use `submitCallTx` with `additionalCoinEncPublicKeyMappings` for
  any circuit that sends a coin to someone else. `payPeriod` already did;
  `remitBenefitTax` did not, and failed. **`payroll`'s `remit` is the same shape
  and ran successfully for 202609**, so the caller now in use does carry the
  mapping. The new `claim` sends to both treasuries and goes through
  `submitCallTx` for the same reason. (`remitTax` and `remitSocial` were merged
  into a single `remit` that takes an `isTax` flag, to stay under the contract
  size ceiling; older notes still use the two names.)
- **A green transaction hash is not proof the money arrived.** Without the
  encryption mapping a coin can be created that its owner can never find. Check
  the recipient's balance, not the tx.
- **The new claim spends change inside its own transaction, untested on chain.**
  Its three sends run correctly in the local runtime. Spending a coin created
  earlier in the same transaction, and a zero-value send (which a zero tax or
  contribution rate would produce), have not been tried on preview.
- **A second transaction straight after a deploy can fail with `170`.** The
  pEUR deploy script mints in the same process right after deploying, and on
  2026-09-11 the mint was refused as a stale dust proof. Minting from a fresh
  process worked.
- **An inline `node -e` script cannot prove.** The in-process prover starts its
  workers with the parent's flags, and `--input-type=module` is only valid with
  inline code, so every worker dies with `--input-type can only be used with
  string input via --eval`. Put a one-off script in a file.
- **`deploy:tax` reuses any registry it can find**, in `deployment.json` or in
  the `.env` baseline. A fresh registry needs the record moved to an archive key
  *and* `taxparams_address` blanked.
- **Nothing writes `.env`.** A deploy saves to `deployment.json` only. Every
  address and `peur_token_id` is copied into `.env` by hand, and later deploys
  read `peur_token_id` from there — so the order matters.
- **`fund-pool.json` is unrecoverable.** It is the only copy of the fund's coin
  nonces. Lose it and the money stays in the contract, unspendable, forever.
- **npm eats CLI flags without `--`.** `npm run fund deposit --amount 10` passes
  npm's own config, not the script's; the flag vanishes and the command fails
  asking for the argument you just typed. Use `npm run fund -- deposit --period
  202609 --amount 10`. The CLI detects this case and says so.
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
  the claim — any spendable fund coin holding more than the whole benefit works.
- **A receipt ordinal is not a leaf position.** The fund's coins used to be
  located by indexing its leaves with the ordinal, which breaks whenever one
  transaction creates more than one coin — and every new claim creates three.
  The CLI, the relay and `/api/pool-coin` now find a coin by rebuilding its
  commitment.
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
- **A published benefit rule set applies to nothing until it is recorded.**
  `fund params` must be followed by `fund rules` for the months it covers, or no
  claim against those final periods can be made. The relay and the claim page
  both say so.
- **"Rate limited" is usually the public indexer, not this app.** It answers a
  burst with that bare string, which lands in a red box under a claim form and
  reads as the claim being refused. Nothing was submitted. `explainError()`
  recognises it and says so.

## Not built yet

On the previous payroll instances money was **collected and remitted**: for
202609, `fundWithholding` moved €200.20 of tax and €16.80 of contribution into
the pools and two `remit` calls sent them to the two treasury wallets, leaving
both pools at €0.00 (read back 2026-09-08). None of that carries over — the
2026-09-11 payroll starts empty and settles in a new token.

What is still open is the **second hop**. A payroll contract cannot call the
fund, so a remittance lands in a wallet the operator holds, and reaching the fund
takes a deliberate `fund deposit` afterwards. **Contributions still do not reach
the fund.** The only deposit on the new fund `ae30b288…` is €300.00 put in by the
operator on 2026-09-11.

In order:

1. ~~**Wire withholding.**~~ **Done.** `fundWithholding`, then `remit` once per
   destination, all called in the 202609 run.
2. ~~**Redeploy the 2026-09-11 build.**~~ **Done 2026-09-11**, all five
   contracts. **Still open: one real claim on the new contracts.** The employer
   mints pEUR in the new token, files, funds, pays and withholds a month, and ends
   an employment; the month's claim tree is published; the claimant claims. Then
   check the claimant's and both treasuries' balances, and run `fund reconcile`,
   which exercises the three-step change nonce on chain for the first time.
3. **Connect contributions to the fund.** Payroll remits into its treasury
   wallets, but nothing carries the money on *into* the fund. Closing that loop
   is an operational design — who holds the key between the contribution `remit`
   and `fund deposit` — before it is code.
4. ~~**Anchor the claim key at hire.**~~ **Done differently, 2026-09-02.** The
   problem was that an employee had to hand a hash to her employer *before*
   being dismissed, into a write-once statement that stranded her if it was
   wrong. Rather than move the anchor earlier, the claim key was removed: the
   nullifier is now seeded from `ownPublicKey()`, which the wallet cannot lie
   about. The ordering constraint, the hand-over and the failure mode all went
   with it. What it cost is unlinkability — see
   [privacy.md](privacy.md#wave-2-hardening).
5. **Model the benefit properly.** ~~Withholding~~ is done — the benefit is taxed
   under the same schedule the final salary was, so it can no longer exceed net
   pay. Still missing: a rate that **steps down** after the opening months, which
   needs a schedule in `BenefitParams` rather than one flat rate, and deriving
   the benefit from a **reference year** rather than the final month alone.
6. **Employees holding their own keys** is **done for wallet-based employees**:
   both employees in the 2026-08-25 run held their own 1AM wallets, supplied
   their own coin and encryption public keys, and one claimed with her own
   wallet. What remains custodial is the seed-based test employees the CLI
   generates.

The tax-and-vault appendix describes a four-contract version of this with
separate tax and contribution vaults. It is superseded — see **What the compiler
would not do** for why that shape cannot be built.

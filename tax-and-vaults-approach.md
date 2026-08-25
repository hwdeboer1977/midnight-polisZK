> **Superseded — kept as the record of what was tried.**
>
> This is the pre-probe design. Its section 0 asks whether a contract can send a
> shielded coin to another contract; the probes in `probe/` answered **no**, and
> also ruled out a contract reading another's ledger. The four-contract shape
> below — separate `tax_vault` and `contribution_vault` — is therefore not
> buildable on Midnight today.
>
> What was built instead: withholding pools inside the `payroll` contract,
> remitted to treasury **wallets** whose keys are frozen in the constructor. See
> **What the compiler would not do** and **taxparams** in `README.md`. Sections
> 1–3 here (the registry, the commitment struct, the band arithmetic) survived
> essentially intact; sections 4–6 did not.

# Tax parameters and vault routing — design approach

Four contracts after this change:

| Contract | Instances | Holds money | Purpose |
|---|---|---|---|
| `taxparams` | one, shared | no | versioned rule sets, keyed by effective period |
| `payroll` | one per employer | net coins, briefly | files periods, funds slots, pays employees |
| `tax_vault` | one, shared | yes | receives withheld tax; drains to the authority |
| `contribution_vault` | one, shared | yes | pools contributions; pays benefits |

---

## 0. Probe first — do this before writing anything

Two unknowns will dictate the architecture. Both are cheap to settle with a stub.

**P1 — can a contract send a shielded coin to another contract?**
`sendShielded(coin, right<ZswapCoinPublicKey, ContractAddress>(vaultAddr), value)` — does the receiving contract need to run a circuit in the same transaction to accept it, and does that mean `payroll` must *call* `tax_vault`? Extend `vault.compact` with a `depositFrom(contract)` circuit and try it from a second stub contract.

**P2 — transaction size with three sends.**
One `fundPeriod` call producing N net coins plus 2 vault coins. If size or proving cost blows up, the fallback below applies.

**Fallback if P1 fails:** the employer funds all three destinations directly in the same transaction — `payroll.fundPeriod` receives the net coins, `tax_vault.deposit` and `contribution_vault.deposit` receive theirs — and `payroll` asserts the vault amounts against the committed figures via a shared `periodTotalsHash`. Same guarantees, no contract-to-contract call, more coordination in the client.

---

## 1. `taxparams` — the registry

```compact
struct TaxParams {
  version:        Uint<16>;
  validFrom:      Uint<32>;             // YYYYMM
  thresholds:     Vector<2, Uint<60>>;  // monthly, cents
  rates:          Vector<3, Uint<16>>;  // basis points
  maxContribBase: Uint<60>;             // monthly, cents
  contribRate:    Uint<16>;             // basis points, employee-paid (v1 simplification)
}

export ledger paramsFor: Map<Uint<32>, TaxParams>;   // validFrom -> params
export ledger frozen:    Map<Uint<32>, Boolean>;
export ledger authority: ZswapCoinPublicKey;
```

Rules:

- **Append-only.** Never overwrite a version. A payroll filed for 202608 must stay verifiable against the rules in force in 202608, forever. Overwriting silently changes the meaning of every past filing and every claim derived from it.
- **Freeze on first use.** Once any payroll has filed against a version, `frozen[v] = true` and it can never be edited — otherwise the registry operator can retroactively rewrite what an employer already submitted.
- **Publish a `paramsHash`.** `persistentHash<TaxParams>(p)` is what `payroll` records, so a claim circuit can prove *which* rules produced a given attestation without re-reading the registry.
- **Authority is not the platform.** In production this is a public body or a threshold key. For the demo it's one key you hold — say so on the page rather than implying otherwise.

---

## 2. Commitment struct in `payroll`

```compact
struct SalaryCommitment {
  gross:      Uint<60>;
  tax:        Uint<60>;
  contrib:    Uint<60>;
  net:        Uint<60>;
  weeks:      Uint<8>;
  period:     Uint<32>;
  employer:   ZswapCoinPublicKey;
  paramsHash: Bytes<32>;
  nonce:      Bytes<32>;
}
```

`period`, `employer` and `paramsHash` are bound *inside* the hash. The claim circuit is a different contract reading these commitments; without binding, an attestation can be replayed across periods or across employer instances.

---

## 3. The calculation, in `setPayroll`

Per employee, then summed. Never the reverse.

```
b1     = min(gross, t1)
b2     = gross > t1 ? min(gross, t2) - t1 : 0
b3     = gross > t2 ? gross - t2 : 0
tax    = (b1*r1 + b2*r2 + b3*r3) / 10000
contrib= min(gross, maxContribBase) * contribRate / 10000
net    = gross - tax - contrib
```

**Floor division does not distribute.** `Σ f(gross_i) ≠ f(Σ gross_i)` — the two differ by up to N cents. The commitment holds the per-employee figure, so the vault must receive the *sum of per-employee* amounts, not a recomputation from the total. Compute per employee, accumulate, publish the accumulation.

Assert `gross == net + tax + contrib` per employee rather than deriving `net` twice.

New public ledger fields, alongside `totalPayrollFor`:

```compact
export ledger totalTaxFor:     Map<Uint<32>, Uint<64>>;
export ledger totalContribFor: Map<Uint<32>, Uint<64>>;
export ledger paramsHashFor:   Map<Uint<32>, Bytes<32>>;
```

`setPayroll` takes `params: TaxParams` as an argument, asserts `persistentHash(params) == paramsHashFor[p]` (looked up from the registry), asserts `params.validFrom <= p`, and computes from it. The params are public, so anyone can recheck the arithmetic against the published totals.

---

## 4. Routing — `fundPeriod`

Replaces per-slot `fundEmployee`. One call, one transaction, three destinations.

```
fundPeriod(period, salaries[], nonces[], params, netCoins[], taxCoin, contribCoin)
```

Asserts:

1. every `(gross, tax, contrib, net, ...)` opens its committed hash
2. `netCoins[i].value == net_i` for each slot
3. `taxCoin.value == totalTaxFor[p]`
4. `contribCoin.value == totalContribFor[p]`
5. all coins share `payToken`
6. deposit conservation: `Σ netCoins + taxCoin + contribCoin == Σ gross`

Then: `receiveShielded` the net coins into slots, and send `taxCoin` to `tax_vault`, `contribCoin` to `contribution_vault`.

**Atomic on purpose.** Tax withheld but not remitted, or contributions collected without an entitlement record, are both worse states than a clean failure.

---

## 5. The vaults

**`tax_vault`** — a sink.

```compact
export ledger totalReceived: Uint<64>;   // public, cumulative
export ledger totalRemitted: Uint<64>;
export ledger authority:     ZswapCoinPublicKey;
```
`deposit(coin)` from any accredited payroll instance; `remit(coin, to)` restricted to `authority`. No per-employer breakdown on chain — that would publish each firm's wage bill by division.

**`contribution_vault`** — a pool.

```compact
export ledger totalContributions: Uint<64>;
export ledger totalBenefitsPaid:  Uint<64>;
export ledger claimsSettled:      Uint<32>;
```
`deposit(coin)`; `payClaim(proof, coin, to)` in wave 2, verifying an entitlement proof rather than a caller identity. Balance is derivable as `contributions - paid`, which is exactly the solvency figure the Public view already promises.

---

## 6. What this newly leaks — decide deliberately

- Params are public and `totalTaxFor[p]` is public, so **Σgross is recoverable by inverting the bracket function**. It already was, from `totalPayrollFor`. No new exposure, but now it's exact rather than approximate.
- **Vault deltas.** With one employer filing at a time, a vault balance change is that employer's tax total — which their own contract already published. No new information. This changes once several employers file in the same block: then the vault aggregates and the deltas get *harder* to attribute. Pooling improves privacy here; note it.
- **`paramsHash` per period** reveals which rule version applied. Harmless, and necessary for verifiability.

---

## 7. Order of work

1. Probe P1 and P2 — a day at most, and the answer decides §4
2. `taxparams` deployed with the 2026 Dutch version, frozen
3. `payroll` v2: new struct, tax computation, three new ledger fields, `fundPeriod`
4. `tax_vault` and `contribution_vault` with deposit only
5. Redeploy, re-file the simulated history against the new schema
6. `payClaim` and the entitlement proof — wave 2

Steps 2–4 are one redeploy. Do not split them: verifier keys are fixed at deploy, so every schema change costs a full redeploy and a re-filing of history.

---

## 8. Open questions to settle before coding

- **Is `contrib` deductible from the tax base?** `tax = f(gross - contrib)` is historically faithful to the old Dutch employee premium; independent levies are simpler and avoid a sequencing dependency. Pick one and write it down — it changes every number.
- **Who is `authority` on each vault, and is it the same key as the params authority?** Different in production; probably the same in the demo. Say which.
- **Does `remit` need to exist in wave 1?** A sink with no drain is fine for a demo and one less circuit to get wrong.

# Operations

Funding, paying, networks, deployments, and how to read an error that names
a number instead of a cause.

[← back to the README](../README.md)

## Funding and paying

Funding and payment are separate transactions, and that is forced rather than
chosen: `sendShielded` needs a coin's `mt_index`, and a coin received in the same
transaction does not have one yet. A contract cannot receive and forward
atomically.

**Funding adds coins; paying spends them.** Adds commute, so ten funding
transactions are independent. Ten slots funded as ten transactions worked; the
payments then succeeded four times and failed on the fifth with
`Invalid Transaction: Custom error: 170`, reproducibly at the same slot.

That code decodes — via the `midnight-status-codes` plugin — as
**`InvalidDustSpendProof`: the dust spend proof is invalid**, fixed by
regenerating it. It is a **fee** problem, not a contract-coin problem: DUST pays
fees, and firing transactions back to back leaves the wallet's DUST spend proof
stale.

⚠️ An earlier version of this file explained 170 as contract-coin sequencing —
each payment invalidating the view the next was built against. That was wrong,
and it survived because the symptom fits both stories. It also explains why a
"wait for the paid flag" fix changed nothing: it waited on the *contract's*
state when the stale thing was the *wallet's DUST*. **Look the code up before
theorising.**

`payPeriod` batches all ten sends into one transaction, and **this is the one to
use**. One transaction needs one DUST spend proof instead of ten, so the failure
above does not arise. Verified end to end:

```
STEP 1  setPayroll 202608     filed
STEP 2  funding 10 slots      funded 1..10/10
STEP 3  payPeriod             OK in 90s

RESULT paid 202608: 1111111111
```

Ten employees paid in a single transaction, 90 seconds of proving. The prover
key is **73 MB** against 9 MB for a single payment, but the wall-clock cost is
lower than ten sequential payments — and those do not complete anyway.

It also removes a leak, independently of the bug: ten payments publish ten
events showing which slot settled when, where one transaction settles the month
with no per-employee signal. The same argument that makes `setPayroll` a single
call.

Batching is all-or-nothing, which for payroll is the right failure mode — a
half-paid month is worse than one that failed cleanly and can be retried. The
single-slot `payEmployee` is retained for finishing months that are already
part-paid, since `payPeriod` asserts every slot is unpaid.

⚠️ Verifier keys are fixed at deploy, so adding a circuit needs a **redeploy** —
a contract deployed before `payPeriod` existed has no key for it and
`findDeployedContract` refuses with `circuitIds: ['payPeriod']`.

### Cost: eleven proofs, not one

Filing a period is one transaction and one proof. Funding and paying is eleven:
ten `fundEmployee` transactions, one per employee, then a single `payPeriod`.

| | Transactions | Prover key |
| --- | --- | --- |
| `setPayroll` | 1 | 9.5 MB |
| `fundEmployee` | 10 | 5.0 MB each |
| `payPeriod` | 1 | 73.4 MB |

Prover key size tracks circuit complexity, not proving time: the 73 MB batch
proof takes about 90 seconds, while the ten small funding transactions dominate
the wall clock. Batching funding the way payment was batched would collapse
eleven transactions into two, and the same argument applies — adds commute, so
there is no correctness objection, only proof size.

⚠️ If proving suddenly gets slower, check the proof server is not still running
with `RUST_LOG=debug` from a debugging session. It logs nothing useful about a
rejected request and slows every proof after it.

### Finding the coin that funds a slot

The contract records it, because the caller cannot work it out. `sendShielded`
needs a coin's `mt_index`, and `filter(address)` lists every coin the contract
ever RECEIVED — spent ones included, with no unspent view and `nullifiers`
reading empty.

Two bugs came from trying to infer it instead, and both only appeared once a
contract had history:

- Counting leaf positions from zero paid an **earlier period's already-spent
  coins**, surfacing as `Public transcript input mismatch` while proving, then
  as `239 NullifierAlreadyPresent` under the `103` umbrella when submitting.
- Deriving the coin nonce from `(period, index)` alone meant re-filing a period
  and funding it again rebuilt the **identical coin** — same nonce, value and
  recipient, therefore the same commitment — which Zswap rejects as
  `240 CommitmentAlreadyPresent`, also surfacing as `103`.

Both are fixed in the ledger rather than in client heuristics:

```
fileRoundFor   period -> filings so far; part of the coin nonce, so a re-filed
                         period funds fresh coins that are still derivable
coinsReceived  running count of coins received
coinOrdinalFor period -> index -> which coin funds that slot
```

Coins enter the tree in creation order, so the n-th coin the contract received
is its n-th leaf, and the ordinal maps a slot straight to it. This publishes
ordering, which the leaf list already made public, and no value.

Verified with two periods paid on one contract: slots map to ordinals 0,1 and
2,3 respectively.

### Paying needs the recipient's encryption key

`payEmployee` sends to a coin public key, but a shielded coin can only be
*found* by someone whose encryption key the transaction was built with. Without
it the payment succeeds and the money is unreachable. The `callTx` shorthand
cannot carry the mapping, so payment uses `submitCallTx`:

```ts
additionalCoinEncPublicKeyMappings: new Map([[coinKey, encKey]])
```

The same requirement is documented on `peur.mintTo`.

## Decoding node and proof-server errors

Midnight's failures arrive as bare numbers — `Invalid Transaction: Custom error:
170` — with no message. Two of them cost real debugging time here, and both were
diagnosed wrongly from the symptom before being looked up.

Install the lookup rather than guessing:

```bash
claude plugin marketplace add https://midnightntwrk.expert
claude plugin install midnight-status-codes@midnight-expert
```

(The docs also offer `curl -fsSL https://midnightntwrk.expert/install.sh | bash`.
The two commands above do the same thing without piping a remote script into a
shell.)

Codes met so far, each one diagnosed wrongly from the symptom first:

| Code | Name | What it actually meant here |
| --- | --- | --- |
| `170` | `InvalidDustSpendProof` | The **fee** proof went stale across rapid transactions — nothing to do with the contract's coins |
| `138` | `BalanceCheckOverspend` | A balance went negative **after fees**. Fees are paid in DUST: *raising NIGHT will not help*, and DUST registration is self-funding so it is not the cause |
| `400` (proof server) | `WorkError::BadInput` | Malformed or undeserializable binary body — the request never reached proving |

The `138` entry is worth reading in full before touching DUST registration: it
explicitly rules out both theories that seemed obvious at the time — that the
UTXO was already registered, and that more NIGHT was needed.

Other plugins in that marketplace cover the proof server API, dApp development,
the indexer, the node and wallets. Skills activate immediately; **slash commands
only appear after restarting Claude Code**.

`midnight-dapp-dev` is worth installing before writing any browser provider
code — its `dapp-connector/references/browser-providers.md` is the reference
that resolved the proving failure above, and every divergence from it turned out
to be a bug.

## Deployments and instances

`deployment.json` keys every deployment as `<networkId>/<contract>[:instance]`:

```
undeployed/payroll:acme
preview/payroll:blockstat-solutions-v5
preview/taxparams
preview/peur
```

`taxparams` has no instance suffix: there is one registry per network, shared by
every employer.

The network is part of the key because the same contract is routinely deployed
to the local devnet and to preview, and those are entirely different chains.
The instance suffix exists because one payroll contract is deployed per
employer, so the contract name alone is not unique. Each instance also gets its
own private state store and its own secrets file.

Older layouts — a single record at the top level, or network-less keys — are
re-keyed on read from each record's own `networkId`, so nothing is lost.

## Networks

| `MIDNIGHT_NETWORK` | Network id   | Wallet                                  |
| ------------------ | ------------ | --------------------------------------- |
| `local` (default)  | `undeployed` | pre-funded dev seed, no config needed   |
| `preview`          | `preview`    | funded wallet required                  |
| `preprod`          | `preprod`    | funded wallet required                  |

Set `MIDNIGHT_NETWORK` to match your wallet — the address prefix says which
network it is on (`mn_addr_preview1...` vs `mn_addr_preprod1...`). Funds do not
cross networks.

### Using a wallet you funded elsewhere

Browser wallets (Lace, IAM) export a **24-word recovery phrase**, never a raw
private key. Put it in `.env` as `WALLET_MNEMONIC` and the app derives the same
keys the wallet uses — BIP-39 to a master seed, then HD roles at account 0,
index 0, which is byte-for-byte what the Midnight SDK's own wallet builder does.

```bash
# .env — never commit this, never paste the phrase into a chat or an issue
MIDNIGHT_NETWORK=preview
WALLET_MNEMONIC="word1 word2 ... word24"
```

Then confirm it derived the wallet you meant:

```bash
npm run check-balance
```

It prints the unshielded address before touching the network. **That address
must equal the one your wallet app shows.** If it does not, the phrase is for a
different wallet or a different network — stop there rather than funding it.

If you have no funded wallet yet, run `npm run check-balance` anyway to get the
address, fund it at that network's faucet, and re-check. tNIGHT must be
registered for DUST generation before fees can be paid; a wallet that already
shows a DUST balance is registered.

### Sync is cached between runs

A first sync on a remote network replays the whole chain — on preview that is
~115k indices for the shielded and dust wallets, the dust wallet being the slow
one, and it takes roughly 20 minutes. Every command would otherwise pay that
again, so sync state is serialized to `.wallet-state/` (gitignored, mode 0600)
once the wallet reaches the tip, and later runs resume and fetch only the delta.
That turns a ~20 minute wait into ~3 seconds. Each run says which it did:

```
Syncing (resuming from cached state)...
Syncing (no cached state — this can take a while)...
```

The cache holds sync state, not keys, and is keyed by a hash of the master seed
and network — never the seed itself. It is only written after a sync completes,
so a cached state is always one that reached the tip. Drop it with
`npm run wallet:reset` if a chain is reset underneath it, for example after
`docker compose down -v` on the local devnet.

## Finding things on an explorer

Explorer links come from `EXPLORERS` in `frontend/src/lib/chain.ts`, keyed by
network id. A network with no entry renders addresses as plain text rather than
as dead links, on both the public page and the employer's setup page — a link
that goes nowhere in front of a reviewer is worse than no link. This note used
to live in the employer UI, which is a page no developer opens and every
employer does.


Searchable: **contract addresses** (64 hex chars) and **transaction hashes**
(64 hex chars). The CLIs print `Tx hash: ...` for exactly this reason — the
SDK's `txId` is a 66-character midnight-js identifier, *not* the chain hash, and
searching it returns nothing.

Not searchable: a **token type** such as pEUR's. It is a derived identifier, not
an object on chain, and shielded coins leave only commitments in the Zswap tree,
so there is no public per-token balance to look up. To confirm a token exists,
look at the issuing contract instead: its public ledger holds `tokenId`,
`totalSupply` and `issuer`, which `npm run peur` reads.

Confirm any deployment straight from the indexer:

```bash
curl -s -X POST -H 'content-type: application/json' \
  -d '{"query":"{ contractAction(address: \"<address>\") { address transaction { hash block { height } } } }"}' \
  https://indexer.preview.midnight.network/api/v4/graphql
```

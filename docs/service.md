# The service

The small Express app that holds the three things a browser cannot: the
platform wallet, the treasury seeds, and the fund's coin nonces.

[← back to the README](../README.md)

## The service

A small Express app (`src/server/`) that exists for the three jobs a browser
cannot do: hold the platform wallet's seed, hold the two treasury seeds, and
read `fund-pool.json`. Everything else the app does happens in the page.

```bash
npm run server        # build, then serve on :8787
```

`config.ts` refuses to bind anywhere but loopback without `PLATFORM_API_TOKEN`,
so a local service needs no token and a hosted one cannot start without a real
guard. `/api/health` publishes which case it is in, and the UI hides the token
field when there is nothing to send.

### Routes

| Route                        | Guard             | Does                                            |
| ---------------------------- | ----------------- | ----------------------------------------------- |
| `GET  /api/health`           | none              | network, and whether a token is required        |
| `GET  /api/deployments`      | none              | the merged address book                         |
| `GET  /api/job/:id`          | none              | progress for a long-running job                 |
| `POST /api/onboard`          | signup limit      | assigns the payroll contract to an employer     |
| `POST /api/claim`            | signup limit      | the once-only employer starter allowance        |
| `POST /api/relay`            | work limit        | builds a period's claim tree, optionally publishes the root |
| `GET  /api/claim-tree`       | none              | a period's leaf **digests**, so a claimant builds their own path |
| `GET  /api/pool-coin`        | none              | the nonce and value of a fund coin to claim against |
| `GET/POST /api/sealed-roster`| work limit (POST) | the employer's roster, sealed under their passphrase |
| `GET  /api/registrations`    | none              | the registry of onboarded companies             |
| `POST /api/platform/*`       | platform token    | treasuries, fund deposits, mint, faucet, reset  |

⚠️ **`/api/claim-keys` is gone**, along with the `claim_key_hashes` table, when
the claim key was removed from the protocol on 2026-09-02. Nothing replaced it:
a termination no longer anchors anything the employee has to supply.

**Neither new route is logged, and that is a policy rather than a mechanism.** A
period, an IP and a timestamp is a claim-timing record, and it would reconstruct
off chain the linkage the rest of the design pays to avoid. Nothing in the code
enforces it, so the next person to add request logging has to read
`utils/pool-coin.ts` and decide deliberately.

**Why they are unauthenticated.** A digest is the hash of a leaf nobody can
invert, so the list discloses nothing about who was terminated — and it must be
served **whole**, because a request naming one leaf would tell the service which
leaf is the caller's, which is exactly the anonymity `claim` provides by proving
membership without disclosing the leaf. Neither is authoritative either: the root
on chain is, and a path built against a tampered list fails to reproduce it. A
wrong list costs an attempt, never a payment.

**Two rate-limit buckets, because the risks differ.** `signupLimit` (3/hour,
`SIGNUP_LIMIT_PER_HOUR`) covers what spends the *platform's* money — a deploy, a
mint. `workLimit` (30/hour, `WORK_LIMIT_PER_HOUR`) covers work an employer
legitimately repeats: a relay run verifies every opening against the chain and
refuses what does not match, publishing is permissionless anyway, and the other
two write one row. Sharing one bound made a bundle rebuild after a failed claim
answer "try again in 34 minutes" — a limit protecting nothing, applied to the
recovery path for the failure it was blocking.

### What the database holds

Postgres, via `DATABASE_URL`. Every table is created by `initSchema()` on first
write rather than by a migration step, so a fresh machine needs no setup command.

| Table               | Written by                     | Contents                                        |
| ------------------- | ------------------------------ | ----------------------------------------------- |
| `registrations`     | onboarding                     | company name, instance, contract, employer key   |
| `sealed_rosters`    | employer, on filing a period   | network, contract, **AES-GCM ciphertext**        |

⚠️ **`claim_key_hashes` was here and is gone**, dropped on 2026-09-02 with the
claim key itself. Two things are worth recording rather than deleting, because
both were live for a time and both were found the hard way:

- It was unique on `(network_id, coin_public_key)` with **no contract address**,
  so one hash published at one employer answered for that person at *every*
  employer on the network, permanently. That surfaced as a ✓ Collected against
  an employee nobody had collected anything from.
- `GET /api/claim-keys` with no key returned **every row** to anyone — a
  downloadable map of coin public key to claim-key hash, which is the stable
  per-person handle `payeeFor` gives up convenience to avoid. The chain refuses
  to publish it; that endpoint handed it over on request.

Both were fixed by scoping the table to `(network, contract, coin key)` and
requiring a contract on GET. Removing the claim key removed the table.

**`sealed_rosters` the service cannot read.** A plaintext roster would rebuild
the employment map the whole design avoids — the chain stores
`payeeHash(coinPublicKey, period, instance)` and never the key, precisely so
nobody can enumerate who works where. Storing that in the platform's database,
where nobody would think to look, is arguably worse than publishing it. So what
is stored is ciphertext under a key derived from the payroll passphrase, with a
domain separator so it is not the openings' sealing key. **Names and public keys
only — never salaries**, so the worst case if the sealing were broken is "who
works here" and not "and what they earn".

Both writes are unauthenticated, and that is stated in the routes rather than
left implicit. Nothing stored is a secret or a capability. What an open write
*can* do is publish under someone else's key, or replace a blob with junk — a
wrong suggestion an employer can overwrite and an employee can spot, and a
convenience lost rather than data. That is the honest trade for a demo with no
employer login, and the mitigations are the editable field and the
employee-visible mismatch check, not a login this app has no way to issue.

### Why the server builds from its own tsconfig

`tsconfig.server.json` exists because the server and the CLIs have different
module resolution needs from the frontend, and one config that satisfied both
satisfied neither. `npm run build:server` compiles only what the service needs.

### `DATA_DIR`

Five files are written at run time and are not source: `deployment.json`,
`.onboarded-keys.json` and the wallet's sync position; `claims.json`, which
bounds a public route; and `claim-digests.json`, the per-period claim-tree leaf
digests `/api/claim-tree` serves. All five resolve through `dataDir()`, so a
managed host can point them at storage that outlives a deploy.

Losing `claim-digests.json` is not fatal but it is not free: the root stays on
chain and stays valid, while every claimant loses the list they build their path
from until the period is relayed again.

Unset, it is the working directory and every local workflow behaves as before.
On a managed host it must be set, or a push replaces the code directory and takes
`deployment.json` with it — the contract stays on chain, permanently bound to its
employer, and nothing left anywhere knows its address. `assignEmployer` cannot be
repeated, so that is not recoverable by redeploying.

⚠️ **`deployment.json` overrides the `.env` baseline.** A stale record on a
persistent disk silently outranks a corrected environment variable; the service
logs a warning naming both addresses, which is the only signal. See
[Known sharp edges](status.md#known-sharp-edges).

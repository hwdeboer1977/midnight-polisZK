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
| `POST /api/relay`            | work limit        | builds a period's claim bundles, optionally publishes |
| `GET/POST /api/claim-keys`   | work limit (POST) | employees publish a claim-key hash; employers read it |
| `GET/POST /api/sealed-roster`| work limit (POST) | the employer's roster, sealed under their passphrase |
| `GET  /api/registrations`    | none              | the registry of onboarded companies             |
| `POST /api/platform/*`       | platform token    | treasuries, fund deposits, mint, faucet, reset  |

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
| `claim_key_hashes`  | employee, on *Send to my employer* | network, **hex** coin public key, claim-key hash |
| `sealed_rosters`    | employer, on filing a period   | network, contract, **AES-GCM ciphertext**        |

**`claim_key_hashes` is inert.** It stores `persistentHash(claimKey)` over 32
random bytes: not reversible, no dictionary to guess against, and no route to a
payment — `claim` binds to `ownPublicKey()` separately. It removes a courier step
that was failing in practice, since an employee who never sent their hash cannot
be helped after the write-once attestation exists. It is a **suggestion**: the
employer's field is pre-filled and stays editable, and the employee is shown what
the service holds for them while a mismatch can still be fixed. It carries no
contract address, so it says "this key has a benefit key", never "this key works
for X".

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

Three files are written at run time and are not source: `deployment.json`,
`.onboarded-keys.json` and the wallet's sync position — plus `claims.json`, which
bounds a public route. All four resolve through `dataDir()`, so a managed host
can point them at storage that outlives a deploy.

Unset, it is the working directory and every local workflow behaves as before.
On a managed host it must be set, or a push replaces the code directory and takes
`deployment.json` with it — the contract stays on chain, permanently bound to its
employer, and nothing left anywhere knows its address. `assignEmployer` cannot be
repeated, so that is not recoverable by redeploying.

⚠️ **`deployment.json` overrides the `.env` baseline.** A stale record on a
persistent disk silently outranks a corrected environment variable; the service
logs a warning naming both addresses, which is the only signal. See
[Known sharp edges](status.md#known-sharp-edges).

# Deploying it

Two hosts, and they need different things.

[← back to the README](../README.md)

## Deploying it

Two hosts, and they need different things.

### The service (Render)

Runs `node dist/server/index.js`. It must have:

| Variable | Why |
| --- | --- |
| `WALLET_MNEMONIC` or `WALLET_SEED` | the platform wallet |
| `TAX_TREASURY_SEED`, `SOCIAL_TREASURY_SEED` | the treasuries it spends |
| `PROOF_SERVER_URL` | **critical** — defaults to `127.0.0.1:6300`, which does not exist in a container, so every proving operation fails without it |
| `payroll_address`, `peur_address`, `taxparams_address`, `fund_address`, `taxvault_address` | `deployment.json` is gitignored, so on a fresh disk the env baseline is the **only** source of addresses |
| `DATA_DIR` | storage that outlives a deploy |
| `DATABASE_URL` | the registry and sealed rosters |
| `PLATFORM_API_TOKEN` | required to bind anywhere but loopback |
| `ALLOWED_ORIGINS` | must include the frontend's origin, or CORS blocks it |

`*_TREASURY_ENC_KEY` is **not** needed when the seeds are set —
`treasuryEncryptionKeys()` derives it. Set it instead on any machine that should
not hold the treasuries' spending keys.

`PAYROLL_CONTRACT` is a **pin**, not a source: it filters records that already
exist. Setting it without `payroll_address` yields no payroll contract at all.

### The frontend (Vercel)

Build-time substitution, so **adding a variable does nothing until you
redeploy** — an existing deployment keeps the old values baked into its bundle.

`VITE_NETWORK_ID`, `VITE_PAYROLL_ADDRESS`, `VITE_PEUR_ADDRESS`,
`VITE_PEUR_TOKEN_ID`, `VITE_TAXPARAMS_ADDRESS`, `VITE_FUND_ADDRESS`,
`VITE_TAXVAULT_ADDRESS`, `VITE_TAX_TREASURY_ENC_KEY`,
`VITE_SOCIAL_TREASURY_ENC_KEY`, and `VITE_API_BASE` pointing at the service.

⚠️ `loadStatic()` opens with `if (!networkId) return {}` — **without
`VITE_NETWORK_ID` the frontend resolves zero contracts** and every page reports
nothing deployed. Addresses used to come from a committed
`public/deployments.json`; that fetch was removed and the file is now dead
weight, so its presence is not reassurance.

Variables **without** the `VITE_` prefix are never exposed to client code. Four
of them (`MIDNIGHT_NETWORK`, `PROOF_SERVER_URL`, `CONTRACT_NAME`, `DEBUG_LEVEL`)
sat on the project doing nothing but looking like configuration.

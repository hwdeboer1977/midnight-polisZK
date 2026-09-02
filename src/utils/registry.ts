// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import pg from "pg";

/**
 * Platform bookkeeping for employer registrations.
 *
 * This database is never authoritative over the chain. Which key controls a
 * payroll contract is answered by the contract, and only by the contract — a row
 * here saying otherwise means the row is wrong. What it records is the part the
 * chain has no opinion about: which company a contract was sold to, when, for how
 * long, and whether that arrangement still stands. Contract ownership is
 * permanent; a subscription is not, and conflating the two is what makes a stale
 * record look like an answer.
 */
const DEFAULT_URL = "postgresql://polis:polis@127.0.0.1:5436/polis";

/** Registration term when none is given. */
const DEFAULT_TERM_MONTHS = 12;

export type Status = "active" | "inactive";

export interface Registration {
  id: number;
  companyName: string;
  instance: string;
  networkId: string;
  contractAddress: string;
  employerKey: string;
  registeredAt: Date;
  termMonths: number;
  expiresAt: Date;
  status: Status;
  /** `status`, with an elapsed term counted as inactive without a write. */
  effectiveStatus: Status;
}

export function databaseUrl(): string {
  return process.env.DATABASE_URL?.trim() || DEFAULT_URL;
}

export function registrationTermMonths(): number {
  const raw = process.env.REGISTRATION_TERM_MONTHS?.trim();
  if (!raw) return DEFAULT_TERM_MONTHS;
  const months = Number(raw);
  if (!Number.isInteger(months) || months <= 0) {
    throw new Error(`REGISTRATION_TERM_MONTHS must be a positive whole number of months, got "${raw}"`);
  }
  return months;
}

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({ connectionString: databaseUrl() });
    // An idle client whose connection drops — the database restarting, a laptop
    // waking up — makes the pool emit `error`. With no listener Node treats it
    // as unhandled and takes the whole process down, so stopping the database
    // would kill the demo server along with it. The pool discards the dead
    // client by itself and the next query gets a fresh one; there is nothing to
    // repair here, only a process to keep alive and a reason to say out loud.
    pool.on("error", (cause: Error) => {
      console.warn(`⚠️  Registration database connection dropped: ${cause.message}`);
    });
  }
  return pool;
}

/** Releases the pool so a CLI or service can exit instead of hanging on it. */
export async function closeRegistry(): Promise<void> {
  if (pool) {
    const closing = pool;
    pool = null;
    await closing.end();
  }
}

/**
 * Creates the table if it is not there yet.
 *
 * Run on every write rather than as a migration step, because the alternative is
 * a demo that fails on a fresh machine until someone remembers a setup command.
 *
 * `(network_id, instance)` is unique: the same company name on the devnet and on
 * preview are different registrations against different chains, but registering
 * the same instance twice on one network is a mistake, not a second customer.
 */
export async function initSchema(): Promise<void> {
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS registrations (
      id               SERIAL PRIMARY KEY,
      company_name     TEXT        NOT NULL,
      instance         TEXT        NOT NULL,
      network_id       TEXT        NOT NULL,
      contract_address TEXT        NOT NULL,
      employer_key     TEXT        NOT NULL,
      registered_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
      term_months      INTEGER     NOT NULL,
      expires_at       TIMESTAMPTZ NOT NULL,
      status           TEXT        NOT NULL DEFAULT 'active'
                                   CHECK (status IN ('active', 'inactive')),
      UNIQUE (network_id, instance)
    )
  `);

  /**
   * Claim-key hashes an employee has published for their employer to anchor.
   *
   * ⚠️ **Only the HASH.** The key itself is 32 random bytes that exist in one
   * downloaded file and nowhere else — not here, not on chain, not in any
   * browser. What is stored is `persistentHash(claimKey)`, which cannot be
   * reversed, cannot be guessed (the preimage is random, so there is no
   * dictionary to run), and cannot claim anything: `claim` binds separately to
   * `ownPublicKey()`, so possession of the hash gives no one a route to a
   * payment.
   *
   * It exists to remove a courier step that was failing in practice — an
   * employee had to send this to their employer out of band, and the whole
   * flow is unrecoverable if they do not, because the employer anchors it in a
   * write-once statement.
   *
   * ⚠️ **What it does NOT become: authoritative.** The employer's form is
   * pre-filled from here and stays editable, and the employee is shown what
   * this table holds for them, because a wrong value anchored into a
   * termination is only detectable at claim time — after the statement can be
   * changed. A convenience that can strand someone silently is not a
   * convenience.
   *
   * Keyed on the coin public key, which is the same thing the employer's roster
   * is keyed on, so a row can be matched to a person without storing a name —
   * and on the CONTRACT, so the match is only ever made by the employer that
   * hash was published to. See the migration below for what scoping it fixed.
   */
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS claim_key_hashes (
      id               SERIAL PRIMARY KEY,
      network_id       TEXT        NOT NULL,
      contract_address TEXT        NOT NULL,
      coin_public_key  TEXT        NOT NULL,
      claim_key_hash   TEXT        NOT NULL,
      created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (network_id, contract_address, coin_public_key)
    )
  `);

  /**
   * Migration: scope an existing table to one payroll contract.
   *
   * ⚠️ The unique key was `(network_id, coin_public_key)` — no contract at all.
   * One hash published once therefore marked that person "collected" at EVERY
   * employer on the network, permanently, with no expiry and no delete route.
   * That is the cross-employer handle `payeeFor` gives up convenience to
   * prevent, rebuilt off chain; and it showed up as a false ✓ Collected against
   * an employee who had published a hash weeks earlier at a different instance.
   *
   * Pre-existing rows are DELETED rather than backfilled, because they cannot
   * be attributed: the table never recorded which contract a hash was published
   * against, and guessing the current one would re-assert exactly the false
   * positive this migration exists to remove. The cost is that an employee who
   * published before this publishes again — one button on a page they have
   * already used — and the employer's own local record is untouched either way.
   */
  const { rows: scoped } = await getPool().query(`
    SELECT 1 FROM information_schema.columns
     WHERE table_name = 'claim_key_hashes' AND column_name = 'contract_address'
  `);
  if (scoped.length === 0) {
    // Every unique constraint on the table, by lookup rather than by its
    // generated name.
    //
    // ⚠️ Naming it `claim_key_hashes_network_id_coin_public_key_key` and
    // trusting `DROP CONSTRAINT IF EXISTS` would fail SILENTLY against a table
    // whose constraint was named anything else — leaving the old
    // `(network, coin key)` uniqueness in force, so two employers could never
    // both hold a hash for the same person. A no-op drop and a successful drop
    // are indistinguishable to `IF EXISTS`, which is the wrong failure mode for
    // the one statement this migration depends on.
    const { rows: constraints } = await getPool().query(`
      SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
       WHERE rel.relname = 'claim_key_hashes' AND con.contype = 'u'
    `);
    for (const { conname } of constraints) {
      await getPool().query(
        `ALTER TABLE claim_key_hashes DROP CONSTRAINT "${String(conname).replace(/"/g, '""')}"`
      );
    }
    await getPool().query(`DELETE FROM claim_key_hashes`);
    await getPool().query(`
      ALTER TABLE claim_key_hashes ADD COLUMN contract_address TEXT NOT NULL DEFAULT ''
    `);
    await getPool().query(`
      ALTER TABLE claim_key_hashes ALTER COLUMN contract_address DROP DEFAULT
    `);
    await getPool().query(`
      ALTER TABLE claim_key_hashes
        ADD CONSTRAINT claim_key_hashes_network_contract_key
        UNIQUE (network_id, contract_address, coin_public_key)
    `);
  }

  /**
   * The employer's roster, sealed under their payroll passphrase.
   *
   * ⚠️ **This service cannot read it, and that is the whole design.** The chain
   * deliberately stores `payeeHash(coinPublicKey, period, instance)` and never
   * the key, so that no public artefact maps people to employers. A plaintext
   * roster here would rebuild exactly that map off chain and hand it to the
   * platform — which for a payroll platform is arguably worse than publishing
   * it, because nobody would think to look.
   *
   * So what is stored is AES-GCM ciphertext under a key derived from the
   * employer's payroll passphrase, which this service never sees. The same
   * passphrase already seals every opening on chain; this is that pattern
   * applied to the one thing an employer otherwise has to carry between
   * browsers in a spreadsheet.
   *
   * **Names and public keys only — never salaries.** Those stay in the
   * workbook. The worst case for this blob if the encryption were broken is
   * "who works here", and it should not also be "and what they earn".
   */
  await getPool().query(`
    CREATE TABLE IF NOT EXISTS sealed_rosters (
      network_id       TEXT        NOT NULL,
      contract_address TEXT        NOT NULL,
      sealed           TEXT        NOT NULL,
      updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
      PRIMARY KEY (network_id, contract_address)
    )
  `);
}

/** Stores or replaces one employer's sealed roster. Base64 in, base64 out. */
export async function putSealedRoster(
  networkId: string,
  contractAddress: string,
  sealed: string
): Promise<void> {
  await initSchema();
  await getPool().query(
    `INSERT INTO sealed_rosters (network_id, contract_address, sealed)
     VALUES ($1, $2, $3)
     ON CONFLICT (network_id, contract_address)
     DO UPDATE SET sealed = EXCLUDED.sealed, updated_at = now()`,
    [networkId, contractAddress.toLowerCase(), sealed]
  );
}

/** The ciphertext, for a browser that holds the passphrase to open. */
export async function getSealedRoster(
  networkId: string,
  contractAddress: string
): Promise<{ sealed: string; updatedAt: Date } | null> {
  await initSchema();
  const { rows } = await getPool().query(
    `SELECT sealed, updated_at FROM sealed_rosters
      WHERE network_id = $1 AND contract_address = $2`,
    [networkId, contractAddress.toLowerCase()]
  );
  if (rows.length === 0) return null;
  return { sealed: rows[0].sealed, updatedAt: new Date(rows[0].updated_at) };
}

export interface PublishedClaimKey {
  coinPublicKey: string;
  claimKeyHash: string;
  createdAt: Date;
}

/**
 * Records — or replaces — the hash one employee publishes.
 *
 * Replacing is deliberate and is the honest behaviour: an employee who creates
 * a second key has a different hash, and the old one is worthless to them the
 * moment they do. Refusing the update would leave the employer pre-filling a
 * hash whose key nobody holds, which is the exact failure this table is meant
 * to reduce. The page that creates a second key already warns that it only
 * works while no termination has been filed.
 */
export async function publishClaimKeyHash(
  networkId: string,
  contractAddress: string,
  coinPublicKey: string,
  claimKeyHash: string
): Promise<void> {
  await initSchema();
  await getPool().query(
    `INSERT INTO claim_key_hashes
       (network_id, contract_address, coin_public_key, claim_key_hash)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (network_id, contract_address, coin_public_key)
     DO UPDATE SET claim_key_hash = EXCLUDED.claim_key_hash, created_at = now()`,
    [
      networkId,
      contractAddress.toLowerCase(),
      coinPublicKey.toLowerCase(),
      claimKeyHash.toLowerCase(),
    ]
  );
}

/**
 * Every hash published for ONE payroll contract.
 *
 * Scoped rather than network-wide, which is what stops a hash published at one
 * employer from answering for the same person at another. An employer reads
 * their own contract and learns nothing about anyone else's.
 */
export async function listClaimKeyHashes(
  networkId: string,
  contractAddress: string
): Promise<PublishedClaimKey[]> {
  await initSchema();
  const { rows } = await getPool().query(
    `SELECT coin_public_key, claim_key_hash, created_at
       FROM claim_key_hashes WHERE network_id = $1 AND contract_address = $2`,
    [networkId, contractAddress.toLowerCase()]
  );
  return rows.map((row: Record<string, any>) => ({
    coinPublicKey: row.coin_public_key,
    claimKeyHash: row.claim_key_hash,
    createdAt: new Date(row.created_at),
  }));
}

/** What this table holds for one person at one employer, so they can check it. */
export async function findClaimKeyHash(
  networkId: string,
  contractAddress: string,
  coinPublicKey: string
): Promise<PublishedClaimKey | null> {
  await initSchema();
  const { rows } = await getPool().query(
    `SELECT coin_public_key, claim_key_hash, created_at
       FROM claim_key_hashes
      WHERE network_id = $1 AND contract_address = $2 AND coin_public_key = $3`,
    [networkId, contractAddress.toLowerCase(), coinPublicKey.toLowerCase()]
  );
  if (rows.length === 0) return null;
  return {
    coinPublicKey: rows[0].coin_public_key,
    claimKeyHash: rows[0].claim_key_hash,
    createdAt: new Date(rows[0].created_at),
  };
}

function toRegistration(row: Record<string, any>): Registration {
  const status = row.status as Status;
  const expiresAt = new Date(row.expires_at);
  return {
    id: row.id,
    companyName: row.company_name,
    instance: row.instance,
    networkId: row.network_id,
    contractAddress: row.contract_address,
    employerKey: row.employer_key,
    registeredAt: new Date(row.registered_at),
    termMonths: row.term_months,
    expiresAt,
    status,
    effectiveStatus: status === "active" && expiresAt > new Date() ? "active" : "inactive",
  };
}

export interface NewRegistration {
  companyName: string;
  instance: string;
  networkId: string;
  contractAddress: string;
  employerKey: string;
  termMonths?: number;
}

/**
 * Records a registration, or refreshes it if that instance is registered again.
 *
 * The upsert keeps the original `registered_at` — a renewal moves the expiry, it
 * does not rewrite when the company first joined.
 */
export async function recordRegistration(
  input: NewRegistration
): Promise<Registration> {
  await initSchema();
  const termMonths = input.termMonths ?? registrationTermMonths();

  const { rows } = await getPool().query(
    `
    INSERT INTO registrations
      (company_name, instance, network_id, contract_address, employer_key,
       term_months, expires_at, status)
    VALUES ($1, $2, $3, $4, $5, $6::int, now() + make_interval(months => $6::int), 'active')
    ON CONFLICT (network_id, instance) DO UPDATE SET
      company_name     = EXCLUDED.company_name,
      contract_address = EXCLUDED.contract_address,
      employer_key     = EXCLUDED.employer_key,
      term_months      = EXCLUDED.term_months,
      expires_at       = now() + make_interval(months => EXCLUDED.term_months),
      status           = 'active'
    RETURNING *
    `,
    [
      input.companyName,
      input.instance,
      input.networkId,
      input.contractAddress,
      input.employerKey,
      termMonths,
    ]
  );

  return toRegistration(rows[0]);
}

export async function listRegistrations(networkId?: string): Promise<Registration[]> {
  await initSchema();
  const { rows } = networkId
    ? await getPool().query(
        "SELECT * FROM registrations WHERE network_id = $1 ORDER BY registered_at DESC",
        [networkId]
      )
    : await getPool().query("SELECT * FROM registrations ORDER BY registered_at DESC");
  return rows.map(toRegistration);
}

export async function findRegistration(
  networkId: string,
  instance: string
): Promise<Registration | null> {
  await initSchema();
  const { rows } = await getPool().query(
    "SELECT * FROM registrations WHERE network_id = $1 AND instance = $2",
    [networkId, instance]
  );
  return rows[0] ? toRegistration(rows[0]) : null;
}

/**
 * Ends or restores a registration.
 *
 * Note what this does not do: the payroll contract stays exactly as it was. The
 * employer keeps control of it, because assignment is permanent on chain and no
 * database row can revoke it. Marking a registration inactive is a statement
 * about the service, not about the contract.
 */
export async function setStatus(
  networkId: string,
  instance: string,
  status: Status
): Promise<Registration | null> {
  await initSchema();
  const { rows } = await getPool().query(
    "UPDATE registrations SET status = $3 WHERE network_id = $1 AND instance = $2 RETURNING *",
    [networkId, instance, status]
  );
  return rows[0] ? toRegistration(rows[0]) : null;
}

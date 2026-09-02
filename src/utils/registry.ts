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

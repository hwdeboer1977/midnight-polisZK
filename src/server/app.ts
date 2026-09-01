// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import express, { type Express, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
import cors from "cors";
import { requirePlatformToken } from "./auth.js";
import { endSession, issueChallenge, verifySignedChallenge } from "./wallet-auth.js";
import { rateLimit, requireSignupCode } from "./guards.js";
import { getJob, startJob } from "./jobs.js";
import type { ServerConfig } from "./config.js";
import { fundAndPay } from "../utils/payroll-run.js";
import { runRelay, type TerminationOpening } from "../utils/relay-run.js";
import { depositToFund, type TreasuryName } from "../utils/fund-deposit.js";
import { confirmPreparedDeposit, prepareDeposit } from "../utils/deposit-prepare.js";
import { readTreasuryBalances } from "../utils/treasury-balances.js";
import { fundTreasuriesWithNight } from "../utils/treasury-night.js";
import { onboardEmployer } from "../utils/onboarding.js";
import {
  EMPLOYER_ALLOWANCE,
  fundEmployer,
  mintExtra,
  mintToRecipient,
} from "../utils/funding.js";
import { parsePeurAmount } from "../utils/constructor-args.js";
import { EnvironmentManager } from "../utils/environment.js";
import {
  getSealedRoster,
  putSealedRoster,
  findClaimKeyHash,
  findRegistration,
  listClaimKeyHashes,
  listRegistrations,
  publishClaimKeyHash,
  setStatus,
} from "../utils/registry.js";
import { listDeployments } from "../utils/deployments.js";
import { dataDir } from "../utils/data-dir.js";

/**
 * The platform's HTTP surface.
 *
 * Two route groups with deliberately different postures, and the separation is
 * the point of this file rather than an organising convenience:
 *
 *   PUBLIC     — reads that disclose nothing not already on chain, plus the two
 *                writes a stranger has to be able to make: signing up, and
 *                drawing the starter allowance that signing up is for. Both are
 *                bounded rather than authenticated; `guards.ts` sets out what
 *                each one can cost and why the bound is enough.
 *   PRIVILEGED — mints an amount the caller chooses, or moves an employer's
 *                money, with the platform wallet. Token required whenever the
 *                server is reachable off-machine.
 *
 * `config.ts` makes the second half impossible to expose by accident: the
 * process will not bind to a non-loopback host without a token.
 *
 * What has NOT changed from `demo-server.ts`, and still needs to before this
 * faces real employers: there is no approval step. A valid token deploys a
 * contract for any name it is given. The comment there called for "a human
 * approves a company before any contract is deployed", and a bearer token is
 * authentication, not approval — it says who is asking, not whether the answer
 * should be yes.
 */
export function createApp(config: ServerConfig): Express {
  const app = express();

  // No `x-powered-by`. Free, and there is no reason to advertise the stack.
  app.disable("x-powered-by");

  /**
   * One hop of proxy is trusted, so `req.ip` reads X-Forwarded-For.
   *
   * Required for the signup rate limit to mean anything: behind Render's router
   * every request otherwise arrives from the same address, and a per-IP limit
   * would throttle all employers as though they were one. Exactly one hop, not
   * `true` — trusting the whole chain lets a client forge the header and pick
   * its own identity, which is a rate limit that anyone can opt out of.
   */
  app.set("trust proxy", 1);

  /**
   * Small by design. Every body here is a handful of keys and amounts; the
   * default 100kb would accept a megabyte of JSON before anything looked at it.
   */
  app.use(express.json({ limit: "16kb" }));

  /**
   * CORS, allowlisted rather than open.
   *
   * A hosted frontend on another origin — Vercel — has to be named explicitly.
   * `demo-server.ts` answered `access-control-allow-origin: *`, which was
   * harmless while it was unreachable from anywhere else and is not once it is
   * not: with `*` any page in any tab could call these routes, and a token
   * living in a browser would be attached by the caller anyway.
   */
  app.use(
    cors({
      origin: config.allowedOrigins.length > 0 ? config.allowedOrigins : true,
      methods: ["GET", "POST", "OPTIONS"],
      allowedHeaders: ["content-type", "authorization"],
      maxAge: 600,
    })
  );

  // ── Public ────────────────────────────────────────────────────────────────

  /**
   * Liveness. Says which network it is pointed at, because "the server is up"
   * and "the server is up and talking to the chain you think it is" are
   * different questions and only the second one is useful.
   */
  app.get("/api/health", (_req: Request, res: Response) => {
    const network = EnvironmentManager.getNetworkConfig();
    res.json({
      ok: true,
      network: network.name,
      networkId: network.networkId,
      // Whether the privileged half is guarded. Public on purpose: a caller
      // deserves to know whether it is about to send a token to something that
      // never checks one.
      authenticated: config.token !== null,
      /**
       * Whether what this service records survives a redeploy.
       *
       * False means DATA_DIR is unset, so `deployment.json` sits in the code
       * directory — which a managed host replaces on every push. Onboarding
       * still works and still deploys a real contract; the record of where that
       * contract IS gets thrown away, and `assignEmployer` cannot be repeated
       * to make another one.
       *
       * A boolean rather than the path: the answer is the useful part and a
       * filesystem layout is not something a public endpoint should hand out.
       */
      durableState: dataDir() !== process.cwd(),
    });
  });

  /**
   * Sign-in by wallet signature, in two public steps.
   *
   * PUBLIC, necessarily: a caller cannot authenticate through a door that is
   * already locked. Neither route discloses anything — a challenge is random
   * and worthless without the platform key, and a rejected signature returns a
   * reason rather than a secret.
   *
   * This is the answer to the note on the token guard below: a coin public key
   * proves nothing because anyone can claim it, but a signature over a value
   * this service just chose proves possession of the key. `wallet-auth.ts`
   * carries the reasoning and the replay rules.
   *
   * The static `PLATFORM_API_TOKEN` still works and still has to: a CLI or a
   * cron job has no wallet extension to sign with. What this removes is the
   * need to paste that secret into a browser.
   */
  app.post("/api/auth/challenge", (_req: Request, res: Response) => {
    if (!config.token) {
      // Loopback with no token configured: the guard passes anyway, so issuing
      // a challenge would invite the operator to sign for nothing.
      res.status(409).json({
        error: "This service is not guarded, so there is nothing to sign in to.",
      });
      return;
    }
    res.json(issueChallenge());
  });

  app.post("/api/auth/verify", (req: Request, res: Response) => {
    if (!config.token) {
      res.status(409).json({
        error: "This service is not guarded, so there is nothing to sign in to.",
      });
      return;
    }
    const { data, signature, verifyingKey, challenge } = req.body ?? {};
    if (
      typeof data !== "string" ||
      typeof signature !== "string" ||
      typeof verifyingKey !== "string" ||
      typeof challenge !== "string"
    ) {
      res
        .status(400)
        .json({ error: "data, signature, verifyingKey and challenge are required" });
      return;
    }
    const result = verifySignedChallenge({ data, signature, verifyingKey, challenge });
    if (!result.ok) {
      res.status(401).json({ error: result.reason });
      return;
    }
    res.json({ token: result.token, expiresInMs: result.expiresInMs });
  });

  app.post("/api/auth/signout", (req: Request, res: Response) => {
    const header = req.header("authorization") ?? "";
    if (header.startsWith("Bearer ")) endSession(header.slice(7).trim());
    res.json({ ok: true });
  });

  /**
   * Every contract this service knows about.
   *
   * Public, and it has to be: contract addresses are on-chain data that anyone
   * with an indexer can enumerate, and the frontend cannot work without them.
   *
   * It exists because the frontend's own list is a BUILD-TIME snapshot.
   * `frontend/public/deployments.json` is written by `frontend-config.ts` and
   * committed, which is what lets a Vercel build know any addresses at all — but
   * a contract this server deploys at runtime can never appear in it. Onboarding
   * would succeed, the employer would reload, and their brand-new contract would
   * be invisible: "this wallet is not registered as an employer", about a
   * contract deployed for that wallet a minute earlier.
   *
   * The frontend merges this over its static copy, so the committed file remains
   * the baseline that works with no backend at all.
   */
  app.get("/api/deployments", (_req: Request, res: Response) => {
    res.json(Object.fromEntries(listDeployments()));
  });

  app.get("/api/job/:id", (req: Request, res: Response) => {
    // Express 5 types a route param as string | string[]; a duplicated
    // param would otherwise reach `getJob` as an array and silently miss.
    const job = getJob(String(req.params.id));
    if (!job) {
      res.status(404).json({ error: "Unknown job" });
      return;
    }
    res.json(job);
  });

  /**
   * The platform's record of who is registered.
   *
   * Read-only on purpose. Registrations are written by onboarding and ended by
   * an operator at the CLI; exposing a write here would put the commercial
   * relationship behind the same door as everything else.
   *
   * Nothing this returns is authoritative over the chain. It answers "did this
   * company buy the service, and does that still stand" — not "who controls
   * this payroll", which only the contract can answer.
   */
  /**
   * Claim-key hashes, published by employees and read by their employer.
   *
   * ── Why this is not authenticated ──────────────────────────────────────────
   *
   * Nothing here is a secret and nothing here is a capability. The value is
   * `persistentHash(claimKey)` over 32 random bytes: it cannot be reversed, has
   * no dictionary to guess against, and cannot claim — `claim` binds to
   * `ownPublicKey()` separately, so holding every row in this table gets nobody
   * a payment. A coin public key is likewise an address people hand out to be
   * paid.
   *
   * What an unauthenticated WRITE could do is publish a hash under somebody
   * else's coin public key. That is worth stating plainly rather than defending
   * against with a login this app has no way to issue: the employer's form is
   * pre-filled from here and stays editable, the employee is shown what this
   * table holds for them, and the write-once anchor is still the employer's
   * deliberate act. So a spoofed row is a wrong suggestion an employer can
   * overwrite and an employee can spot — not a silent redirection.
   *
   * Rate-limited on the same bucket shape as the other public routes, because
   * the cost of abuse here is rows in a table rather than money.
   */
  app.get("/api/claim-keys", async (req: Request, res: Response) => {
    try {
      const network = EnvironmentManager.getNetworkConfig();
      const networkId = String(req.query.networkId ?? network.networkId);
      const coinPublicKey = req.query.coinPublicKey
        ? String(req.query.coinPublicKey)
        : null;

      if (coinPublicKey) {
        res.json({ claimKey: await findClaimKeyHash(networkId, coinPublicKey) });
        return;
      }
      res.json({ claimKeys: await listClaimKeyHashes(networkId) });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      // A service with no database configured is a normal deployment, not a
      // fault: the direct hand-over still works and the employer's paste field
      // is untouched. Answering empty keeps that path clear of an error banner.
      res.json({ claimKeys: [], claimKey: null, unavailable: detail });
    }
  });

  app.post(
    "/api/claim-keys",
    rateLimit({ ...config.workLimit, bucket: "claim-keys", noun: "claim-key publications" }),
    async (req: Request, res: Response) => {
      const body = req.body ?? {};
      const coinPublicKey = String(body.coinPublicKey ?? "").trim();
      const claimKeyHash = String(body.claimKeyHash ?? "").trim().replace(/^0x/, "");
      const networkId =
        String(body.networkId ?? "") || EnvironmentManager.getNetworkConfig().networkId;

      if (!coinPublicKey) {
        res.status(400).json({ error: "coinPublicKey is required" });
        return;
      }
      // Checked here rather than trusted, because a malformed hash pre-fills an
      // employer's form with something that cannot possibly be right and fails
      // only when a claim is attempted, months later.
      if (!/^[0-9a-f]{64}$/i.test(claimKeyHash)) {
        res.status(400).json({ error: "claimKeyHash must be 64 hex characters" });
        return;
      }

      try {
        await publishClaimKeyHash(networkId, coinPublicKey, claimKeyHash);
        res.json({ ok: true });
      } catch (cause) {
        res.status(503).json({
          error:
            "This service has no registration database, so the hash could not be " +
            "published. Send it to your employer directly — the field on their " +
            "side takes it either way. (" +
            (cause instanceof Error ? cause.message : String(cause)) +
            ")",
        });
      }
    }
  );

  /**
   * The employer's roster, sealed under their payroll passphrase.
   *
   * This service stores and returns an opaque blob and can do nothing else with
   * it — see the table comment in `registry.ts` for why a plaintext roster is
   * the one thing this system must not hold. Reading is therefore harmless and
   * unauthenticated: the ciphertext is useless without a passphrase that never
   * leaves the employer's browser.
   *
   * Writing is bounded by size and rate rather than by a token, on the same
   * reasoning as `/api/claim-keys`: the worst an attacker achieves is replacing
   * a blob with junk, which costs the employer the convenience and not the data
   * — the workbook is still the source of truth and the local record still
   * works. That is a nuisance, not a loss, and it is the honest trade for a
   * demo with no employer login.
   */
  app.get("/api/sealed-roster", async (req: Request, res: Response) => {
    try {
      const network = EnvironmentManager.getNetworkConfig();
      const networkId = String(req.query.networkId ?? network.networkId);
      const contractAddress = String(req.query.contractAddress ?? "");
      if (!contractAddress) {
        res.status(400).json({ error: "contractAddress is required" });
        return;
      }
      res.json({ roster: await getSealedRoster(networkId, contractAddress) });
    } catch {
      // No database is a normal deployment: the workbook still carries the
      // roster, which is how this worked before.
      res.json({ roster: null });
    }
  });

  app.post(
    "/api/sealed-roster",
    rateLimit({ ...config.workLimit, bucket: "sealed-roster", noun: "roster uploads" }),
    async (req: Request, res: Response) => {
      const body = req.body ?? {};
      const contractAddress = String(body.contractAddress ?? "").trim();
      const sealed = String(body.sealed ?? "");
      const networkId =
        String(body.networkId ?? "") || EnvironmentManager.getNetworkConfig().networkId;

      if (!/^[0-9a-f]{64}$/i.test(contractAddress.replace(/^0x/, ""))) {
        res.status(400).json({ error: "contractAddress must be 64 hex characters" });
        return;
      }
      // Base64 only, and bounded. This is an opaque blob to the server, so the
      // one thing it can check is that it looks like one and is not being used
      // as free storage.
      if (!/^[A-Za-z0-9+/=]+$/.test(sealed) || sealed.length > 512_000) {
        res.status(400).json({ error: "sealed must be base64 and under 512 KB" });
        return;
      }

      try {
        await putSealedRoster(networkId, contractAddress.replace(/^0x/, ""), sealed);
        res.json({ ok: true });
      } catch (cause) {
        res.status(503).json({
          error:
            "This service has no registration database, so the roster was not " +
            "stored. Nothing is lost — your workbook is still the source of it. (" +
            (cause instanceof Error ? cause.message : String(cause)) +
            ")",
        });
      }
    }
  );

  app.get("/api/registrations", async (req: Request, res: Response) => {
    try {
      const network = EnvironmentManager.getNetworkConfig();
      const networkId = String(req.query.networkId ?? network.networkId);
      const instance = req.query.instance ? String(req.query.instance) : null;

      if (instance) {
        const found = await findRegistration(networkId, instance);
        res.json({ registration: found ?? null });
        return;
      }
      res.json({ registrations: await listRegistrations(networkId) });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      console.log(`✘ registrations: ${detail}`);
      res.status(503).json({
        error: "The registration database is unavailable — start it with `npm run db:up`",
        detail,
      });
    }
  });

  // ── Privileged ────────────────────────────────────────────────────────────

  /**
   * Signup. Bounded rather than authenticated — and that bound is no longer
   * enough on its own. Read this before exposing the service.
   *
   * ⚠️ SET `SIGNUP_CODE` BEFORE THIS IS REACHABLE BY STRANGERS.
   *
   * The old reasoning was sound and is now false. This route used to DEPLOY a
   * contract and assign that, so an abuser walked away with a contract only they
   * could use, paid for in the platform's fees: spam and cost, not theft.
   * Onboarding now assigns `payroll_address` — the single contract this
   * deployment offers, the one the UI is pinned to and every unscoped CLI
   * resolves. The first caller takes the seat, and the only way back is
   * `revokeEmployer`.
   *
   * That is recoverable, which is the one thing keeping this a bounded route
   * rather than a privileged one: nothing is stolen, no money moves, and the
   * platform can take the seat back in a single transaction. But "recoverable by
   * the operator noticing" is not a security bound, and the rate limit does not
   * help when the damage is done by the FIRST request rather than the hundredth.
   *
   * Left openable rather than moved behind the platform token because the token
   * ships in no browser bundle and self-service signup is the point of the
   * route; `requireSignupCode` is the intended control, and it fails OPEN when
   * `SIGNUP_CODE` is unset. That default was harmless under the old model and is
   * not under this one.
   */
  /**
   * Builds a period's claim bundles, and optionally publishes the root.
   *
   * Driven by the EMPLOYER, from the browser, which is why it is not behind the
   * platform token. Read what that opens before judging it: the caller supplies
   * termination openings, and `runRelay` refuses any whose commitment does not
   * reproduce the attestation already on chain — so an opening cannot be
   * invented, only supplied. Every other input is public payroll state.
   *
   * What it does cost, and the reason for the rate limit: publishing spends the
   * platform's fees, and `publishRoot` is permissionless anyway, so the worst a
   * stranger achieves by calling this is making the operator pay to publish a
   * root that anybody could already have published themselves. Spam and cost,
   * not theft — the same shape as `/api/onboard`, and openable for the same
   * reason.
   *
   * Bundles are returned rather than written: the browser is the caller, it has
   * no filesystem here, and the employer hands each file to its claimant. The
   * CLI writes the identical objects under `claims/<period>/`.
   */
  app.post(
    "/api/relay",
    rateLimit({ ...config.workLimit, bucket: "relay", noun: "relay runs" }),
    (req: Request, res: Response) => {
      const body = req.body ?? {};
      const period = Number(body.period);
      if (!Number.isInteger(period) || period < 200001 || period > 299912) {
        res.status(400).json({ error: "period must be YYYYMM, e.g. 202609" });
        return;
      }

      const openings: TerminationOpening[] = Array.isArray(body.openings) ? body.openings : [];
      if (openings.length === 0) {
        res.status(400).json({
          error:
            "openings is required — the termination opening files the employer downloaded. " +
            "Without them the attestation on chain is an opaque hash and no leaf can be built.",
        });
        return;
      }

      // Shape-checked here rather than inside `runRelay`, so a malformed upload
      // fails as a 400 naming the field instead of as a job that dies minutes
      // later during proving.
      for (const [i, opening] of openings.entries()) {
        for (const field of ["instance", "claimKeyHash", "nonce"] as const) {
          if (typeof opening?.[field] !== "string" || !opening[field]) {
            res.status(400).json({ error: `openings[${i}].${field} is required` });
            return;
          }
        }
        for (const field of ["slot", "finalPeriod", "monthsWorked"] as const) {
          if (!Number.isInteger(Number(opening?.[field]))) {
            res.status(400).json({ error: `openings[${i}].${field} must be a number` });
            return;
          }
        }
      }

      const publish = body.publish !== false;
      startJob(res, `relay ${period}${publish ? " + publish" : ""}`, (log) =>
        runRelay({ period, openings, publish, log })
      );
    }
  );

  app.post(
    "/api/onboard",
    rateLimit({ ...config.signupLimit, bucket: "onboard", noun: "signups" }),
    requireSignupCode(config),
    (req: Request, res: Response) => {
      const { instance, employerKey, companyName } = req.body ?? {};
      if (!instance || !employerKey) {
        res.status(400).json({ error: "instance and employerKey are required" });
        return;
      }

      // The "this key already has a contract" gate that used to sit here is
      // gone, and its absence is not a loosening.
      //
      // It existed because onboarding deployed a contract per caller, so a
      // repeat call left one employer owning two — a dashboard finding both and
      // only one holding their filings. There is one contract now, so that
      // cannot happen, and the list it consulted had become wrong in the
      // direction that matters: it remembered a key forever, so an employer
      // REVOKED and then legitimately re-onboarded was refused by a file rather
      // than by the chain.
      //
      // `onboardEmployer` reads `employerAssigned` off the contract before it
      // proves anything and refuses a taken seat by name, pointing at revoke.
      // That is the same guard, asked of the only thing that actually knows.
      startJob(res, `onboarding "${instance}"`, async (log) =>
        onboardEmployer(String(instance), String(employerKey), log, companyName)
      );
    }
  );

  /**
   * The registered employer's once-only starter allowance.
   *
   * PUBLIC, and it has to be. This is the money salaries settle in, so an
   * employer who signs up through the hosted page and then cannot draw it has
   * completed a signup that leads nowhere. It sat behind the token for a while
   * and the cost was exactly that: a page telling someone whose contract had
   * just been deployed for them to go and run the project locally.
   *
   * It mints, so it is bounded harder than `/api/onboard` is — and the bounds
   * live in `fundEmployer` rather than here, which is the right place for them
   * since `fund-cli` reaches the same code:
   *
   *   · the caller's key must already be the employer of a payroll contract on
   *     this network, checked against the chain rather than against a list;
   *   · that key must not have claimed before, recorded in `claims.json` — which
   *     is why that file follows DATA_DIR now, since a redeploy that forgot it
   *     would forgive everyone at once;
   *   · the amount is EMPLOYER_ALLOWANCE, fixed here and never read from the
   *     body — unlike `/faucet` below, which is this same mint with the ceiling
   *     taken off, and is why that one keeps the token.
   *
   * Total issuable supply is therefore one allowance per registered employer,
   * forever, which a bearer token would not reduce. The rate limit is only so
   * that the chain reads behind a rejected claim cannot be spammed.
   *
   * What an abuser CAN still do: claim against somebody else's registered key,
   * since a coin public key is public and nothing here proves possession of it.
   * The coin belongs to whoever holds the secret key behind it, so that mints
   * the allowance to its rightful owner — it does not steal, it spends their
   * once-only claim early, and only the operator can undo it. Named here rather
   * than left for someone to find.
   */
  app.post(
    "/api/claim",
    rateLimit({ ...config.signupLimit, bucket: "claim", noun: "claim attempts" }),
    (req: Request, res: Response) => {
      const keys = readRecipient(req, res);
      if (!keys) return;
      startJob(res, `funding ${keys.coinPublicKey.slice(0, 16)}…`, (log) =>
        fundEmployer(keys.coinPublicKey, keys.encryptionPublicKey, EMPLOYER_ALLOWANCE, log)
      );
    }
  );

  // ── Privileged ────────────────────────────────────────────────────────────

  const platform = express.Router();
  platform.use(requirePlatformToken(config));

  /**
   * Ends — or restores — a company's registration.
   *
   * Read what this does NOT do, because the button that calls it is easy to
   * misread. It writes one column in the registry. The contract is untouched —
   * the employer keeps every power they had a moment ago. `registry.ts` says it
   * plainly: marking a registration inactive is a statement about the SERVICE,
   * not about the contract.
   *
   * `revokeEmployer` is the lever that does bite on chain, and it is deliberately
   * NOT wired to this route. Ending a subscription and taking a customer's
   * contract away from them are different decisions with different blast radii,
   * and one button doing both is how the second happens by accident. Revoking is
   * a separate, explicit act — option 7 in the payroll CLI.
   *
   * Token-gated, and it has to be. A page can check that the connected wallet is
   * the platform key, and that check is worth exactly nothing to the server —
   * the coin public key is public, so anyone can claim it, and nothing in a POST
   * body proves possession. The UI check hides the control; this is what refuses
   * the request.
   */
  platform.post("/registrations/status", async (req: Request, res: Response) => {
    const { instance, status } = req.body ?? {};
    const networkId =
      String(req.body?.networkId ?? "") || EnvironmentManager.getNetworkConfig().networkId;

    if (!instance) {
      res.status(400).json({ error: "instance is required" });
      return;
    }
    if (status !== "active" && status !== "inactive") {
      res.status(400).json({ error: 'status must be "active" or "inactive"' });
      return;
    }

    try {
      const updated = await setStatus(networkId, String(instance), status);
      if (!updated) {
        // A 404 rather than a silent success: "nothing matched" and "it is now
        // inactive" look identical from a button, and only one of them means
        // the operator can stop thinking about it.
        res.status(404).json({
          error: `No registration for "${instance}" on ${networkId}.`,
        });
        return;
      }
      res.json({ registration: updated });
    } catch (cause) {
      const detail = cause instanceof Error ? cause.message : String(cause);
      console.log(`✘ registration status: ${detail}`);
      res.status(503).json({
        error: "The registration database is unavailable — start it with `npm run db:up`",
        detail,
      });
    }
  });

  /**
   * The open faucet: mints pEUR to the caller, any amount, no questions.
   *
   * Distinct from /claim, whose once-only restriction is deliberate. This one
   * has no limit at all, which is exactly why it must never be reachable
   * without a token.
   */
  platform.post("/faucet", (req: Request, res: Response) => {
    const keys = readRecipient(req, res);
    if (!keys) return;
    const amount = readAmount(req, res);
    if (amount === null) return;
    startJob(res, `minting to ${keys.coinPublicKey.slice(0, 16)}…`, (log) =>
      mintToRecipient(keys.coinPublicKey, keys.encryptionPublicKey, amount, log)
    );
  });

  /**
   * Gives the treasury wallets the NIGHT they need to spend what they hold.
   *
   * A treasury only ever receives, so its ordinary state is a pEUR balance it
   * cannot move: fees are paid in DUST, DUST comes from registered NIGHT, and
   * nothing sends a treasury NIGHT. Doing it by hand is not an option either —
   * the seeds are raw hex, and a browser wallet imports a recovery phrase and
   * nothing else, so no wallet app can hold these keys.
   *
   * This service can, so it does it: the platform wallet sends NIGHT, and each
   * treasury registers what it received. Both halves are needed; unregistered
   * NIGHT generates no DUST and fails exactly like none at all.
   *
   * Idempotent by default — a treasury that already holds NIGHT is checked for
   * registration and otherwise left alone.
   */
  platform.post("/treasuries/night", (req: Request, res: Response) => {
    const asked = req.body?.wallets;
    const wallets = Array.isArray(asked)
      ? asked.filter((w: unknown): w is TreasuryName =>
          w === "social-treasury" || w === "tax-treasury"
        )
      : undefined;
    if (wallets && wallets.length === 0) {
      res.status(400).json({
        error: 'wallets must name "social-treasury" or "tax-treasury"',
      });
      return;
    }

    // The platform wallet is not fundable from here: it is the source, and a
    // request that could name it would be asking this service to pay itself.
    startJob(res, "funding the treasuries with NIGHT", (log) =>
      fundTreasuriesWithNight({ wallets, force: Boolean(req.body?.force), log })
    );
  });

  /**
   * What the treasury wallets hold, so an operator does not have to guess.
   *
   * A job rather than a plain GET, for two reasons that both come from the
   * balance being SHIELDED. It cannot be read from the indexer — only the
   * holder of the spending key can decrypt its own coins — so this builds each
   * wallet and syncs it, which is minutes on a cold cache. And it touches the
   * same wallets `/fund/deposit` spends, so it belongs under the same `busy`
   * lock rather than racing a deposit that is already running.
   *
   * Behind the platform token with the rest of this router: the balance of a
   * wallet is not a public fact, and the route exists to serve the operator who
   * is about to spend it.
   */
  platform.post("/treasuries/balances", (req: Request, res: Response) => {
    const asked = req.body?.wallets;
    const wallets = Array.isArray(asked)
      ? asked.filter((w: unknown): w is TreasuryName =>
          w === "social-treasury" || w === "tax-treasury" || w === "platform"
        )
      : undefined;
    if (wallets && wallets.length === 0) {
      res.status(400).json({
        error: 'wallets must name "social-treasury", "tax-treasury" or "platform"',
      });
      return;
    }

    startJob(res, `reading treasury balances`, (log) =>
      readTreasuryBalances({ wallets, log })
    );
  });

  /**
   * Moves a treasury's pEUR into the benefit fund.
   *
   * Behind the platform token, unlike `/api/relay`, and the difference is what
   * signs. The relay submits a permissionless transaction anyone could send;
   * this one SPENDS a treasury wallet, whose seed lives in this service's
   * environment. A route that spends a key on request is an operator action
   * however carefully it is bounded.
   *
   * `from` names which environment secret to use — it never carries one. A
   * request can choose the social treasury or the platform; it cannot supply a
   * wallet, and nothing here reads a key out of the body.
   *
   * Why the social treasury is the default: `remitSocial` sends every period's
   * contributions there, and the fund pays benefits out of contributions. The
   * platform option stays because that is where every existing deposit came
   * from, and topping up from it is still legitimate — it is just not the same
   * thing as contributions arriving.
   */
  platform.post("/fund/deposit", (req: Request, res: Response) => {
    const body = req.body ?? {};
    const from = String(body.from ?? "social-treasury");
    if (!["social-treasury", "tax-treasury", "platform"].includes(from)) {
      res.status(400).json({
        error: 'from must be "social-treasury", "tax-treasury" or "platform"',
      });
      return;
    }

    let amountMinor: bigint;
    try {
      // Parsed the same way `/api/mint` parses its amount, so a euro figure and
      // a minor-unit figure cannot be confused between the two routes.
      amountMinor = parsePeurAmount(String(body.amount ?? ""));
    } catch (cause) {
      res.status(400).json({
        error: cause instanceof Error ? cause.message : String(cause),
      });
      return;
    }

    // The period these contributions cover, and the payroll contract they came
    // from. Required rather than defaulted: a deposit filed against the wrong
    // month is worse than one refused, because it reconciles against a total it
    // has nothing to do with.
    const period = Number(body.period);
    if (!Number.isInteger(period) || period < 200001 || period > 299912) {
      res.status(400).json({ error: "period is required, as YYYYMM (e.g. 202609)" });
      return;
    }
    const source = String(body.source ?? "").replace(/^0x/, "");
    if (!/^[0-9a-f]{64}$/i.test(source)) {
      res.status(400).json({
        error: "source is required — the payroll contract address these contributions came from",
      });
      return;
    }

    // Which national contract receives it. Defaulted rather than required, so
    // the existing fund flow keeps working unchanged.
    const target = String(body.target ?? "fund");
    if (target !== "fund" && target !== "taxvault") {
      res.status(400).json({ error: 'target must be "fund" or "taxvault"' });
      return;
    }

    startJob(res, `depositing €${body.amount} from ${from} into ${target}`, (log) =>
      depositToFund({ amountMinor, from: from as any, period, source, target, log })
    );
  });

  /**
   * The two halves of a deposit the BROWSER pays for.
   *
   * `/fund/deposit` above does the whole thing here because the service holds
   * the treasury seed. When the treasury is a wallet in the operator's browser,
   * the paying half moves there — but the nonce cannot follow it. See
   * `utils/deposit-prepare.ts`: `fund-pool.json` is the fund's only record of
   * the coins it holds, and a browser tab is not a place to keep it.
   *
   * Both are token-gated with the rest of this router, because both WRITE that
   * file. Reading it wrong strands a coin; writing it wrong strands a coin.
   *
   * Synchronous rather than jobs: neither call proves anything, so neither
   * takes more than a round trip to the indexer. The long part is the browser's.
   */
  platform.post("/fund/deposit/prepare", async (req: Request, res: Response) => {
    const body = req.body ?? {};
    let amountMinor: bigint;
    try {
      amountMinor = parsePeurAmount(String(body.amount ?? ""));
    } catch (cause) {
      res.status(400).json({ error: cause instanceof Error ? cause.message : String(cause) });
      return;
    }
    const target = String(body.target ?? "fund");
    if (target !== "fund" && target !== "taxvault") {
      res.status(400).json({ error: 'target must be "fund" or "taxvault"' });
      return;
    }
    try {
      res.json(
        await prepareDeposit({
          amountMinor,
          period: Number(body.period),
          source: String(body.source ?? ""),
          target,
        })
      );
    } catch (cause) {
      res.status(400).json({ error: cause instanceof Error ? cause.message : String(cause) });
    }
  });

  platform.post("/fund/deposit/confirm", async (req: Request, res: Response) => {
    const body = req.body ?? {};
    const nonce = String(body.nonce ?? "").replace(/^0x/, "");
    const txHash = String(body.txHash ?? "");
    const target = String(body.target ?? "fund");
    if (!/^[0-9a-f]{64}$/i.test(nonce)) {
      res.status(400).json({ error: "nonce is required, 64 hex characters" });
      return;
    }
    if (target !== "fund" && target !== "taxvault") {
      res.status(400).json({ error: 'target must be "fund" or "taxvault"' });
      return;
    }
    try {
      res.json(await confirmPreparedDeposit({ nonce, txHash, target }));
    } catch (cause) {
      // NOT a 500: the transaction has already landed by the time this runs, so
      // a failure here is a bookkeeping problem, not a failed deposit. Saying
      // otherwise would send an operator to re-send money that already moved.
      res.status(409).json({
        error: cause instanceof Error ? cause.message : String(cause),
        note: "The deposit may have landed. Check `npm run fund -- pool` before retrying.",
      });
    }
  });

  platform.post("/mint", (req: Request, res: Response) => {
    const amount = readAmount(req, res);
    if (amount === null) return;
    startJob(res, `minting ${amount} minor units`, (log) => mintExtra(amount, log));
  });

  /**
   * Forgets what this service has deployed and who has signed up.
   *
   * A testing affordance, and the most destructive route here — which is why it
   * asks for `{"confirm":"reset"}` in the body. The token alone is not enough:
   * every other privileged route costs money at worst, and money can be minted
   * again. This one destroys the only record of where contracts live.
   *
   * ── What that costs, in full ────────────────────────────────────────────────
   *
   * `deployment.json` is the ONLY place an onboarded contract's address is
   * written. `assignEmployer` can be called exactly once, so a contract already
   * bound to an employer is theirs permanently — and once its address is gone,
   * nothing can reach it again. It is not recoverable from this service, from
   * the employer's browser, or from the chain without the address to look up.
   * The README's DATA_DIR section says the same thing at more length and it is not
   * being softened here: on a service with real employers on it, calling this
   * strands them.
   *
   * ── What it does not touch ─────────────────────────────────────────────────
   *
   * `.wallet-state/` stays. It holds a sync position, not a fact — deleting it
   * costs a full chain replay on next boot and buys nothing, since nothing in
   * it is what "start fresh" means.
   *
   * `frontend/public/deployments.json` also stays, and cannot be reached from
   * here: it is committed source that ships with the build, and it is the
   * baseline the frontend merges the live file over. After a reset the list
   * falls back to it, which is the intended floor rather than an empty page.
   */
  platform.post("/reset", (req: Request, res: Response) => {
    if ((req.body ?? {}).confirm !== "reset") {
      res.status(400).json({
        error:
          'This deletes the record of every contract this service has deployed, ' +
          'and an onboarded contract cannot be reached again without its address. ' +
          'Send {"confirm":"reset"} if that is what you mean.',
      });
      return;
    }

    // Removed, not emptied. `readLedger` and the deployment reader both treat an
    // unreadable file as absent and carry on, so absence is the state they are
    // already written to handle — where an empty file is one more shape to get
    // right in two places.
    const targets = ["deployment.json", ".onboarded-keys.json"];
    const removed: string[] = [];
    const failed: { file: string; error: string }[] = [];

    for (const name of targets) {
      const target = path.join(dataDir(), name);
      try {
        if (fs.existsSync(target)) {
          fs.unlinkSync(target);
          removed.push(name);
        }
      } catch (cause) {
        failed.push({
          file: name,
          error: cause instanceof Error ? cause.message : String(cause),
        });
      }
    }

    // Logged because this leaves no other trace: the evidence it happened is
    // the files being gone, which looks identical to them never existing.
    console.warn(
      `[reset] cleared ${removed.length ? removed.join(", ") : "nothing"} from ${dataDir()}`
    );

    // 500 on partial failure: reporting success while one file survived would
    // send someone to retry onboarding that is still going to be refused.
    res.status(failed.length ? 500 : 200).json({
      dataDir: dataDir(),
      removed,
      ...(failed.length ? { failed } : {}),
      note:
        "Deployment records and onboarding history are gone. The frontend now " +
        "falls back to the committed baseline. Restart is not required.",
    });
  });

  /**
   * Funds and pays a filed period.
   *
   * ⚠️ Signs with the platform wallet, so it only works where the employer IS
   * the operator. An employer with their own wallet does this in the browser
   * via `fundAndPayPeriod`, and should.
   *
   * The request carries salaries. That is the one place where "the roster never
   * leaves your browser" stops being literally true, and it should be read as
   * such rather than glossed over — note what is absent, though: the payroll
   * passphrase. This takes only the material for the period being paid, so a
   * compromised service learns one month's amounts rather than every period.
   */
  platform.post("/payroll/run", (req: Request, res: Response) => {
    try {
      const body = req.body ?? {};
      if (!body.instance || !body.period || !body.slots?.length) {
        res.status(400).json({ error: "instance, period and slots are all required" });
        return;
      }

      const hex = (value: string | undefined, field: string) => {
        if (!value || !/^[0-9a-f]{64}$/i.test(value)) {
          throw new Error(`${field} must be 64 hex characters`);
        }
        return Uint8Array.from(Buffer.from(value, "hex"));
      };

      const slots = body.slots.map((slot: any, i: number) => ({
        // `gross` is what the page sends; `salary` is the older name, kept so a
        // request built against the previous shape fails on the missing
        // withholding fields rather than silently funding a wrong figure.
        salary: BigInt(slot.gross ?? slot.salary ?? "0"),
        tax: BigInt(slot.tax ?? "0"),
        social: BigInt(slot.social ?? "0"),
        net: BigInt(slot.net ?? "0"),
        weeks: Number(slot.weeks ?? 4),
        salaryNonce: hex(slot.salaryNonce, `slots[${i}].salaryNonce`),
        coinNonce: hex(slot.coinNonce, `slots[${i}].coinNonce`),
        payee: hex(slot.payee, `slots[${i}].payee`),
        // Not run through `hex()`: an encryption public key is not 32 bytes.
        payeeEnc: String(slot.payeeEnc ?? "").toLowerCase(),
      }));

      if (slots.some((slot: any) => slot.net <= 0n)) {
        res.status(400).json({
          error:
            "every slot needs gross, tax, social and net — the commitment binds " +
            "all four, so the gross alone cannot open it",
        });
        return;
      }
      if (slots.some((slot: any) => !/^[0-9a-f]+$/.test(slot.payeeEnc))) {
        res.status(400).json({
          error: "every slot needs a hex payeeEnc (the payee's encryption public key)",
        });
        return;
      }

      startJob(res, `fund+pay ${body.instance} ${body.period}`, (log) =>
        fundAndPay(String(body.instance), Number(body.period), slots, log)
      );
    } catch (cause) {
      res.status(400).json({
        error: cause instanceof Error ? cause.message : String(cause),
      });
    }
  });

  app.use("/api", platform);

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: "Not found" });
  });

  return app;
}

/** Both keys, because a coin minted without the encryption key is unfindable. */
function readRecipient(
  req: Request,
  res: Response
): { coinPublicKey: string; encryptionPublicKey: string } | null {
  const { coinPublicKey, encryptionPublicKey } = req.body ?? {};
  if (!coinPublicKey || !encryptionPublicKey) {
    res.status(400).json({ error: "coinPublicKey and encryptionPublicKey are required" });
    return null;
  }
  return {
    coinPublicKey: String(coinPublicKey),
    encryptionPublicKey: String(encryptionPublicKey),
  };
}

/** Null means the response has already been sent. */
function readAmount(req: Request, res: Response): bigint | null {
  try {
    return parsePeurAmount(String(req.body?.amount ?? ""));
  } catch (cause) {
    res.status(400).json({ error: cause instanceof Error ? cause.message : String(cause) });
    return null;
  }
}

import express, { type Express, type Request, type Response } from "express";
import cors from "cors";
import { requirePlatformToken } from "./auth.js";
import { alreadyOnboarded, rateLimit, recordOnboarded, requireSignupCode } from "./guards.js";
import { getJob, startJob } from "./jobs.js";
import type { ServerConfig } from "./config.js";
import { fundAndPay } from "../utils/payroll-run.js";
import { onboardEmployer } from "../utils/onboarding.js";
import {
  EMPLOYER_ALLOWANCE,
  fundEmployer,
  mintExtra,
  mintToRecipient,
} from "../utils/funding.js";
import { parsePeurAmount } from "../utils/constructor-args.js";
import { EnvironmentManager } from "../utils/environment.js";
import { findRegistration, listRegistrations } from "../utils/registry.js";
import { listDeployments } from "../utils/deployments.js";
import { dataDir } from "../utils/data-dir.js";

/**
 * The platform's HTTP surface.
 *
 * Two route groups with deliberately different postures, and the separation is
 * the point of this file rather than an organising convenience:
 *
 *   PUBLIC     — reads that disclose nothing not already on chain. No token.
 *   PRIVILEGED — deploys contracts and mints pEUR with the platform wallet.
 *                Token required whenever the server is reachable off-machine.
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
   * Self-service signup. Public, and bounded rather than authenticated.
   *
   * The deploy is signed by the PLATFORM wallet — which is why this server
   * exists — but the contract it produces is assigned to the CALLER'S key, so
   * what an abuser gets is a contract only they can use and a bill the platform
   * pays in fees. Spam and cost, not theft. `guards.ts` sets out why that makes
   * this route openable when the three below are not.
   */
  app.post(
    "/api/onboard",
    rateLimit(config.signupLimit),
    requireSignupCode(config),
    (req: Request, res: Response) => {
      const { instance, employerKey, companyName } = req.body ?? {};
      if (!instance || !employerKey) {
        res.status(400).json({ error: "instance and employerKey are required" });
        return;
      }

      // Refused before three minutes of proving. Note this runs AFTER the rate
      // limit, so a repeated duplicate still spends the caller's budget — which
      // is right: it is a request either way, and the alternative would be an
      // unlimited oracle for "does this key already have a contract".
      //
      // The check matters because a second contract for the same employer is
      // not harmless: their dashboard would find two, and only one of them
      // holds their filings.
      const existing = alreadyOnboarded(String(employerKey));
      if (existing) {
        res.status(409).json({
          error:
            `That signing key already has a payroll contract ("${existing.instance}", ` +
            `created ${existing.at.slice(0, 10)}). Connect that wallet and use it, or ` +
            "ask the platform operator if you need a second.",
        });
        return;
      }

      startJob(res, `onboarding "${instance}"`, async (log) => {
        const result = await onboardEmployer(
          String(instance), String(employerKey), log, companyName
        );
        // Recorded only on success, so a failed deploy does not lock the key
        // out of trying again.
        recordOnboarded(String(employerKey), String(instance));
        return result;
      });
    }
  );

  const platform = express.Router();
  platform.use(requirePlatformToken(config));

  /** The registered employer's once-only starter allowance. */
  platform.post("/claim", (req: Request, res: Response) => {
    const keys = readRecipient(req, res);
    if (!keys) return;
    startJob(res, `funding ${keys.coinPublicKey.slice(0, 16)}…`, (log) =>
      fundEmployer(keys.coinPublicKey, keys.encryptionPublicKey, EMPLOYER_ALLOWANCE, log)
    );
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

  platform.post("/mint", (req: Request, res: Response) => {
    const amount = readAmount(req, res);
    if (amount === null) return;
    startJob(res, `minting ${amount} minor units`, (log) => mintExtra(amount, log));
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

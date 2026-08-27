import express, { type Express, type Request, type Response } from "express";
import fs from "node:fs";
import path from "node:path";
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
import { findRegistration, listRegistrations, setStatus } from "../utils/registry.js";
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
   * this route openable, and why `/api/claim` below is openable for a different
   * reason, when the three behind the token are not.
   */
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
   * misread. It writes one column in the registry. The contract is untouched:
   * `assignEmployer` is permanent, there is no revoke circuit, and the employer
   * keeps every power they had a moment ago. `registry.ts` says it plainly —
   * marking a registration inactive is a statement about the SERVICE, not about
   * the contract.
   *
   * The one lever that does bite is elsewhere and is not a button: `setParamsFor`
   * is platform-only and write-once per period, so an employer whose future
   * periods are never recorded cannot file them. Revocation by omission.
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
   * `src/server/README.md` says the same thing at more length and it is not
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

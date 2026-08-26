import fs from "fs";
import path from "path";
import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { ServerConfig } from "./config.js";

/**
 * What stands in for a bearer token on the one route that cannot have one.
 *
 * `/api/onboard` has to be callable by a stranger — that is the entire point of
 * self-service signup — and a token shipped in a browser bundle is a published
 * token. So it is bounded rather than authenticated, and the bound is chosen
 * against what the route can actually cost.
 *
 * What it CAN cost: transaction fees, and a contract on chain that nobody
 * wanted. What it cannot: money. `onboardEmployer` deploys a payroll contract
 * and assigns it to the CALLER'S signing key, so an abuser ends up with a
 * contract only they can use, paid for with the platform's fees. That is spam
 * and a bill, not theft — which is why this route can be opened while
 * `/api/faucet`, `/api/mint` and `/api/payroll/run` stay behind the token. Those
 * three create or move pEUR, and no rate limit makes that safe to publish.
 *
 * Three guards, weakest to strongest:
 *
 *   1. one contract per employer key — stops double-submits and makes repeat
 *      abuse need fresh keys;
 *   2. a per-IP rate limit — makes fresh keys cost time;
 *   3. an optional signup code — makes it cost knowing something, and is the
 *      lever to reach for if the first two are ever not enough.
 */

/**
 * Requests seen per client, newest last.
 *
 * In memory, so a restart forgives everyone. That is the right trade for a
 * limit whose job is to slow down bulk abuse rather than to be an accounting
 * record — and this process already keeps its job queue in memory, so nothing
 * here is more durable than the thing it protects.
 */
const hits = new Map<string, number[]>();

export function rateLimit(options: { windowMs: number; max: number }) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // `req.ip` reads X-Forwarded-For only when Express is told to trust the
    // proxy — see `trust proxy` in app.ts. Without it every request behind
    // Render's router shares one address and the limit applies to everybody at
    // once, which looks like a working limit right up until it locks out real
    // users.
    const key = req.ip ?? "unknown";
    const now = Date.now();
    const since = now - options.windowMs;

    const recent = (hits.get(key) ?? []).filter((at) => at > since);
    if (recent.length >= options.max) {
      const retryAfter = Math.ceil((recent[0]! + options.windowMs - now) / 1000);
      res.setHeader("Retry-After", String(retryAfter));
      res.status(429).json({
        error:
          `Too many signups from this address. Try again in ${Math.ceil(retryAfter / 60)} ` +
          "minute(s), or ask the platform operator to onboard you directly.",
      });
      return;
    }

    recent.push(now);
    hits.set(key, recent);

    // Bounded so a stream of unique addresses cannot grow this without limit —
    // the memory leak a naive rate limiter ships with.
    if (hits.size > 10_000) {
      for (const [k, times] of hits) {
        if (times.every((at) => at <= since)) hits.delete(k);
      }
    }
    next();
  };
}

/** Constant-time, for the same reason the bearer check is. */
function equal(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * An optional shared secret for signup.
 *
 * Unset, signup is open to anyone who can reach the service. Set, an employer
 * needs a code the operator gave them — which is the difference between a demo
 * anyone may try and a pilot with an invite list, without changing any code.
 */
export function requireSignupCode(config: ServerConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.signupCode) {
      next();
      return;
    }
    const presented = String(req.body?.signupCode ?? "").trim();
    if (!presented || !equal(presented, config.signupCode)) {
      res.status(403).json({
        error: "That signup code is not right. Ask the platform operator for one.",
      });
      return;
    }
    next();
  };
}

/**
 * Which employer keys already have a contract.
 *
 * On disk rather than in memory, because "you already have one" has to survive
 * a restart — otherwise every deploy re-opens the door to a duplicate, and a
 * second contract for the same employer is not harmless: their dashboard finds
 * two, and only one of them holds their filings.
 *
 * Deliberately NOT the source of truth. The chain is, and `deployment.json`
 * records what was deployed. This answers one narrow question quickly, and if
 * it is lost the worst case is a duplicate that the operator can see and prune.
 */
const LEDGER = path.join(process.cwd(), ".onboarded-keys.json");

type OnboardedKey = { employerKey: string; instance: string; at: string };

function readLedger(): OnboardedKey[] {
  try {
    return JSON.parse(fs.readFileSync(LEDGER, "utf8")) as OnboardedKey[];
  } catch {
    return [];
  }
}

export function alreadyOnboarded(employerKey: string): OnboardedKey | null {
  const key = employerKey.trim().toLowerCase();
  return readLedger().find((row) => row.employerKey === key) ?? null;
}

export function recordOnboarded(employerKey: string, instance: string): void {
  try {
    const rows = readLedger();
    rows.push({
      employerKey: employerKey.trim().toLowerCase(),
      instance,
      at: new Date().toISOString(),
    });
    fs.writeFileSync(LEDGER, JSON.stringify(rows, null, 2), { mode: 0o600 });
  } catch {
    // A failed write costs the duplicate check, not the contract — which is
    // already deployed by the time this runs. Silent rather than fatal for the
    // same reason `recordRegistration` is.
  }
}

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import { timingSafeEqual } from "crypto";
import type { NextFunction, Request, Response } from "express";
import type { ServerConfig } from "./config.js";
import { isLiveSession } from "./wallet-auth.js";

/**
 * Guards the routes that spend the platform wallet.
 *
 * Applied per route group rather than globally, because the two halves of this
 * server have opposite postures: reading the registration list or a claim
 * bundle discloses nothing anyone cannot already read off the chain, while
 * onboarding deploys a contract and minting creates money. Wrapping everything
 * in one blanket rule would mean either gating public data behind a shared
 * secret or, far worse, someone later relaxing the blanket to un-gate it.
 *
 * With no token configured the server is on loopback — `config.ts` will not let
 * it be anywhere else — so the guard passes. That keeps `npm run server` a
 * single command locally while making the hosted case impossible to get wrong.
 */
export function requirePlatformToken(config: ServerConfig) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!config.token) {
      next();
      return;
    }

    const header = req.header("authorization") ?? "";
    const presented = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

    // A wallet session is the other way in, and the better one: it proves the
    // caller HOLDS the platform wallet rather than that they know a string.
    // Checked first because it is the path the operator page takes; the static
    // token stays for callers with no wallet to sign with — scripts, the CLI,
    // and anything driving this service unattended. See `wallet-auth.ts`.
    if (presented && isLiveSession(presented)) {
      next();
      return;
    }

    if (!presented || !constantTimeEqual(presented, config.token)) {
      // No detail. A message distinguishing "no token" from "wrong token" is a
      // free oracle, and there is nothing an honest caller learns from it that
      // the documentation does not already tell them.
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    next();
  };
}

/**
 * Compared without an early exit, so the time taken does not reveal how much of
 * a guess was right. Lengths are compared first and separately, which does leak
 * the token's length — unavoidable, and worth far less to an attacker than a
 * per-byte oracle.
 */
function constantTimeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

// Copyright 2026 Henk Wim de Boer
// SPDX-License-Identifier: Apache-2.0

import "dotenv/config";

/**
 * Where the server listens, and what it refuses to do without.
 *
 * The whole reason this file exists is one interlock. `demo-server.ts` was safe
 * by accident: it hardcoded `127.0.0.1`, so the fact that it had no
 * authentication never mattered — nothing outside the machine could reach it.
 * Making the host configurable removes that accident, and an unauthenticated
 * service that spends the platform wallet is not something to leave one
 * environment variable away from being public.
 *
 * So binding anywhere but loopback REQUIRES a token, and the process refuses to
 * start otherwise. That turns "I deployed it and forgot the token" from a
 * silently drainable wallet into a failure at boot, which is the only moment
 * that mistake is cheap.
 */

const LOOPBACK = new Set(["127.0.0.1", "::1", "localhost"]);

/**
 * Whether a managed host is routing traffic to this process, and which one.
 *
 * A platform like Render runs the process in a container and forwards requests
 * to it from outside, so binding loopback makes the service invisible: it
 * starts, it listens, and the router's port scan finds nothing. Render says so
 * in as many words — "Detected open ports on localhost -- did you mean to bind
 * one of these to 0.0.0.0?" — after a ten-minute scan timeout, which is a long
 * way to travel for a missing environment variable.
 *
 * Keyed on the platform's OWN variable rather than on `PORT`. Plenty of local
 * tooling sets `PORT`, and inferring "managed host" from it would quietly start
 * binding a development machine to every interface — the exact thing the
 * interlock below exists to prevent someone doing by accident.
 *
 * This changes only the DEFAULT. An explicit SERVER_HOST always wins, and the
 * token requirement is unaffected: on a managed host with no token the process
 * still refuses to start, which is the whole point of it.
 */
function managedHost(env: NodeJS.ProcessEnv): string | null {
  if (env.RENDER) return "Render";
  return null;
}

export interface ServerConfig {
  host: string;
  port: number;
  /** Bearer token for the privileged routes, or null when purely local. */
  token: string | null;
  /** Origins allowed to call this. Empty means same-origin/dev-proxy only. */
  allowedOrigins: string[];
  /** True when nothing outside this machine can reach the socket. */
  loopbackOnly: boolean;
  /** The managed host detected, when the bind address came from it. */
  hostChosenFor: string | null;
  /**
   * Optional shared secret for self-service signup, or null for open signup.
   *
   * Separate from PLATFORM_API_TOKEN on purpose: that one authenticates the
   * OPERATOR and must never reach a browser, while this one is handed to
   * prospective employers and is expected to. They protect different things and
   * merging them would drag the operator's credential into a public page.
   */
  signupCode: string | null;
  /** How many signups one address may start, and over what window. */
  signupLimit: { windowMs: number; max: number };
  /**
   * The looser bound, for work an employer legitimately repeats.
   *
   * Separated from `signupLimit` because the two are protecting against
   * different things. Onboarding, the faucet and the starter allowance spend
   * the PLATFORM'S money — a deploy, a mint — so three an hour is generous.
   * Building a claim bundle, publishing a claim-key hash and storing a sealed
   * roster spend nothing: the relay verifies every opening against the chain
   * and refuses what does not match, publishing is permissionless anyway, and
   * the other two write one row.
   *
   * Sharing the signup bound made a rebuild after a failed claim hit "try again
   * in 34 minutes" — a limit protecting nothing, applied to the recovery path
   * for the failure it was blocking.
   */
  workLimit: { windowMs: number; max: number };
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const managed = managedHost(env);
  const explicitHost = env.SERVER_HOST?.trim();
  const host = explicitHost || (managed ? "0.0.0.0" : "127.0.0.1");
  // PORT is the convention every PaaS assigns; SERVER_PORT wins when both are
  // set, so a local override still works. Reading only SERVER_PORT would mean
  // hardcoding whatever Render happened to pick, which breaks the next time it
  // picks differently.
  const port = Number(env.SERVER_PORT ?? env.PORT ?? env.DEMO_SERVER_PORT ?? 8787);
  const token = env.PLATFORM_API_TOKEN?.trim() || null;
  const loopbackOnly = LOOPBACK.has(host);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`SERVER_PORT must be a port number, got "${env.SERVER_PORT}"`);
  }

  if (!loopbackOnly && !token) {
    // Says WHY the host is what it is. On a managed host the address was not
    // typed by anyone, so "leave SERVER_HOST unset" would be useless advice.
    const why = explicitHost
      ? `Refusing to listen on ${host} without PLATFORM_API_TOKEN.`
      : `Refusing to start on ${managed} without PLATFORM_API_TOKEN.\n` +
        `  ${managed} routes traffic from outside, so this binds ${host} rather than loopback.`;
    throw new Error(
      `${why}\n` +
        "  These routes deploy contracts and mint pEUR with the platform wallet.\n" +
        "  Reachable from off-machine and unauthenticated, that wallet is public.\n" +
        "  Set PLATFORM_API_TOKEN to a long random string" +
        (explicitHost ? ", or leave SERVER_HOST unset\n  to keep the server on 127.0.0.1." : ".")
    );
  }

  // A token shorter than this is a password someone chose, and these routes are
  // worth more than a password someone chose.
  if (token && token.length < 24) {
    throw new Error(
      `PLATFORM_API_TOKEN is ${token.length} characters; use at least 24.\n` +
        "  Generate one with: openssl rand -hex 32"
    );
  }

  return {
    host,
    port,
    token,
    allowedOrigins: (env.ALLOWED_ORIGINS ?? "")
      .split(",")
      .map((origin) => origin.trim())
      // A trailing slash is the easy mistake: a browser sends `Origin:` with no
      // path, and `cors` compares exact strings — so "https://x.app/" matches
      // nothing and every request fails CORS for a reason that looks nothing
      // like a typo. Normalised here rather than diagnosed later.
      .map((origin) => origin.replace(/\/+$/, ""))
      .filter(Boolean),
    loopbackOnly,
    hostChosenFor: explicitHost ? null : managed,
    signupCode: env.SIGNUP_CODE?.trim() || null,
    signupLimit: {
      windowMs: 60 * 60 * 1000,
      // Three an hour per address. High enough that a person retrying a failed
      // signup is never blocked, low enough that bulk deployment on the
      // platform's fees is not worth the wait.
      max: Number(env.SIGNUP_LIMIT_PER_HOUR ?? 3),
    },
    workLimit: {
      windowMs: 60 * 60 * 1000,
      // Thirty an hour: an employer correcting a month, rebuilding a bundle and
      // re-storing a roster in one sitting is ordinary, and none of it is
      // expensive to refuse.
      max: Number(env.WORK_LIMIT_PER_HOUR ?? 30),
    },
  };
}

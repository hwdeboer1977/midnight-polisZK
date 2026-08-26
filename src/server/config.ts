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
  };
}

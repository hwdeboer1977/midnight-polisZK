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

export interface ServerConfig {
  host: string;
  port: number;
  /** Bearer token for the privileged routes, or null when purely local. */
  token: string | null;
  /** Origins allowed to call this. Empty means same-origin/dev-proxy only. */
  allowedOrigins: string[];
  /** True when nothing outside this machine can reach the socket. */
  loopbackOnly: boolean;
}

export function readServerConfig(env: NodeJS.ProcessEnv = process.env): ServerConfig {
  const host = env.SERVER_HOST?.trim() || "127.0.0.1";
  const port = Number(env.SERVER_PORT ?? env.DEMO_SERVER_PORT ?? 8787);
  const token = env.PLATFORM_API_TOKEN?.trim() || null;
  const loopbackOnly = LOOPBACK.has(host);

  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error(`SERVER_PORT must be a port number, got "${env.SERVER_PORT}"`);
  }

  if (!loopbackOnly && !token) {
    throw new Error(
      `Refusing to listen on ${host} without PLATFORM_API_TOKEN.\n` +
        "  These routes deploy contracts and mint pEUR with the platform wallet.\n" +
        "  Reachable from off-machine and unauthenticated, that wallet is public.\n" +
        "  Set PLATFORM_API_TOKEN to a long random string, or leave SERVER_HOST unset\n" +
        "  to keep the server on 127.0.0.1."
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
      .filter(Boolean),
    loopbackOnly,
  };
}

/**
 * Which HTTP routes need the platform token, and which must not.
 *
 * This is the one boundary in the server whose failure is silent in both
 * directions. Close a route that should be open and an employer who signed up
 * on the hosted page cannot draw the asset salaries settle in — the app looks
 * fine, it just dead-ends, which is exactly how `/api/claim` ended up behind the
 * token for a while. Open one that should be closed and the platform wallet
 * mints whatever a stranger asks for, which nothing else here would catch: the
 * router accepts the request, the job starts, and the first sign of trouble is
 * the supply.
 *
 * So the posture is asserted rather than commented. The app is built with a
 * token configured — the hosted case, since with no token `requirePlatformToken`
 * passes everything and the test would prove nothing — and every request below
 * is sent with NO Authorization header, as a stranger's browser would.
 *
 * A 400 is a pass for an open route: it means the body was rejected by the
 * handler, so the guard let it through. That is deliberate — the bodies here are
 * empty on purpose, so no route can actually reach a wallet or the chain. The
 * test never mints anything.
 *
 *   npm run test:routes
 */
import { createApp } from "../dist/server/app.js";

let failures = 0;
const check = (name, ok, detail) => {
  if (!ok) failures += 1;
  console.log(`${ok ? "  ok  " : "FAIL  "}${name}${ok || !detail ? "" : ` — ${detail}`}`);
};

console.log("\nroute posture (token configured, no token presented)\n");

/** A hosted deployment: token set, so the privileged guard is live. */
const config = {
  host: "127.0.0.1",
  port: 0,
  token: "t".repeat(32),
  allowedOrigins: [],
  loopbackOnly: true,
  hostChosenFor: null,
  signupCode: null,
  // Generous, so that four requests in a row cannot trip a limit and turn a
  // posture failure into a 429 that looks like a pass.
  signupLimit: { windowMs: 3_600_000, max: 1000 },
};

const server = createApp(config).listen(0, "127.0.0.1");
await new Promise((resolve) => server.once("listening", resolve));
const base = `http://127.0.0.1:${server.address().port}`;

const post = async (path, body) => {
  const res = await fetch(`${base}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return res.status;
};

try {
  // Open, and bounded inside `fundEmployer` instead: the key must already be an
  // employer on chain, must not have claimed, and the amount is the server's.
  // An empty body cannot get past `readRecipient`, so this stops at 400 —
  // proving the guard passed without going near the wallet.
  const claim = await post("/api/claim", {});
  check("POST /api/claim is not token-gated", claim !== 401, `got ${claim}`);
  check("POST /api/claim still validates its body", claim === 400, `got ${claim}`);

  // Open for a different reason — it deploys a contract assigned to the
  // caller's own key, so abuse costs fees rather than money.
  const onboard = await post("/api/onboard", {});
  check("POST /api/onboard is not token-gated", onboard !== 401, `got ${onboard}`);

  // The employer drives the relay from their own browser and holds no platform
  // token, so this must stay open — but it spends the platform's fees, so it is
  // asserted deliberately rather than left to drift either way. A 400 is the
  // pass: the guard let it through and the handler rejected an empty body.
  const relay = await post("/api/relay", {});
  check("POST /api/relay is not token-gated", relay !== 401, `got ${relay}`);
  check("POST /api/relay still validates its body", relay === 400, `got ${relay}`);

  // Closed, and these are the ones that matter. `/faucet` and `/mint` are the
  // same mint as `/claim` with the ceiling removed and no once-only record;
  // `/payroll/run` moves an employer's money.
  // `/api/registrations/status` is the one whose UI implies a different guard:
  // the card is shown only to the platform key, and a coin public key is public,
  // so that check hides the control and authorises nothing. The token is what
  // actually refuses a stranger's POST.
  for (const path of [
    "/api/faucet",
    "/api/mint",
    "/api/payroll/run",
    "/api/registrations/status",
    // The most destructive of the set: it deletes the only record of where
    // onboarded contracts live. An open /reset is worse than an open /mint —
    // minted supply can be ignored, a lost address cannot be recovered.
    "/api/reset",
    // Spends a treasury wallet whose seed is in this service's environment.
    // Token-gated where /api/relay is not, and the difference is exactly that:
    // the relay sends a transaction anyone could send, this one spends a key.
    "/api/fund/deposit",
  ]) {
    const status = await post(path, {});
    check(`POST ${path} requires the token`, status === 401, `got ${status}`);
  }

  // The header has to be CHECKED, not merely required — a guard that accepts any
  // bearer string is a guard that is not there.
  const wrong = await fetch(`${base}/api/faucet`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer wrong" },
    body: "{}",
  });
  check("a wrong token is refused", wrong.status === 401, `got ${wrong.status}`);

  // The token opens the door; the confirmation is the second lock. Asserted
  // because the whole point of that flag is to stop a correctly-authenticated
  // caller wiping the deployment record by reflex, and a guard nobody tests is
  // a guard that quietly stops applying. The empty body must NOT delete a file.
  const unconfirmed = await fetch(`${base}/api/reset`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
    },
    body: "{}",
  });
  check(
    "POST /api/reset refuses a valid token without the confirmation",
    unconfirmed.status === 400,
    `got ${unconfirmed.status}`
  );
} finally {
  server.close();
}

console.log(failures === 0 ? "\nall good\n" : `\n${failures} failure(s)\n`);
process.exit(failures === 0 ? 0 : 1);

import "dotenv/config";
import chalk from "chalk";
import { createApp } from "./app.js";
import { readServerConfig } from "./config.js";
import { EnvironmentManager } from "../utils/environment.js";

/**
 * The platform backend.
 *
 *   npm run server
 *
 * Replaces `demo-server.ts`, which is kept for now so a working local setup is
 * not broken mid-demo. The behaviour of every route is the same; what is new is
 * the two things that stopped it being deployable:
 *
 *   - a configurable host, with a hard interlock (`config.ts`) that refuses to
 *     bind anywhere but loopback unless a token is set;
 *   - a token on the routes that spend the platform wallet, and none on the
 *     routes that only read public state.
 *
 * ⚠️ Authentication is still not APPROVAL. A valid token deploys a contract for
 * whatever name it is handed. Before real employers arrive this needs a human
 * in the loop, which is what `demo-server.ts` said from the beginning and what
 * a bearer token does not provide.
 */
async function main(): Promise<void> {
  const config = readServerConfig();
  // Read at startup so an unknown MIDNIGHT_NETWORK fails here rather than on
  // the first request that needed it.
  const network = EnvironmentManager.getNetworkConfig();

  const app = createApp(config);

  app.listen(config.port, config.host, () => {
    console.log();
    if (config.loopbackOnly) {
      console.log(chalk.yellow.bold("⚠️  Platform backend — local only"));
    } else {
      console.log(chalk.red.bold("⚠️  Platform backend — REACHABLE OFF-MACHINE"));
    }
    console.log(
      chalk.gray(
        "   Onboarding, the faucet and fund+pay sign with the platform wallet.\n" +
          "   Anyone who can call them and authenticate can spend it."
      )
    );
    console.log();
    console.log(chalk.white(`   http://${config.host}:${config.port}`));
    console.log(chalk.gray(`   network   ${network.name} (${network.networkId})`));
    console.log(
      chalk.gray("   auth      ") +
        (config.token
          ? chalk.green("token required on privileged routes")
          : chalk.yellow("none — loopback only"))
    );
    console.log(
      chalk.gray("   origins   ") +
        (config.allowedOrigins.length > 0
          ? chalk.white(config.allowedOrigins.join(", "))
          : chalk.gray("any (no ALLOWED_ORIGINS set)"))
    );
    console.log();
  });
}

main().catch((error: unknown) => {
  console.log();
  console.error(chalk.red.bold("❌ " + (error instanceof Error ? error.message : String(error))));
  console.log();
  process.exit(1);
});

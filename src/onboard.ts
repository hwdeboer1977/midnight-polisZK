import "dotenv/config";
import chalk from "chalk";
import { onboardEmployer } from "./utils/onboarding.js";

/**
 *   INSTANCE=acme EMPLOYER_KEY=<64 hex> npm run onboard
 */
async function main() {
  const instance = process.env.INSTANCE?.trim();
  const employerKey = process.env.EMPLOYER_KEY?.trim();

  console.log();
  console.log(chalk.blue.bold("🌙  Onboard an employer"));
  console.log();

  if (!instance || !employerKey) {
    console.error(chalk.red("❌ INSTANCE and EMPLOYER_KEY are both required."));
    console.error(
      chalk.gray("   INSTANCE=acme EMPLOYER_KEY=<employer signing key> npm run onboard")
    );
    process.exit(1);
  }

  const result = await onboardEmployer(instance, employerKey, (line) =>
    console.log(chalk.gray(`   ${line}`))
  );

  console.log();
  console.log(chalk.green.bold("🎉 Employer onboarded"));
  console.log(chalk.cyan("   Instance: ") + result.key);
  console.log(chalk.cyan("   Contract: ") + result.contractAddress);
  console.log(chalk.gray("   assign tx: " + result.assignTxHash));
  console.log(
    chalk.gray(
      result.periodsRecorded.length > 0
        ? `   rule sets recorded: ${result.periodsRecorded.join(", ")}`
        : "   rule sets: already recorded for every period in the window"
    )
  );
  console.log();
  console.log(
    chalk.gray("   Fund them with pEUR: ") + chalk.yellow.bold("npm run peur") + chalk.gray(" (option 3)")
  );
  console.log();
  process.exit(0);
}

main().catch((error) => {
  console.error(chalk.red("\n❌ Onboarding failed:"));
  console.error(chalk.red(error instanceof Error ? error.message : String(error)));
  process.exit(1);
});

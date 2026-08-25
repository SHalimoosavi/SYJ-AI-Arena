import "dotenv/config";

import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import chalk from "chalk";

import { Arena } from "./arena.js";

import {
  printBanner,
  printProblem,
  printRound,
  printOpening,
  printCrossfire,
  printVerdict
} from "./ui.js";

function getArgumentProblem(): string | undefined {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    return undefined;
  }

  return args.join(" ").trim();
}

async function interactiveProblem(): Promise<string> {
  const rl = readline.createInterface({
    input,
    output
  });

  try {
    console.log(
      chalk.gray(
        "Enter the strategic dilemma you want the arena to debate."
      )
    );
    console.log(
      chalk.gray(
        'Example: "Should SYJ build its own blockchain?"'
      )
    );
    console.log();

    const answer = await rl.question(
      chalk.cyan("CORE DILEMMA › ")
    );

    return answer.trim();
  } finally {
    rl.close();
  }
}

function validateEnvironment(): void {
  const provider =
    (process.env.PROVIDER || "openai").toLowerCase();

  if (provider === "openai" && !process.env.OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is missing. Copy .env.example to .env and configure it."
    );
  }

  if (
    provider === "anthropic" &&
    !process.env.ANTHROPIC_API_KEY
  ) {
    throw new Error(
      "ANTHROPIC_API_KEY is missing. Copy .env.example to .env and configure it."
    );
  }

  if (
    provider !== "openai" &&
    provider !== "anthropic"
  ) {
    throw new Error(
      `Unsupported PROVIDER "${provider}". Use openai or anthropic.`
    );
  }
}

async function main(): Promise<void> {
  printBanner();

  validateEnvironment();

  const problem =
    getArgumentProblem() ||
    await interactiveProblem();

  if (!problem) {
    throw new Error(
      "No debate problem supplied."
    );
  }

  printProblem(problem);

  const arena = new Arena();

  printRound(
    "ROUND 1 — OPENING STATEMENTS",
    "Seven minds. Seven positions. Zero consensus."
  );

  const result = await arena.run(problem);

  for (const statement of result.openingStatements) {
    printOpening(statement);
  }

  printRound(
    "ROUND 2 — CROSS-FIRE",
    "The strongest arguments attack the weakest assumptions."
  );

  for (const exchange of result.crossfire) {
    printCrossfire(exchange);
  }

  printRound(
    "ROUND 3 — JUDGE",
    "Independent adjudication. No alliances. No mercy."
  );

  printVerdict(result.verdict);

  console.log();
  console.log(
    chalk.gray(
      "SYJ AI Arena — Debate complete."
    )
  );
}

main().catch((error: unknown) => {
  console.error();

  console.error(
    chalk.bold.red("ARENA FAILURE")
  );

  if (error instanceof Error) {
    console.error(
      chalk.red(error.message)
    );

    if (process.env.DEBUG === "true") {
      console.error(error.stack);
    }
  } else {
    console.error(error);
  }

  process.exit(1);
});

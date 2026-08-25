import chalk from "chalk";
import type {
  AgentId,
  AgentStatement,
  CrossfireExchange,
  JudgeVerdict
} from "./types.js";

const agentColors: Record<AgentId, typeof chalk.white> = {
  architect: chalk.cyan,
  security: chalk.red,
  chaos: chalk.magenta,
  businessman: chalk.green,
  philosopher: chalk.yellow,
  hacker: chalk.blue,
  skeptic: chalk.white
};

const WIDTH = 76;

function line(char = "═"): string {
  return char.repeat(WIDTH);
}

function center(text: string): string {
  if (text.length >= WIDTH) {
    return text.slice(0, WIDTH);
  }

  const left = Math.floor((WIDTH - text.length) / 2);

  return " ".repeat(left) + text;
}

export function printBanner(): void {
  console.clear();

  console.log(chalk.cyan(line()));
  console.log(chalk.bold.cyan(center("SYJ AI ARENA")));
  console.log(chalk.gray(center("MULTI-AGENT STRATEGIC DEBATE ENGINE")));
  console.log(chalk.cyan(line()));
  console.log();
}

export function printProblem(problem: string): void {
  console.log(chalk.bold.white("CORE DILEMMA"));
  console.log(chalk.gray("┌" + "─".repeat(WIDTH - 2) + "┐"));
  console.log(
    chalk.white(
      "│ " +
        problem.slice(0, WIDTH - 4).padEnd(WIDTH - 4) +
        " │"
    )
  );
  console.log(chalk.gray("└" + "─".repeat(WIDTH - 2) + "┘"));
  console.log();
}

export function printRound(title: string, subtitle: string): void {
  console.log(chalk.bold.yellow(`\n${line("─")}`));
  console.log(chalk.bold.yellow(center(title)));
  console.log(chalk.gray(center(subtitle)));
  console.log(chalk.bold.yellow(line("─")));
  console.log();
}

export function printAgentThinking(agentName: string): void {
  process.stdout.write(chalk.gray(`  ${agentName} is thinking... `));
}

export function clearThinking(): void {
  process.stdout.write("\r" + " ".repeat(60) + "\r");
}

export function printOpening(statement: AgentStatement): void {
  const color = agentColors[statement.agentId];

  console.log(color.bold(`◆ ${statement.agentName}`));
  console.log(chalk.gray(`  ${statement.title}`));
  console.log();

  for (const paragraph of statement.statement.split("\n")) {
    console.log("  " + chalk.white(paragraph));
  }

  console.log();
}

export function printCrossfire(exchange: CrossfireExchange): void {
  const attackerColor = agentColors[exchange.attackerId];
  const defenderColor = agentColors[exchange.defenderId];

  console.log(
    chalk.bold.white(
      `CROSSFIRE ${exchange.exchangeNumber}`
    )
  );
  console.log();

  console.log(
    attackerColor.bold(
      `  ${exchange.attackerName} → ${exchange.defenderName}`
    )
  );

  console.log(
    chalk.white(`  "${exchange.attack}"`)
  );

  console.log();

  console.log(
    defenderColor.bold(
      `  ${exchange.defenderName} → ${exchange.attackerName}`
    )
  );

  console.log(
    chalk.white(`  "${exchange.response}"`)
  );

  console.log();
}

export function printVerdict(verdict: JudgeVerdict): void {
  console.log(chalk.bold.green(`\n${line("═")}`));
  console.log(chalk.bold.green(center("THE JUDGE'S VERDICT")));
  console.log(chalk.bold.green(line("═")));
  console.log();

  console.log(
    chalk.bold.yellow(
      `🏆 WINNER: ${verdict.winnerName}`
    )
  );

  console.log();

  console.log(chalk.white(verdict.verdict));
  console.log();

  console.log(chalk.bold.cyan("SCOREBOARD"));
  console.log(chalk.gray("─".repeat(WIDTH)));

  const sorted = [...verdict.scoreBreakdown].sort(
    (a, b) => b.score - a.score
  );

  for (const [index, score] of sorted.entries()) {
    const color = agentColors[score.agentId];
    const medal =
      index === 0
        ? "🏆"
        : index === 1
          ? "🥈"
          : index === 2
            ? "🥉"
            : "  ";

    console.log(
      `${medal} ${color.bold(score.agentName.padEnd(20))} ${chalk.bold(
        `${score.score}%`
      )}`
    );

    console.log(
      chalk.gray(
        `   ${score.strengths[0] || "No major strength identified."}`
      )
    );
  }

  console.log();

  console.log(chalk.bold.yellow("DECISIVE FACTORS"));

  for (const factor of verdict.decisiveFactors) {
    console.log(chalk.yellow(`  • ${factor}`));
  }

  if (verdict.minorityConcerns.length > 0) {
    console.log();
    console.log(chalk.bold.magenta("REMAINING CONCERNS"));

    for (const concern of verdict.minorityConcerns) {
      console.log(chalk.magenta(`  • ${concern}`));
    }
  }

  console.log();
  console.log(chalk.green(line("═")));
}

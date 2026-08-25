import {
  AGENT_ORDER,
  getPersona,
  JUDGE_PERSONA
} from "./personas.js";

import { createProvider } from "./providers.js";

import type {
  AgentId,
  AgentStatement,
  ArenaResult,
  CrossfireExchange,
  JudgeScore,
  JudgeVerdict
} from "./types.js";

import {
  clearThinking,
  printAgentThinking
} from "./ui.js";

function cleanText(text: string): string {
  return text
    .replace(/^```(?:json|text)?/i, "")
    .replace(/```$/i, "")
    .trim();
}

function extractJson<T>(text: string): T {
  const cleaned = cleanText(text);

  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const objectStart = cleaned.indexOf("{");
    const objectEnd = cleaned.lastIndexOf("}");

    if (objectStart !== -1 && objectEnd > objectStart) {
      return JSON.parse(
        cleaned.slice(objectStart, objectEnd + 1)
      ) as T;
    }

    throw new Error(
      `Unable to parse JSON from model response:\n${text}`
    );
  }
}

function extractArray<T>(text: string): T[] {
  const cleaned = cleanText(text);

  try {
    return JSON.parse(cleaned) as T[];
  } catch {
    const arrayStart = cleaned.indexOf("[");
    const arrayEnd = cleaned.lastIndexOf("]");

    if (arrayStart !== -1 && arrayEnd > arrayStart) {
      return JSON.parse(
        cleaned.slice(arrayStart, arrayEnd + 1)
      ) as T[];
    }

    throw new Error(
      `Unable to parse JSON array from model response:\n${text}`
    );
  }
}

function validateProblem(problem: string): string {
  const normalized = problem.trim();

  if (!normalized) {
    throw new Error("The debate problem cannot be empty.");
  }

  if (normalized.length < 10) {
    throw new Error(
      "The debate problem is too short. Give the arena a meaningful dilemma."
    );
  }

  if (normalized.length > 4000) {
    throw new Error(
      "The debate problem is too long. Keep it below 4,000 characters."
    );
  }

  return normalized;
}

function buildOpeningPrompt(problem: string): string {
  return `
CORE PROBLEM:
${problem}

You are delivering your opening statement.

Requirements:
- 2 to 3 sentences.
- Take a clear position.
- Make at least one concrete argument.
- Reflect your persona's priorities.
- Do not mention being an AI.
- Do not speak for other agents.
- Do not use headings.
- Do not hedge excessively.

Return only the opening statement.
`;
}

function buildCrossfireSelectorPrompt(
  problem: string,
  statements: AgentStatement[]
): string {
  const transcript = statements
    .map(
      (statement) =>
        `[${statement.agentName}]
${statement.statement}`
    )
    .join("\n\n");

  return `
CORE PROBLEM:
${problem}

ROUND 1 STATEMENTS:
${transcript}

You are the arena's CROSS-FIRE DIRECTOR.

Identify exactly 3 high-value conflicts between agents.

Choose conflicts where:
- Their positions materially disagree.
- One argument exposes a meaningful weakness in another.
- The exchange can change how the Judge evaluates the debate.
- The conflict is not superficial.

Do not choose the same attacker/defender pair twice.

Return ONLY valid JSON:

[
  {
    "attackerId": "agent id",
    "defenderId": "agent id",
    "reason": "one sentence explaining why this conflict matters"
  }
]

Valid agent IDs:
${AGENT_ORDER.join(", ")}
`;
}

function buildAttackPrompt(
  problem: string,
  attacker: AgentId,
  defender: AgentId,
  statements: AgentStatement[]
): string {
  const attackerPersona = getPersona(attacker);
  const defenderPersona = getPersona(defender);

  const attackerStatement =
    statements.find((s) => s.agentId === attacker)?.statement ?? "";

  const defenderStatement =
    statements.find((s) => s.agentId === defender)?.statement ?? "";

  return `
CORE PROBLEM:
${problem}

YOUR PERSONA:
${attackerPersona.name}

YOUR ORIGINAL POSITION:
${attackerStatement}

OPPONENT:
${defenderPersona.name}

OPPONENT'S POSITION:
${defenderStatement}

Cross-fire task:

Attack one specific weakness in the opponent's argument.

Rules:
- Maximum 3 sentences.
- Quote or directly reference a specific claim from the opponent.
- Explain why that claim fails, is incomplete, or creates unacceptable consequences.
- Stay in character.
- Do not insult the person.
- Do not introduce unrelated arguments.

Return ONLY the attack.
`;
}

function buildResponsePrompt(
  problem: string,
  attacker: AgentId,
  defender: AgentId,
  attack: string,
  statements: AgentStatement[]
): string {
  const defenderPersona = getPersona(defender);

  const defenderStatement =
    statements.find((s) => s.agentId === defender)?.statement ?? "";

  return `
CORE PROBLEM:
${problem}

YOUR PERSONA:
${defenderPersona.name}

YOUR ORIGINAL POSITION:
${defenderStatement}

OPPONENT:
${getPersona(attacker).name}

OPPONENT ATTACK:
${attack}

Respond directly.

Rules:
- Maximum 3 sentences.
- Address the actual attack.
- Defend your strongest point.
- If the attack exposes a genuine weakness, concede it briefly and explain why it does not overturn your position.
- Do not change persona.
- Do not insult the opponent.

Return ONLY the response.
`;
}

function buildJudgePrompt(
  problem: string,
  statements: AgentStatement[],
  crossfire: CrossfireExchange[]
): string {
  const openings = statements
    .map(
      (s) =>
        `AGENT: ${s.agentName} (${s.agentId})
OPENING:
${s.statement}`
    )
    .join("\n\n");

  const exchanges = crossfire
    .map(
      (e) =>
        `CROSSFIRE ${e.exchangeNumber}
ATTACKER: ${e.attackerName}
ATTACK:
${e.attack}

DEFENDER: ${e.defenderName}
RESPONSE:
${e.response}`
    )
    .join("\n\n");

  return `
CORE PROBLEM:
${problem}

ROUND 1:
${openings}

ROUND 2:
${exchanges}

Adjudicate the debate.

There are exactly seven agents:
${AGENT_ORDER.join(", ")}

Score all seven agents.

Scoring:
- Use integer scores from 0 to 100.
- The sum MUST equal exactly 100.
- Scores represent comparative debate performance, not probability of being correct.
- A strong argument can score highly even if another position is ultimately more practical.
- Do not give everyone similar scores merely to be polite.

Return ONLY this JSON structure:

{
  "winner": "agent id",
  "winnerName": "agent name",
  "verdict": "2-5 sentence overall verdict",
  "scoreBreakdown": [
    {
      "agentId": "agent id",
      "agentName": "agent name",
      "score": 0,
      "strengths": ["specific strength"],
      "weaknesses": ["specific weakness"]
    }
  ],
  "decisiveFactors": [
    "specific factor",
    "specific factor",
    "specific factor"
  ],
  "minorityConcerns": [
    "specific unresolved concern"
  ]
}

Quality requirements:
- Every agent must appear exactly once.
- Scores must total exactly 100.
- winner must match the highest-scoring agent.
- Do not invent facts outside the transcript.
`;
}

function normalizeScores(
  scores: JudgeScore[]
): JudgeScore[] {
  const normalized = [...scores];

  const total = normalized.reduce(
    (sum, item) => sum + Math.max(0, Math.round(item.score)),
    0
  );

  if (total === 100) {
    return normalized.map((item) => ({
      ...item,
      score: Math.max(0, Math.round(item.score))
    }));
  }

  if (total === 0) {
    const base = Math.floor(100 / normalized.length);
    let remainder = 100 - base * normalized.length;

    return normalized.map((item) => {
      const extra = remainder > 0 ? 1 : 0;

      remainder--;

      return {
        ...item,
        score: base + extra
      };
    });
  }

  let runningTotal = 0;

  const result = normalized.map((item, index) => {
    if (index === normalized.length - 1) {
      return {
        ...item,
        score: 100 - runningTotal
      };
    }

    const score = Math.max(
      0,
      Math.round((item.score / total) * 100)
    );

    runningTotal += score;

    return {
      ...item,
      score
    };
  });

  return result;
}

function validateVerdict(verdict: JudgeVerdict): JudgeVerdict {
  if (!Array.isArray(verdict.scoreBreakdown)) {
    throw new Error("Judge returned no score breakdown.");
  }

  const scoreBreakdown = normalizeScores(
    verdict.scoreBreakdown
  );

  const highest = [...scoreBreakdown].sort(
    (a, b) => b.score - a.score
  )[0];

  if (!highest) {
    throw new Error("Judge produced an empty scoreboard.");
  }

  return {
    ...verdict,
    winner: highest.agentId,
    winnerName: highest.agentName,
    scoreBreakdown
  };
}

export class Arena {
  private readonly provider = createProvider();

  async run(problemInput: string): Promise<ArenaResult> {
    const problem = validateProblem(problemInput);

    const openingStatements =
      await this.runOpeningRound(problem);

    const crossfire =
      await this.runCrossfireRound(
        problem,
        openingStatements
      );

    const verdict =
      await this.runJudge(
        problem,
        openingStatements,
        crossfire
      );

    return {
      problem,
      openingStatements,
      crossfire,
      verdict
    };
  }

  private async runOpeningRound(
    problem: string
  ): Promise<AgentStatement[]> {
    const statements: AgentStatement[] = [];

    for (const agentId of AGENT_ORDER) {
      const persona = getPersona(agentId);

      printAgentThinking(persona.name);

      const statement =
        await this.provider.generate({
          system: persona.systemPrompt,
          prompt: buildOpeningPrompt(problem),
          temperature: persona.temperature,
          maxTokens: 180
        });

      clearThinking();

      statements.push({
        agentId,
        agentName: persona.name,
        title: persona.title,
        statement
      });
    }

    return statements;
  }

  private async runCrossfireRound(
    problem: string,
    statements: AgentStatement[]
  ): Promise<CrossfireExchange[]> {
    const selectorResponse =
      await this.provider.generate({
        system: `
You are the Cross-Fire Director for SYJ AI Arena.

Your only job is to identify the most strategically important conflicts.
Do not take a side.
Return valid JSON only.
`,
        prompt: buildCrossfireSelectorPrompt(
          problem,
          statements
        ),
        temperature: 0.4,
        maxTokens: 700
      });

    const conflicts = extractArray<{
      attackerId: AgentId;
      defenderId: AgentId;
      reason: string;
    }>(selectorResponse);

    const requestedCount = Math.min(
      Number(process.env.CROSSFIRE_EXCHANGES || 3),
      3
    );

    const exchanges: CrossfireExchange[] = [];

    for (
      let index = 0;
      index < Math.min(conflicts.length, requestedCount);
      index++
    ) {
      const conflict = conflicts[index];

      if (
        !conflict ||
        !AGENT_ORDER.includes(conflict.attackerId) ||
        !AGENT_ORDER.includes(conflict.defenderId) ||
        conflict.attackerId === conflict.defenderId
      ) {
        continue;
      }

      const attacker = getPersona(conflict.attackerId);
      const defender = getPersona(conflict.defenderId);

      printAgentThinking(
        `${attacker.name} challenging ${defender.name}`
      );

      const attack =
        await this.provider.generate({
          system: attacker.systemPrompt,
          prompt: buildAttackPrompt(
            problem,
            conflict.attackerId,
            conflict.defenderId,
            statements
          ),
          temperature: attacker.temperature,
          maxTokens: 220
        });

      clearThinking();

      printAgentThinking(
        `${defender.name} responding`
      );

      const response =
        await this.provider.generate({
          system: defender.systemPrompt,
          prompt: buildResponsePrompt(
            problem,
            conflict.attackerId,
            conflict.defenderId,
            attack,
            statements
          ),
          temperature: defender.temperature,
          maxTokens: 220
        });

      clearThinking();

      exchanges.push({
        exchangeNumber: exchanges.length + 1,
        attackerId: conflict.attackerId,
        attackerName: attacker.name,
        defenderId: conflict.defenderId,
        defenderName: defender.name,
        attack,
        response
      });
    }

    return exchanges;
  }

  private async runJudge(
    problem: string,
    statements: AgentStatement[],
    crossfire: CrossfireExchange[]
  ): Promise<JudgeVerdict> {
    printAgentThinking(JUDGE_PERSONA.name);

    const response =
      await this.provider.generate({
        system: JUDGE_PERSONA.systemPrompt,
        prompt: buildJudgePrompt(
          problem,
          statements,
          crossfire
        ),
        temperature: JUDGE_PERSONA.temperature,
        maxTokens: 1800
      });

    clearThinking();

    const parsed =
      extractJson<JudgeVerdict>(response);

    return validateVerdict(parsed);
  }
}

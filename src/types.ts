export type ProviderName = "openai" | "anthropic";

export type AgentId =
  | "architect"
  | "security"
  | "chaos"
  | "businessman"
  | "philosopher"
  | "hacker"
  | "skeptic";

export interface Persona {
  id: AgentId | "judge";
  name: string;
  title: string;
  color: string;
  temperature: number;
  systemPrompt: string;
}

export interface AgentStatement {
  agentId: AgentId;
  agentName: string;
  title: string;
  statement: string;
}

export interface CrossfireExchange {
  exchangeNumber: number;
  attackerId: AgentId;
  attackerName: string;
  defenderId: AgentId;
  defenderName: string;
  attack: string;
  response: string;
}

export interface JudgeScore {
  agentId: AgentId;
  agentName: string;
  score: number;
  strengths: string[];
  weaknesses: string[];
}

export interface JudgeVerdict {
  winner: AgentId;
  winnerName: string;
  verdict: string;
  scoreBreakdown: JudgeScore[];
  decisiveFactors: string[];
  minorityConcerns: string[];
}

export interface ArenaResult {
  problem: string;
  openingStatements: AgentStatement[];
  crossfire: CrossfireExchange[];
  verdict: JudgeVerdict;
}

export interface LLMProvider {
  generate(options: {
    system: string;
    prompt: string;
    temperature: number;
    maxTokens?: number;
  }): Promise<string>;
}

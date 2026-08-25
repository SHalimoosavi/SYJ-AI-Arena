import OpenAI from "openai";
import Anthropic from "@anthropic-ai/sdk";
import type { LLMProvider, ProviderName } from "./types.js";

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

function isRetryableError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const status = "status" in error
    ? Number((error as { status?: unknown }).status)
    : undefined;

  return (
    status === 408 ||
    status === 409 ||
    status === 429 ||
    (typeof status === "number" && status >= 500)
  );
}

async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !isRetryableError(error)) {
        throw error;
      }

      const delay = Math.min(1000 * 2 ** attempt, 8000);

      await sleep(delay);
    }
  }

  throw lastError;
}

class OpenAIProvider implements LLMProvider {
  private readonly client: OpenAI;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error(
        "OPENAI_API_KEY is missing. Add it to your .env file."
      );
    }

    this.client = new OpenAI({ apiKey });
    this.model = process.env.OPENAI_MODEL || "gpt-5.5";
  }

  async generate(options: {
    system: string;
    prompt: string;
    temperature: number;
    maxTokens?: number;
  }): Promise<string> {
    return withRetry(async () => {
      const response = await this.client.responses.create({
        model: this.model,
        instructions: options.system,
        input: options.prompt,
        temperature: options.temperature,
        max_output_tokens: options.maxTokens ?? 500
      });

      const output = response.output_text?.trim();

      if (!output) {
        throw new Error("OpenAI returned an empty response.");
      }

      return output;
    }, Number(process.env.MAX_RETRIES || 3));
  }
}

class AnthropicProvider implements LLMProvider {
  private readonly client: Anthropic;
  private readonly model: string;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        "ANTHROPIC_API_KEY is missing. Add it to your .env file."
      );
    }

    this.client = new Anthropic({ apiKey });
    this.model = process.env.ANTHROPIC_MODEL || "claude-opus-4-6";
  }

  async generate(options: {
    system: string;
    prompt: string;
    temperature: number;
    maxTokens?: number;
  }): Promise<string> {
    return withRetry(async () => {
      const response = await this.client.messages.create({
        model: this.model,
        system: options.system,
        messages: [
          {
            role: "user",
            content: options.prompt
          }
        ],
        temperature: options.temperature,
        max_tokens: options.maxTokens ?? 500
      });

      const text = response.content
        .filter(
          (block): block is Anthropic.TextBlock =>
            block.type === "text"
        )
        .map((block) => block.text)
        .join("\n")
        .trim();

      if (!text) {
        throw new Error("Anthropic returned an empty response.");
      }

      return text;
    }, Number(process.env.MAX_RETRIES || 3));
  }
}

export function createProvider(): LLMProvider {
  const provider = (
    process.env.PROVIDER || "openai"
  ).toLowerCase() as ProviderName;

  switch (provider) {
    case "openai":
      return new OpenAIProvider();

    case "anthropic":
      return new AnthropicProvider();

    default:
      throw new Error(
        `Unsupported PROVIDER "${provider}". Use "openai" or "anthropic".`
      );
  }
}

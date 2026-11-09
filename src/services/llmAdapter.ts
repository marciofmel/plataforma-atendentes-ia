// Adapter Pattern para LLMs (anti-lock-in)
import OpenAI from "openai";

export type LLMProvider = "openai" | "groq" | "anthropic";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
}

export async function chatCompletion(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
  const provider = options.provider ?? "openai";
  if (provider === "openai" || provider === "groq") {
    const client = new OpenAI({
      apiKey: provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
      baseURL: provider === "groq" ? "https://api.groq.com/openai/v1" : undefined,
    });
    const model = options.model ?? (provider === "groq" ? "llama-3.1-70b-versatile" : "gpt-4o");
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    });
    return res.choices[0]?.message?.content ?? "";
  }
  // Anthropic adapter (placeholder - requer @anthropic-ai/sdk)
  throw new Error("Provider not implemented: " + provider);
}

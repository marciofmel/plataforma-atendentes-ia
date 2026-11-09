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

export function getOpenAIClient(apiKey?: string, baseURL?: string) {
  return new OpenAI({
    // Valor sentinela para o build não falhar sem OPENAI_API_KEY no ambiente de build.
    // Em runtime, a chamada real usa a chave verdadeira configurada no painel.
    apiKey: apiKey ?? process.env.OPENAI_API_KEY ?? "sk-build-placeholder",
    baseURL,
  });
}

export async function chatCompletion(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
  const provider = options.provider ?? "openai";
  if (provider === "openai" || provider === "groq") {
    const client = getOpenAIClient(
      provider === "groq" ? process.env.GROQ_API_KEY : process.env.OPENAI_API_KEY,
      provider === "groq" ? "https://api.groq.com/openai/v1" : undefined
    );
    const model = options.model ?? (provider === "groq" ? "llama-3.1-70b-versatile" : "gpt-4o");
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    });
    return res.choices[0]?.message?.content ?? "";
  }
  throw new Error("Provider not implemented: " + provider);
}

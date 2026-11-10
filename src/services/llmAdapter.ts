// Adapter Pattern para LLMs (anti-lock-in)
import OpenAI from "openai";
import type { AppSettings } from "@/lib/settings";

export type LLMProvider = "openai" | "groq" | "anthropic";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMOptions {
  provider?: LLMProvider;
  model?: string;
  temperature?: number;
  /** Chave explícita (vinda do painel visual), tem prioridade sobre env. */
  apiKey?: string | null;
  /** Configurações da organização (usadas para escolher provedor e chave). */
  settings?: AppSettings;
}

export function getOpenAIClient(apiKey?: string | null, baseURL?: string) {
  return new OpenAI({
    // Valor sentinela evita quebra no build sem chave. Em runtime usamos a chave real.
    apiKey: apiKey?.trim() || process.env.OPENAI_API_KEY || "sk-build-placeholder",
    baseURL,
  });
}

const GROQ_BASE_URL = "https://api.groq.com/openai/v1";

/** Decide qual provedor usar com base nas chaves disponíveis (painel > env). */
export function resolveProvider(options: LLMOptions = {}): { provider: LLMProvider; apiKey: string | null } {
  if (options.provider && options.provider !== "openai") {
    const key =
      options.apiKey?.trim() ||
      (options.provider === "groq"
        ? options.settings?.groq_api_key?.trim() || process.env.GROQ_API_KEY
        : null);
    return { provider: options.provider, apiKey: key ?? null };
  }

  const explicitKey = options.apiKey?.trim() || options.settings?.openai_api_key?.trim();
  if (explicitKey) return { provider: "openai", apiKey: explicitKey };

  const envOpenAI = process.env.OPENAI_API_KEY?.trim();
  if (envOpenAI) return { provider: "openai", apiKey: envOpenAI };

  const groqKey = options.settings?.groq_api_key?.trim() || process.env.GROQ_API_KEY?.trim();
  if (groqKey) return { provider: "groq", apiKey: groqKey };

  return { provider: "openai", apiKey: null };
}

export async function chatCompletion(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
  const { provider, apiKey } = resolveProvider(options);

  if (!apiKey || apiKey === "sk-build-placeholder") {
    throw new Error(
      "Nenhuma chave de IA configurada. Abra o painel em Configurações e cole sua chave da OpenAI ou da Groq."
    );
  }

  if (provider === "openai" || provider === "groq") {
    const client = getOpenAIClient(apiKey, provider === "groq" ? GROQ_BASE_URL : undefined);
    const model =
      options.model ?? (provider === "groq" ? "llama-3.3-70b-versatile" : "gpt-4o-mini");
    const res = await client.chat.completions.create({
      model,
      messages,
      temperature: options.temperature ?? 0.7,
    });
    return res.choices[0]?.message?.content ?? "";
  }

  throw new Error("Provider não implementado: " + provider);
}

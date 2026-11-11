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

/**
 * Catálogo de modelos da Groq em ordem de preferência.
 * A Groq descontinua modelos com frequência; tentamos em sequência
 * até um deles responder, evitando que o atendimento pare.
 */
const GROQ_MODELS = [
  "openai/gpt-oss-120b",
  "qwen/qwen3.8-27b",
  "openai/gpt-oss-20b",
  "allam-2-7b",
];

const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

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

async function openAICompletion(
  apiKey: string,
  messages: LLMMessage[],
  model: string,
  temperature: number
): Promise<string> {
  const client = getOpenAIClient(apiKey);
  const res = await client.chat.completions.create({ model, messages, temperature });
  return res.choices[0]?.message?.content ?? "";
}

async function groqCompletion(
  apiKey: string,
  messages: LLMMessage[],
  preferredModel: string | undefined,
  temperature: number
): Promise<string> {
  const client = getOpenAIClient(apiKey, GROQ_BASE_URL);
  const candidates = preferredModel
    ? [preferredModel, ...GROQ_MODELS.filter((m) => m !== preferredModel)]
    : GROQ_MODELS;

  let lastError: unknown = null;

  for (const model of candidates) {
    try {
      const res = await client.chat.completions.create({ model, messages, temperature });
      const text = res.choices[0]?.message?.content ?? "";
      if (text.trim()) return text;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error("A Groq não retornou conteúdo com nenhum modelo disponível.");
}

export async function chatCompletion(messages: LLMMessage[], options: LLMOptions = {}): Promise<string> {
  const { provider, apiKey } = resolveProvider(options);

  if (!apiKey || apiKey === "sk-build-placeholder") {
    throw new Error(
      "Nenhuma chave de IA configurada. Abra o painel em Configurações e cole sua chave da OpenAI ou da Groq."
    );
  }

  const temperature = options.temperature ?? 0.7;

  if (provider === "groq") {
    const preferred = options.model || options.settings?.groq_model?.trim() || undefined;
    return groqCompletion(apiKey, messages, preferred, temperature);
  }

  if (provider === "openai") {
    try {
      return await openAICompletion(apiKey, messages, options.model ?? DEFAULT_OPENAI_MODEL, temperature);
    } catch (err) {
      // Se a OpenAI falhar mas houver chave da Groq no painel, faz fallback automático.
      const groqKey = options.settings?.groq_api_key?.trim();
      if (groqKey) {
        return groqCompletion(groqKey, messages, options.settings?.groq_model?.trim() || undefined, temperature);
      }
      throw err;
    }
  }

  throw new Error("Provider não implementado: " + provider);
}

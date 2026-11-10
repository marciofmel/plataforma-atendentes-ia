import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";

export type AppSettings = Record<string, string>;

/**
 * Lê as configurações da organização padrão.
 * Tudo (chaves de API, provedor de WhatsApp) fica salvo no banco,
 * configurável pelo painel visual — sem precisar editar código.
 */
export async function getSettings(): Promise<AppSettings> {
  const org = await getOrCreateDefaultOrg();
  try {
    const parsed = JSON.parse(org.settings || "{}");
    return parsed && typeof parsed === "object" ? (parsed as AppSettings) : {};
  } catch {
    return {};
  }
}

export async function saveSettings(patch: AppSettings): Promise<AppSettings> {
  const org = await getOrCreateDefaultOrg();
  let current: AppSettings = {};
  try {
    current = JSON.parse(org.settings || "{}");
  } catch {
    current = {};
  }
  const merged = { ...current, ...patch };
  await prisma.organization.update({
    where: { id: org.id },
    data: { settings: JSON.stringify(merged) },
  });
  return merged;
}

/** Retorna a chave da OpenAI priorizando o painel, com fallback para env. */
export function resolveOpenAIKey(settings: AppSettings): string | null {
  return settings.openai_api_key?.trim() || process.env.OPENAI_API_KEY?.trim() || null;
}

/** Retorna a chave da Groq priorizando o painel, com fallback para env. */
export function resolveGroqKey(settings: AppSettings): string | null {
  return settings.groq_api_key?.trim() || process.env.GROQ_API_KEY?.trim() || null;
}

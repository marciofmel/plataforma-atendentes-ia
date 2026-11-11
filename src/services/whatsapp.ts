import type { AppSettings } from "@/lib/settings";

/**
 * Camada de abstração de provedores de WhatsApp.
 *
 * - "meta"      -> WhatsApp Cloud API oficial (exige portfólio na Meta)
 * - "evolution" -> Evolution API (não oficial, self-hosted, conexão por QR Code)
 * - "zapi"      -> Z-API (não oficial, serviço gerenciado, conexão por QR Code)
 *
 * Os dois últimos não exigem portfólio empresarial da Meta.
 */
export type WhatsAppProvider = "meta" | "evolution" | "zapi";

export interface SendResult {
  ok: boolean;
  provider: WhatsAppProvider | null;
  error?: string;
  detail?: unknown;
}

/** Remove sufixos (@s.whatsapp.net, @c.us) e mantém só dígitos. */
export function normalizeNumber(raw: string | null | undefined): string {
  return String(raw ?? "")
    .replace(/@.*$/, "")
    .replace(/[^\d]/g, "");
}

export function resolveProvider(settings: AppSettings): WhatsAppProvider | null {
  const explicit = (settings.whatsapp_provider || "").trim() as WhatsAppProvider | "";
  const hasMeta = Boolean(settings.meta_whatsapp_token?.trim() && settings.meta_whatsapp_phone_number_id?.trim());
  const hasEvolution = Boolean(
    settings.evolution_base_url?.trim() && settings.evolution_api_key?.trim() && settings.evolution_instance?.trim()
  );
  const hasZapi = Boolean(settings.zapi_instance_id?.trim() && settings.zapi_token?.trim());

  if (explicit === "meta") return hasMeta ? "meta" : null;
  if (explicit === "evolution") return hasEvolution ? "evolution" : null;
  if (explicit === "zapi") return hasZapi ? "zapi" : null;

  // Fallback automático quando o provedor não foi escolhido no painel.
  if (hasEvolution) return "evolution";
  if (hasZapi) return "zapi";
  if (hasMeta) return "meta";
  return null;
}

function trimBase(url: string): string {
  return url.trim().replace(/\/+$/, "");
}

/**
 * Valida se o texto é realmente uma URL HTTP(S) utilizável.
 * Evita o erro críptico "Failed to parse URL from <valor>" quando o usuário
 * digita um e-mail ou o nome do servidor sem o protocolo.
 */
export function validateHttpUrl(
  raw: string | null | undefined,
  label = "URL da Evolution API"
): { ok: boolean; url: string; error?: string } {
  const value = trimBase(String(raw ?? ""));
  if (!value) {
    return { ok: false, url: "", error: `Informe a ${label} (ex.: https://evolution.seudominio.com).` };
  }
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return {
      ok: false,
      url: value,
      error: `"${value}" é um e-mail, não uma URL. A ${label} é o endereço do servidor, começando com https:// (ex.: https://evolution.seudominio.com).`,
    };
  }
  if (!/^https?:\/\//i.test(value)) {
    return {
      ok: false,
      url: value,
      error: `A ${label} precisa começar com http:// ou https://. Recebido: "${value}".`,
    };
  }
  try {
    const parsed = new URL(value);
    if (!parsed.hostname) {
      return { ok: false, url: value, error: `URL sem domínio: "${value}".` };
    }
    if (!parsed.hostname.includes(".") && parsed.hostname !== "localhost") {
      return {
        ok: false,
        url: value,
        error: `Domínio incompleto em "${value}". Use o endereço completo, ex.: https://evolution.seudominio.com.`,
      };
    }
    return { ok: true, url: value };
  } catch {
    return {
      ok: false,
      url: value,
      error: `URL inválida: "${value}". Exemplo correto: https://evolution.seudominio.com`,
    };
  }
}

/** Nome de instância da Evolution API aceita apenas letras, números, ponto, hífen e underline. */
export function normalizeInstanceName(raw: string | null | undefined): string {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9._-]/g, "");
}

async function sendViaMeta(settings: AppSettings, to: string, text: string): Promise<SendResult> {
  const phoneNumberId = settings.meta_whatsapp_phone_number_id?.trim();
  const token = settings.meta_whatsapp_token?.trim();
  const version = settings.meta_graph_version?.trim() || "v21.0";
  if (!phoneNumberId || !token) {
    return { ok: false, provider: "meta", error: "Phone Number ID ou token da Meta não configurados." };
  }
  const res = await fetch(`https://graph.facebook.com/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", to, type: "text", text: { body: text } }),
  });
  const detail = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      provider: "meta",
      error: `Meta respondeu ${res.status}: ${JSON.stringify(detail)}`,
      detail,
    };
  }
  return { ok: true, provider: "meta", detail };
}

async function sendViaEvolution(settings: AppSettings, to: string, text: string): Promise<SendResult> {
  const check = validateHttpUrl(settings.evolution_base_url, "URL da Evolution API");
  const apiKey = settings.evolution_api_key?.trim();
  const instance = normalizeInstanceName(settings.evolution_instance);
  if (!check.ok) {
    return { ok: false, provider: "evolution", error: check.error };
  }
  if (!apiKey || !instance) {
    return { ok: false, provider: "evolution", error: "API Key ou instância da Evolution API não configuradas." };
  }
  const baseUrl = check.url;
  const res = await fetch(`${baseUrl}/message/sendText/${encodeURIComponent(instance)}`, {
    method: "POST",
    headers: { apikey: apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ number: to, text }),
  });
  const detail = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      provider: "evolution",
      error: `Evolution API respondeu ${res.status}: ${JSON.stringify(detail)}`,
      detail,
    };
  }
  return { ok: true, provider: "evolution", detail };
}

async function sendViaZapi(settings: AppSettings, to: string, text: string): Promise<SendResult> {
  const instanceId = settings.zapi_instance_id?.trim();
  const token = settings.zapi_token?.trim();
  const clientToken = settings.zapi_client_token?.trim();
  const baseUrl = trimBase(settings.zapi_base_url || "https://api.z-api.io");
  if (!instanceId || !token) {
    return { ok: false, provider: "zapi", error: "Instance ID ou token da Z-API não configurados." };
  }
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (clientToken) headers["Client-Token"] = clientToken;

  const res = await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/send-text`, {
    method: "POST",
    headers,
    body: JSON.stringify({ phone: to, message: text }),
  });
  const detail = await res.json().catch(() => ({}));
  if (!res.ok) {
    return {
      ok: false,
      provider: "zapi",
      error: `Z-API respondeu ${res.status}: ${JSON.stringify(detail)}`,
      detail,
    };
  }
  return { ok: true, provider: "zapi", detail };
}

/** Envia uma mensagem de texto pelo provedor configurado no painel. */
export async function sendWhatsAppText(
  settings: AppSettings,
  to: string,
  text: string
): Promise<SendResult> {
  const provider = resolveProvider(settings);
  if (!provider) {
    return {
      ok: false,
      provider: null,
      error:
        "Nenhum provedor de WhatsApp configurado. Vá em Configurações → WhatsApp e escolha Meta, Evolution API ou Z-API.",
    };
  }
  const phone = normalizeNumber(to);
  if (!phone) return { ok: false, provider, error: "Número de destino inválido." };

  try {
    if (provider === "meta") return await sendViaMeta(settings, phone, text);
    if (provider === "evolution") return await sendViaEvolution(settings, phone, text);
    return await sendViaZapi(settings, phone, text);
  } catch (err) {
    return {
      ok: false,
      provider,
      error: err instanceof Error ? err.message : "Falha desconhecida ao enviar mensagem.",
    };
  }
}

/** Extrai o texto de um payload de webhook da Evolution API. */
export function extractEvolutionText(data: Record<string, unknown>): string {
  const msg = (data?.message ?? {}) as Record<string, any>;
  return (
    msg.conversation ||
    msg.extendedTextMessage?.text ||
    msg.buttonsResponseMessage?.selectedDisplayText ||
    msg.listResponseMessage?.title ||
    msg.imageMessage?.caption ||
    msg.videoMessage?.caption ||
    msg.templateButtonReplyMessage?.selectedDisplayText ||
    ""
  );
}

/** Extrai o texto de um payload de webhook da Z-API. */
export function extractZapiText(body: Record<string, any>): string {
  return (
    body?.text?.message ||
    body?.buttonsResponseMessage?.message ||
    body?.listResponseMessage?.message ||
    body?.image?.caption ||
    body?.video?.caption ||
    ""
  );
}

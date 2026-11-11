import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { normalizeInstanceName, resolveProvider, validateHttpUrl } from "@/services/whatsapp";

export const dynamic = "force-dynamic";

function trimBase(url: string): string {
  return (url || "").trim().replace(/\/+$/, "");
}

async function evolutionStatus(settings: Record<string, string>) {
  const check = validateHttpUrl(settings.evolution_base_url, "URL da Evolution API");
  const apiKey = settings.evolution_api_key?.trim();
  const instance = normalizeInstanceName(settings.evolution_instance);
  if (!check.ok) {
    return { connected: false, state: "invalid_config", error: check.error };
  }
  const baseUrl = check.url;
  if (!apiKey || !instance) {
    return { connected: false, state: "not_configured", error: "Configure a API Key e o nome da instância." };
  }
  try {
    const res = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(instance)}`, {
      headers: { apikey: apiKey },
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    const state = data?.instance?.state ?? data?.state ?? (res.ok ? "unknown" : "error");
    return { connected: state === "open", state, detail: data };
  } catch (err) {
    return {
      connected: false,
      state: "unreachable",
      error:
        err instanceof Error
          ? `Não foi possível alcançar ${baseUrl}: ${err.message}`
          : "Falha de rede ao alcançar a Evolution API.",
    };
  }
}


async function zapiStatus(settings: Record<string, string>) {
  const baseUrl = trimBase(settings.zapi_base_url || "https://api.z-api.io");
  const instanceId = settings.zapi_instance_id?.trim();
  const token = settings.zapi_token?.trim();
  const clientToken = settings.zapi_client_token?.trim();
  if (!instanceId || !token) {
    return { connected: false, state: "not_configured", error: "Configure Instance ID e Token." };
  }
  try {
    const headers: Record<string, string> = {};
    if (clientToken) headers["Client-Token"] = clientToken;
    const res = await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/status`, {
      headers,
      cache: "no-store",
    });
    const data = await res.json().catch(() => ({}));
    return { connected: Boolean(data?.connected), state: data?.connected ? "open" : "close", detail: data };
  } catch (err) {
    return { connected: false, state: "unreachable", error: err instanceof Error ? err.message : "Falha de rede" };
  }
}

export async function GET() {
  const settings = await getSettings();
  const provider = resolveProvider(settings);
  if (!provider) {
    return NextResponse.json({ provider: null, connected: false, state: "not_configured" });
  }
  if (provider === "evolution") {
    return NextResponse.json({ provider, ...(await evolutionStatus(settings)) });
  }
  if (provider === "zapi") {
    return NextResponse.json({ provider, ...(await zapiStatus(settings)) });
  }
  return NextResponse.json({
    provider: "meta",
    connected: Boolean(settings.meta_whatsapp_token && settings.meta_whatsapp_phone_number_id),
    state: "configured",
  });
}

export async function POST() {
  const settings = await getSettings();
  const provider = resolveProvider(settings);

  if (!provider) {
    return NextResponse.json(
      { error: "Escolha um provedor de WhatsApp e preencha as credenciais antes de conectar." },
      { status: 400 }
    );
  }

  if (provider === "meta") {
    return NextResponse.json({
      provider: "meta",
      connected: Boolean(settings.meta_whatsapp_token && settings.meta_whatsapp_phone_number_id),
      message:
        "O WhatsApp Cloud API oficial não usa QR Code. Configure o webhook e o verify token na Meta para ativar.",
    });
  }

  if (provider === "zapi") {
    const baseUrl = trimBase(settings.zapi_base_url || "https://api.z-api.io");
    const instanceId = settings.zapi_instance_id?.trim();
    const token = settings.zapi_token?.trim();
    const clientToken = settings.zapi_client_token?.trim();
    if (!instanceId || !token) {
      return NextResponse.json({ error: "Preencha o Instance ID e o Token da Z-API." }, { status: 400 });
    }
    try {
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (clientToken) headers["Client-Token"] = clientToken;
      const res = await fetch(`${baseUrl}/instances/${instanceId}/token/${token}/qr-image`, {
        headers,
        cache: "no-store",
      });
      const data = await res.json().catch(() => ({}));
      const qr = data?.value ?? data?.qrCode ?? data?.base64 ?? null;
      if (!res.ok || !qr) {
        return NextResponse.json(
          { error: "Não foi possível obter o QR Code da Z-API.", detail: data },
          { status: 502 }
        );
      }
      return NextResponse.json({ provider: "zapi", qr });
    } catch (err) {
      return NextResponse.json(
        { error: err instanceof Error ? err.message : "Falha ao conectar na Z-API." },
        { status: 502 }
      );
    }
  }

  // Evolution API
  const urlCheck = validateHttpUrl(settings.evolution_base_url, "URL da Evolution API");
  const apiKey = settings.evolution_api_key?.trim();
  const instance = normalizeInstanceName(settings.evolution_instance);

  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }
  if (!apiKey) {
    return NextResponse.json(
      { error: "Informe a API Key global da Evolution API (AUTHENTICATION_API_KEY)." },
      { status: 400 }
    );
  }
  if (!instance || instance.length < 2) {
    return NextResponse.json(
      { error: "Informe um nome de instância válido (letras, números e hífen, sem espaços). Ex.: atendentes-ia." },
      { status: 400 }
    );
  }

  const baseUrl = urlCheck.url;

  try {
    // Cria a instância se ainda não existir (erro 403/409 = já existe, seguimos).
    await fetch(`${baseUrl}/instance/create`, {
      method: "POST",
      headers: { apikey: apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({ instanceName: instance, qrcode: true, integration: "WHATSAPP-BAILEYS" }),
    }).catch(() => null);

    let res: Response;
    try {
      res = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(instance)}`, {
        headers: { apikey: apiKey },
        cache: "no-store",
      });
    } catch (netErr) {
      return NextResponse.json(
        {
          error:
            `Não foi possível alcançar ${baseUrl}. Confira se o servidor da Evolution API está no ar e se a URL está correta.`,
          detail: netErr instanceof Error ? netErr.message : String(netErr),
        },
        { status: 502 }
      );
    }
    const data = await res.json().catch(() => ({}));
    const qr = data?.base64 ?? data?.qrcode?.base64 ?? data?.qr ?? null;

    if (!res.ok || !qr) {
      const status = await evolutionStatus(settings as Record<string, string>);
      if (status.connected) {
        return NextResponse.json({ provider: "evolution", connected: true, message: "WhatsApp já conectado." });
      }
      return NextResponse.json(
        {
          error:
            res.status === 401 || res.status === 403
              ? "A Evolution API recusou a autenticação. Confira a API Key global (AUTHENTICATION_API_KEY)."
              : "Não foi possível obter o QR Code da Evolution API.",
          detail: data,
        },
        { status: 502 }
      );
    }
    return NextResponse.json({ provider: "evolution", qr });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao conectar na Evolution API." },
      { status: 502 }
    );
  }
}


export async function DELETE() {
  const settings = await getSettings();
  const provider = resolveProvider(settings);

  try {
    if (provider === "evolution") {
      const check = validateHttpUrl(settings.evolution_base_url, "URL da Evolution API");
      if (check.ok) {
        const instance = normalizeInstanceName(settings.evolution_instance);
        await fetch(`${check.url}/instance/logout/${encodeURIComponent(instance)}`, {
          method: "DELETE",
          headers: { apikey: settings.evolution_api_key?.trim() ?? "" },
        });
      }
    } else if (provider === "zapi") {
      const baseUrl = trimBase(settings.zapi_base_url || "https://api.z-api.io");
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (settings.zapi_client_token) headers["Client-Token"] = settings.zapi_client_token;
      await fetch(
        `${baseUrl}/instances/${settings.zapi_instance_id}/token/${settings.zapi_token}/disconnect`,
        { method: "PUT", headers }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Falha ao desconectar." },
      { status: 502 }
    );
  }

  await saveSettings({ whatsapp_last_disconnect: new Date().toISOString() });
  return NextResponse.json({ ok: true });
}

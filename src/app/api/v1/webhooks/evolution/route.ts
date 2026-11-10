import { NextResponse } from "next/server";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import { generateAgentReply } from "@/services/agentEngine";
import { extractEvolutionText, normalizeNumber, sendWhatsAppText } from "@/services/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Webhook da Evolution API (WhatsApp não oficial via QR Code).
 *
 * Configure na Evolution:
 *   URL:  https://SEU-DOMINIO/api/v1/webhooks/evolution
 *   Eventos: MESSAGES_UPSERT (e CONNECTION_UPDATE se quiser monitorar)
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // A Evolution envia { event, instance, data }.
  // Algumas versões mandam data como array.
  const event: string = body?.event ?? body?.type ?? "";
  if (event && !event.toLowerCase().includes("messages.upsert")) {
    return NextResponse.json({ ok: true, ignored: event });
  }

  const items = Array.isArray(body?.data) ? body.data : [body?.data];

  const settings = await getSettings();
  const org = await getOrCreateDefaultOrg();

  for (const data of items) {
    if (!data) continue;

    const key = data.key ?? {};
    if (key.fromMe) continue;

    const remoteJid: string = key.remoteJid ?? data.remoteJid ?? "";
    if (!remoteJid || remoteJid.includes("@g.us")) continue;

    const text = extractEvolutionText(data);
    if (!text.trim()) continue;

    const from = normalizeNumber(remoteJid);

    try {
      const { reply } = await generateAgentReply({
        organizationId: org.id,
        text,
        externalId: from,
        channel: "whatsapp",
        settings,
      });
      await sendWhatsAppText(settings, from, reply);
    } catch (err) {
      console.error("[webhook:evolution] erro ao processar mensagem:", err);
    }
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "evolution" });
}

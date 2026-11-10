import { NextResponse } from "next/server";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import { generateAgentReply } from "@/services/agentEngine";
import { extractZapiText, normalizeNumber, sendWhatsAppText } from "@/services/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Webhook da Z-API (WhatsApp não oficial via QR Code).
 *
 * Configure no painel da Z-API:
 *   URL: https://SEU-DOMINIO/api/v1/webhooks/zapi
 *   Ao receber: marque "notificar as mensagens recebidas"
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  // A Z-API dispara vários tipos de callback; só tratamos mensagens recebidas.
  const type: string = body?.type ?? "";
  if (type && type !== "ReceivedCallback") {
    return NextResponse.json({ ok: true, ignored: type });
  }
  if (body?.fromMe || body?.isGroup) return NextResponse.json({ ok: true, ignored: "self-or-group" });

  const phone: string = body?.phone ?? body?.participantPhone ?? "";
  const text = extractZapiText(body);
  if (!phone || !text.trim()) return NextResponse.json({ ok: true, ignored: "empty" });

  const settings = await getSettings();
  const org = await getOrCreateDefaultOrg();
  const from = normalizeNumber(phone);

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
    console.error("[webhook:zapi] erro ao processar mensagem:", err);
  }

  return NextResponse.json({ ok: true });
}

export async function GET() {
  return NextResponse.json({ ok: true, provider: "zapi" });
}

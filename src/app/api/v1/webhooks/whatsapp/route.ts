import { NextResponse } from "next/server";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { getSettings } from "@/lib/settings";
import { generateAgentReply } from "@/services/agentEngine";
import { sendWhatsAppText } from "@/services/whatsapp";

export const dynamic = "force-dynamic";

/**
 * Webhook do WhatsApp Cloud API (Meta - oficial).
 * GET  -> verificação do webhook
 * POST -> recebe mensagens e responde com o agente de IA
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const settings = await getSettings();
  const expected = settings.meta_whatsapp_verify_token?.trim() || process.env.META_WHATSAPP_VERIFY_TOKEN;

  if (mode === "subscribe" && expected && token === expected) {
    return new Response(challenge ?? "", { status: 200 });
  }
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const settings = await getSettings();
  const org = await getOrCreateDefaultOrg();
  const entries = body?.entry ?? [];

  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value;
      const messages = value?.messages ?? [];

      for (const msg of messages) {
        if (msg.type && msg.type !== "text" && msg.type !== "interactive") continue;
        const from = msg.from as string;
        const text: string =
          msg.text?.body ?? msg.interactive?.button_reply?.title ?? msg.interactive?.list_reply?.title ?? "";
        if (!from || !text.trim()) continue;

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
          console.error("[webhook:whatsapp] erro ao processar mensagem:", err);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { getSettings } from "@/lib/settings";
import { sendWhatsAppText } from "@/services/whatsapp";

export const dynamic = "force-dynamic";

/** Envia uma mensagem de teste usando o provedor configurado no painel. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const to = String(body?.to ?? "").trim();
  const text = String(body?.message ?? "✅ Teste da Plataforma de Atendentes IA. Se você recebeu isso, a integração está funcionando!").trim();

  if (!to) return NextResponse.json({ error: "Informe o número de destino (com DDI, ex.: 5511999999999)." }, { status: 400 });

  const settings = await getSettings();
  const result = await sendWhatsAppText(settings, to, text);

  if (!result.ok) {
    return NextResponse.json({ error: result.error, provider: result.provider }, { status: 502 });
  }
  return NextResponse.json({ ok: true, provider: result.provider, detail: result.detail });
}

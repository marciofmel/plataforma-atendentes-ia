import { NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { z } from "zod";

export const dynamic = "force-dynamic";

// Aceita qualquer par chave/valor textual (todas as integrações são configuradas pelo painel).
const settingsSchema = z.record(z.string());

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const merged = await saveSettings(parsed.data);
  return NextResponse.json({ ok: true, settings: merged });
}

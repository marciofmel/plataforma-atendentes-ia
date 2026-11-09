import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { z } from "zod";

const settingsSchema = z.object({
  openai_api_key: z.string().optional(),
  meta_whatsapp_token: z.string().optional(),
  meta_whatsapp_phone_number_id: z.string().optional(),
  meta_whatsapp_verify_token: z.string().optional(),
  vapi_api_key: z.string().optional(),
  groq_api_key: z.string().optional(),
});

export async function GET() {
  const org = await getOrCreateDefaultOrg();
  const settings = JSON.parse(org.settings || "{}");
  return NextResponse.json({ settings });
}

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const body = await request.json().catch(() => ({}));
  const parsed = settingsSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const current = JSON.parse(org.settings || "{}");
  const merged = { ...current, ...parsed.data };
  await prisma.organization.update({
    where: { id: org.id },
    data: { settings: JSON.stringify(merged) },
  });
  return NextResponse.json({ ok: true });
}

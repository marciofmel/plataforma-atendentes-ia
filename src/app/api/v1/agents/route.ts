import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { z } from "zod";

const agentSchema = z.object({
  name: z.string().min(1),
  system_prompt: z.string().default(""),
  voice_settings: z.record(z.unknown()).default({}),
  temperature: z.number().min(0).max(2).default(0.7),
});

export async function GET() {
  const org = await getOrCreateDefaultOrg();
  const agents = await prisma.agent.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ agents });
}

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const body = await request.json().catch(() => ({}));
  const parsed = agentSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const agent = await prisma.agent.create({
    data: {
      organizationId: org.id,
      name: parsed.data.name,
      systemPrompt: parsed.data.system_prompt,
      voiceSettings: JSON.stringify(parsed.data.voice_settings),
      temperature: parsed.data.temperature,
    },
  });
  return NextResponse.json({ agent }, { status: 201 });
}

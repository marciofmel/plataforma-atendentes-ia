import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";
import { z } from "zod";

export const dynamic = "force-dynamic";

const schema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  scheduledAt: z.string(),
  agentId: z.string().optional(),
});

export async function GET() {
  const org = await getOrCreateDefaultOrg();
  const appointments = await prisma.appointment.findMany({
    where: { organizationId: org.id },
    orderBy: { scheduledAt: "asc" },
  });
  return NextResponse.json({ appointments });
}

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  const appt = await prisma.appointment.create({
    data: {
      organizationId: org.id,
      title: parsed.data.title,
      description: parsed.data.description,
      scheduledAt: new Date(parsed.data.scheduledAt),
      agentId: parsed.data.agentId,
    },
  });
  return NextResponse.json({ appointment: appt }, { status: 201 });
}

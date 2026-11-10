import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await getOrCreateDefaultOrg();
  const [agents, conversations, messages, appointments, knowledgeDocs] = await Promise.all([
    prisma.agent.count({ where: { organizationId: org.id } }),
    prisma.conversation.count({ where: { organizationId: org.id } }),
    prisma.message.count({ where: { organizationId: org.id } }),
    prisma.appointment.count({ where: { organizationId: org.id } }),
    prisma.knowledgeDocument.count({ where: { organizationId: org.id } }),
  ]);
  return NextResponse.json({ stats: { agents, conversations, messages, appointments, knowledgeDocs } });
}

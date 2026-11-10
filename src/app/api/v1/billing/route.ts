import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await getOrCreateDefaultOrg();
  const messages = await prisma.message.count({ where: { organizationId: org.id } });
  const conversations = await prisma.conversation.count({ where: { organizationId: org.id } });
  // Estimativa de custo: $0.002 por mensagem (GPT-4o) + $0.0001 por embedding
  const estimatedCost = (messages * 0.002).toFixed(2);
  return NextResponse.json({
    usage: { messages, conversations },
    estimatedCostUSD: estimatedCost,
    plan: "Free (local)",
  });
}

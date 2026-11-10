import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";

export const dynamic = "force-dynamic";

export async function GET() {
  const org = await getOrCreateDefaultOrg();
  const handovers = await prisma.handover.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ handovers });
}

export async function POST(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const body = await request.json().catch(() => ({}));
  const h = await prisma.handover.create({
    data: {
      organizationId: org.id,
      conversationId: body.conversationId,
      reason: body.reason ?? "Solicitado pelo usuário",
      status: "pending",
    },
  });
  return NextResponse.json({ handover: h }, { status: 201 });
}

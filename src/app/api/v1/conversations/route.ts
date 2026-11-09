import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";

export async function GET(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const conv = await prisma.conversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ conversation: conv });
  }
  const conversations = await prisma.conversation.findMany({
    where: { organizationId: org.id },
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { messages: true } } },
  });
  return NextResponse.json({ conversations });
}

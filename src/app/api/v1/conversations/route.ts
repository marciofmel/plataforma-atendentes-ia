import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getOrCreateDefaultOrg } from "@/lib/org";

export const dynamic = "force-dynamic";

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

export async function DELETE(request: Request) {
  const org = await getOrCreateDefaultOrg();
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Informe o id da conversa." }, { status: 400 });

  const conv = await prisma.conversation.findFirst({ where: { id, organizationId: org.id } });
  if (!conv) return NextResponse.json({ error: "Conversa não encontrada." }, { status: 404 });

  await prisma.conversation.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

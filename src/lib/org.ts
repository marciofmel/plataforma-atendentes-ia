import { prisma } from "@/lib/prisma";

export async function getOrCreateDefaultOrg() {
  let org = await prisma.organization.findFirst();
  if (!org) {
    org = await prisma.organization.create({
      data: { name: "Organização Padrão", slug: "default" },
    });
  }
  return org;
}

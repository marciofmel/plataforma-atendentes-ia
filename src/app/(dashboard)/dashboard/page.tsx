import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const agents = await prisma.agent.findMany({ take: 50, orderBy: { createdAt: "desc" } });
  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold mb-4">Painel da Empresa</h1>
      <section>
        <h2 className="text-lg font-semibold mb-2">Atendentes de IA</h2>
        <ul className="space-y-2">
          {agents.map((a) => (
            <li key={a.id} className="border rounded p-3">
              <strong>{a.name}</strong> — temp {a.temperature}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}

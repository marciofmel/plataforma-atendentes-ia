"use client";

import { useEffect, useState } from "react";

interface Stats {
  agents: number;
  conversations: number;
  messages: number;
  appointments: number;
  knowledgeDocs: number;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    fetch("/api/v1/stats")
      .then((r) => r.json())
      .then((d) => setStats(d.stats));
  }, []);

  const cards = stats
    ? [
        { label: "Agentes de IA", value: stats.agents },
        { label: "Conversas", value: stats.conversations },
        { label: "Mensagens", value: stats.messages },
        { label: "Agendamentos", value: stats.appointments },
        { label: "Documentos", value: stats.knowledgeDocs },
      ]
    : [];

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded shadow p-4">
            <div className="text-3xl font-bold text-blue-600">{c.value}</div>
            <div className="text-sm text-gray-500">{c.label}</div>
          </div>
        ))}
      </div>
      {!stats && <p className="text-gray-500 mt-4">Carregando...</p>}
    </main>
  );
}

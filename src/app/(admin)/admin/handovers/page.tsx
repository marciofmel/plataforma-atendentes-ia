"use client";

import { useEffect, useState } from "react";

interface Handover {
  id: string;
  conversationId: string;
  reason: string | null;
  status: string;
  createdAt: string;
}

export default function HandoversPage() {
  const [handovers, setHandovers] = useState<Handover[]>([]);

  useEffect(() => {
    fetch("/api/v1/handovers")
      .then((r) => r.json())
      .then((d) => setHandovers(d.handovers ?? []));
  }, []);

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Handover Humano</h1>
      <p className="text-sm text-gray-500 mb-4">Transferências de conversas para atendentes humanos.</p>
      <ul className="space-y-2">
        {handovers.map((h) => (
          <li key={h.id} className="border rounded p-3 bg-white">
            <div className="font-medium">Conversa: {h.conversationId}</div>
            <div className="text-sm text-gray-600">{h.reason}</div>
            <div className="text-xs text-gray-400">Status: {h.status} — {new Date(h.createdAt).toLocaleString()}</div>
          </li>
        ))}
        {handovers.length === 0 && <p className="text-gray-500">Nenhum handover pendente.</p>}
      </ul>
    </main>
  );
}

"use client";

import { useEffect, useState } from "react";

interface Conv {
  id: string;
  channel: string;
  externalId: string | null;
  createdAt: string;
  _count: { messages: number };
}

interface Msg {
  id: string;
  role: string;
  content: string;
  createdAt: string;
}

export default function ConversationsPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    fetch("/api/v1/conversations")
      .then((r) => r.json())
      .then((d) => setConvs(d.conversations ?? []));
  }, []);

  useEffect(() => {
    if (!selected) return;
    fetch(`/api/v1/conversations?id=${selected}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.conversation?.messages ?? []));
  }, [selected]);

  return (
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Conversas</h1>
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-1 bg-white rounded shadow p-3 space-y-2 max-h-[70vh] overflow-auto">
          {convs.map((c) => (
            <button key={c.id} onClick={() => setSelected(c.id)} className={`w-full text-left p-2 rounded ${selected === c.id ? "bg-blue-100" : "hover:bg-gray-50"}`}>
              <div className="text-sm font-medium">{c.channel} — {c.externalId ?? c.id.slice(0, 8)}</div>
              <div className="text-xs text-gray-500">{c._count.messages} mensagens</div>
            </button>
          ))}
          {convs.length === 0 && <p className="text-sm text-gray-500">Nenhuma conversa ainda.</p>}
        </div>
        <div className="col-span-2 bg-white rounded shadow p-4 max-h-[70vh] overflow-auto space-y-3">
          {messages.map((m) => (
            <div key={m.id} className={`p-2 rounded ${m.role === "user" ? "bg-gray-100" : "bg-blue-50"}`}>
              <div className="text-xs font-bold mb-1">{m.role}</div>
              <div className="text-sm whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {selected && messages.length === 0 && <p className="text-sm text-gray-500">Sem mensagens.</p>}
          {!selected && <p className="text-sm text-gray-500">Selecione uma conversa.</p>}
        </div>
      </div>
    </main>
  );
}

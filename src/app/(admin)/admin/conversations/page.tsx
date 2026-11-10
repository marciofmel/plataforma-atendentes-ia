"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquare, Trash2, Loader2 } from "lucide-react";

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
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    fetch("/api/v1/conversations")
      .then((r) => r.json())
      .then((d) => setConvs(d.conversations ?? []))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!selected) {
      setMessages([]);
      return;
    }
    fetch(`/api/v1/conversations?id=${selected}`)
      .then((r) => r.json())
      .then((d) => setMessages(d.conversation?.messages ?? []));
  }, [selected]);

  async function remove(id: string) {
    setDeleting(id);
    await fetch(`/api/v1/conversations?id=${id}`, { method: "DELETE" });
    if (selected === id) setSelected(null);
    setDeleting(null);
    load();
  }

  return (
    <main className="p-4 md:p-6 max-w-6xl mx-auto space-y-4">
      <header>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="text-purple-400" size={22} />
          Conversas
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Histórico de atendimentos recebidos pelo WhatsApp e pelos outros canais.
        </p>
      </header>

      <div className="grid md:grid-cols-3 gap-4">
        <section className="md:col-span-1 glass-panel rounded-xl p-2 max-h-[70vh] overflow-auto">
          {loading && <p className="text-sm text-slate-400 p-3">Carregando...</p>}
          {!loading && convs.length === 0 && (
            <p className="text-sm text-slate-500 p-3">Nenhuma conversa ainda.</p>
          )}
          {convs.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-2 rounded-lg px-2 py-2 mb-1 ${
                selected === c.id ? "bg-purple-500/15 border border-purple-500/30" : "hover:bg-slate-800/60"
              }`}
            >
              <button onClick={() => setSelected(c.id)} className="flex-1 text-left">
                <div className="text-sm font-medium text-slate-100 truncate">
                  {c.externalId ?? c.id.slice(0, 8)}
                </div>
                <div className="text-[11px] text-slate-400">
                  {c.channel} · {c._count.messages} mensagens
                </div>
              </button>
              <button
                onClick={() => remove(c.id)}
                disabled={deleting === c.id}
                title="Excluir conversa"
                className="text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition"
              >
                {deleting === c.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </section>

        <section className="md:col-span-2 glass-panel rounded-xl p-4 max-h-[70vh] overflow-auto space-y-3">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`p-3 rounded-lg max-w-[85%] ${
                m.role === "user"
                  ? "bg-slate-800/80 border border-slate-700 ml-auto"
                  : "bg-purple-500/10 border border-purple-500/20"
              }`}
            >
              <div className="text-[10px] uppercase tracking-wide font-bold mb-1 text-slate-400">
                {m.role === "user" ? "Cliente" : "Atendente IA"}
              </div>
              <div className="text-sm text-slate-200 whitespace-pre-wrap">{m.content}</div>
            </div>
          ))}
          {selected && messages.length === 0 && <p className="text-sm text-slate-500">Sem mensagens.</p>}
          {!selected && <p className="text-sm text-slate-500">Selecione uma conversa para ver o histórico.</p>}
        </section>
      </div>
    </main>
  );
}

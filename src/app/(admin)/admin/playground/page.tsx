"use client";

import { useEffect, useState } from "react";

interface Agent {
  id: string;
  name: string;
}

interface Msg {
  role: string;
  content: string;
  sentiment?: string;
}

export default function PlaygroundPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [agentId, setAgentId] = useState("");
  const [input, setInput] = useState("");
  const [history, setHistory] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/v1/agents")
      .then((r) => r.json())
      .then((d) => {
        setAgents(d.agents ?? []);
        if (d.agents?.[0]) setAgentId(d.agents[0].id);
      });
  }, []);

  async function send() {
    if (!input.trim()) return;
    const userMsg: Msg = { role: "user", content: input };
    setHistory((h) => [...h, userMsg]);
    setInput("");
    setLoading(true);
    const res = await fetch("/api/v1/playground", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, message: input, history }),
    });
    const d = await res.json();
    setHistory((h) => [...h, { role: "assistant", content: d.reply, sentiment: d.sentiment }]);
    setLoading(false);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Playground — Testar Agente</h1>
      <div className="mb-3">
        <select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="border rounded px-3 py-2">
          {agents.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </div>
      <div className="bg-white rounded shadow p-4 h-[50vh] overflow-auto space-y-3 mb-3">
        {history.map((m, i) => (
          <div key={i} className={`p-2 rounded ${m.role === "user" ? "bg-gray-100" : "bg-blue-50"}`}>
            <div className="text-xs font-bold mb-1">{m.role} {m.sentiment ? `(${m.sentiment})` : ""}</div>
            <div className="text-sm whitespace-pre-wrap">{m.content}</div>
          </div>
        ))}
        {loading && <p className="text-sm text-gray-500">Pensando...</p>}
      </div>
      <div className="flex gap-2">
        <input className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Digite uma mensagem..." />
        <button onClick={send} className="bg-blue-600 text-white px-4 py-2 rounded">Enviar</button>
      </div>
    </main>
  );
}

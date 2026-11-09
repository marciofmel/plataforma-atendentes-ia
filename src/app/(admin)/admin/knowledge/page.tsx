"use client";

import { useEffect, useState } from "react";

interface Doc {
  id: string;
  title: string;
  sourceUrl: string | null;
  createdAt: string;
}

export default function KnowledgePage() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function load() {
    // Documents are not listed via API yet; reload page after upload
  }

  async function upload(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setMsg("");
    const fd = new FormData();
    fd.append("file", file);
    fd.append("title", title || file.name);
    const res = await fetch("/api/v1/knowledge/upload", { method: "POST", body: fd });
    const d = await res.json();
    if (res.ok) {
      setMsg(`Documento enviado! ${d.chunks} chunks criados.`);
      setTitle(""); setFile(null);
    } else {
      setMsg(d.error ?? "Erro ao enviar");
    }
    setLoading(false);
  }

  return (
    <main className="p-6 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Base de Conhecimento</h1>
      <form onSubmit={upload} className="bg-white p-4 rounded shadow space-y-3 mb-6">
        <input className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-slate-200 placeholder-slate-500" placeholder="Título do documento" value={title} onChange={(e) => setTitle(e.target.value)} />
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] ?? null)} className="w-full" />
        <button disabled={loading || !file} className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50">
          {loading ? "Enviando..." : "Enviar PDF"}
        </button>
        {msg && <p className="text-sm">{msg}</p>}
      </form>
      <p className="text-sm text-gray-500">Os documentos enviados são processados (chunking + embeddings) e usados pelo RAG dos agentes.</p>
    </main>
  );
}

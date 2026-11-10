"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, Bot, FlaskConical, BookOpen, MessageSquare,
  Calendar, UserCheck, CreditCard, Settings, Sun, Moon, Menu, X,
  ChevronRight, Smartphone
} from "lucide-react";

const NAV = [
  { href: "/admin", label: "Agentes", icon: Bot },
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/playground", label: "Playground", icon: FlaskConical },
  { href: "/admin/knowledge", label: "Conhecimento", icon: BookOpen },
  { href: "/admin/whatsapp", label: "WhatsApp", icon: Smartphone },
  { href: "/admin/conversations", label: "Conversas", icon: MessageSquare },
  { href: "/admin/appointments", label: "Agendamentos", icon: Calendar },
  { href: "/admin/handovers", label: "Handover", icon: UserCheck },
  { href: "/admin/billing", label: "Billing", icon: CreditCard },
  { href: "/admin/settings", label: "Configurações", icon: Settings },
];

export default function AdminShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(true);
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col overflow-x-hidden">
        {/* TOP GLOBAL BAR */}
        <header className="bg-slate-900 border-b border-slate-800 px-4 py-2.5 flex flex-wrap justify-between items-center text-xs sticky top-0 z-50">
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2 font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              <span className="text-purple-400 text-lg">🤖</span>
              <span>AIAgent Engine SaaS</span>
            </div>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="mr-1 animate-pulse">●</span> v2.4 Multi-Tenant
            </span>
          </div>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center space-x-2 text-slate-400 hover:text-slate-200 transition"
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
              <span className="hidden sm:inline">{dark ? "Modo Claro" : "Modo Escuro"}</span>
            </button>
            <div className="flex items-center space-x-2 border-l border-slate-800 pl-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold">
                {session?.user?.email?.[0]?.toUpperCase() ?? "A"}
              </div>
              <span className="font-medium text-slate-300 hidden md:inline text-xs">{session?.user?.email ?? "Admin"}</span>
              <button onClick={() => signOut()} className="text-slate-400 hover:text-red-400 transition ml-1" title="Sair">
                <X size={14} />
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar desktop */}
          <aside className="hidden md:flex md:flex-col w-64 bg-slate-900 border-r border-slate-800 shrink-0">
            <div className="p-4 space-y-6 flex-1">
              <div className="flex items-center space-x-3 p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="w-8 h-8 rounded-md bg-purple-600 flex items-center justify-center font-bold text-white text-sm">
                  AI
                </div>
                <div className="overflow-hidden">
                  <h4 className="text-xs font-bold text-slate-100 truncate">Organização Padrão</h4>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> IA Operacional
                  </span>
                </div>
              </div>

              <nav className="space-y-1 text-xs">
                {NAV.map((n) => {
                  const Icon = n.icon;
                  const active = pathname === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg transition ${
                        active
                          ? "bg-purple-600/20 text-purple-300 font-semibold border border-purple-500/30"
                          : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60"
                      }`}
                    >
                      <Icon size={16} className="w-4" />
                      <span>{n.label}</span>
                      {active && <ChevronRight size={12} className="ml-auto" />}
                    </Link>
                  );
                })}
              </nav>
            </div>

            <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2">
              <div className="flex justify-between items-center">
                <span>Plano Enterprise</span>
                <span className="text-purple-400 font-bold">84% Uso</span>
              </div>
              <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
                <div className="bg-purple-500 h-full rounded-full" style={{ width: "84%" }}></div>
              </div>
            </div>
          </aside>

          {/* Mobile header */}
          <div className="md:hidden fixed top-[42px] left-0 right-0 z-40 bg-slate-900 border-b border-slate-800 flex items-center justify-between p-3">
            <span className="font-bold text-sm">Agentes IA</span>
            <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-slate-800">
              {open ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>

          {/* Mobile drawer */}
          {open && (
            <div className="md:hidden fixed inset-0 z-50 flex">
              <div className="w-64 bg-slate-900 p-4 space-y-1 overflow-auto shadow-2xl">
                {NAV.map((n) => {
                  const Icon = n.icon;
                  const active = pathname === n.href;
                  return (
                    <Link
                      key={n.href}
                      href={n.href}
                      onClick={() => setOpen(false)}
                      className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm ${active ? "bg-purple-600/20 text-purple-300 border border-purple-500/30" : "text-slate-400 hover:bg-slate-800/60"}`}
                    >
                      <Icon size={16} />
                      <span>{n.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            </div>
          )}

          <main className="flex-1 overflow-y-auto bg-slate-950 p-4 md:p-6">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

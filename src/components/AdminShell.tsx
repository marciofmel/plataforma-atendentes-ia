"use client";

import { useEffect, useState } from "react";
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

  // Fecha o menu mobile ao trocar de página
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className={dark ? "dark" : ""}>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        {/* Topo fixo — sempre visível, altura fixa */}
        <header className="fixed inset-x-0 top-0 z-50 h-14 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <div className="flex items-center gap-2 font-bold text-sm tracking-wide bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent whitespace-nowrap">
              <span className="text-purple-400 text-lg leading-none">🤖</span>
              <span className="hidden sm:inline">AIAgent Engine SaaS</span>
              <span className="sm:hidden">AIAgent</span>
            </div>
            <span className="hidden lg:inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 whitespace-nowrap">
              <span className="mr-1 animate-pulse">●</span> v2.4 Multi-Tenant
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={() => setDark(!dark)}
              className="flex items-center gap-2 text-slate-400 hover:text-slate-200 transition"
              title={dark ? "Modo Claro" : "Modo Escuro"}
            >
              {dark ? <Sun size={14} /> : <Moon size={14} />}
              <span className="hidden md:inline">{dark ? "Modo Claro" : "Modo Escuro"}</span>
            </button>
            <div className="flex items-center gap-2 border-l border-slate-800 pl-3">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-[10px] font-bold shrink-0">
                {session?.user?.email?.[0]?.toUpperCase() ?? "A"}
              </div>
              <span className="font-medium text-slate-300 hidden lg:inline text-xs max-w-[180px] truncate">
                {session?.user?.email ?? "Admin"}
              </span>
              <button onClick={() => signOut()} className="text-slate-400 hover:text-red-400 transition" title="Sair">
                <X size={14} />
              </button>
            </div>
          </div>
        </header>

        {/* Barra mobile (abaixo do topo fixo) */}
        <div className="md:hidden fixed inset-x-0 top-14 z-40 h-12 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-3">
          <span className="font-bold text-sm text-slate-100">Painel</span>
          <button
            onClick={() => setOpen(!open)}
            className="p-2 -mr-1 rounded-lg hover:bg-slate-800 text-slate-200"
            aria-label="Abrir menu"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Sidebar desktop fixa */}
        <aside className="hidden md:flex md:flex-col w-64 fixed top-14 bottom-0 left-0 z-40 bg-slate-900 border-r border-slate-800">
          <div className="p-4 space-y-6 flex-1 overflow-y-auto">
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
                    <Icon size={16} className="w-4 shrink-0" />
                    <span>{n.label}</span>
                    {active && <ChevronRight size={12} className="ml-auto" />}
                  </Link>
                );
              })}
            </nav>
          </div>

          <div className="p-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-2 shrink-0">
            <div className="flex justify-between items-center">
              <span>Plano Enterprise</span>
              <span className="text-purple-400 font-bold">84% Uso</span>
            </div>
            <div className="w-full bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800">
              <div className="bg-purple-500 h-full rounded-full" style={{ width: "84%" }}></div>
            </div>
          </div>
        </aside>

        {/* Drawer mobile */}
        {open && (
          <div className="md:hidden fixed inset-0 z-[60] flex">
            <div className="w-64 max-w-[80%] bg-slate-900 border-r border-slate-800 p-4 space-y-1 overflow-auto shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-300">Menu</span>
                <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-300">
                  <X size={18} />
                </button>
              </div>
              {NAV.map((n) => {
                const Icon = n.icon;
                const active = pathname === n.href;
                return (
                  <Link
                    key={n.href}
                    href={n.href}
                    onClick={() => setOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm ${
                      active
                        ? "bg-purple-600/20 text-purple-300 border border-purple-500/30"
                        : "text-slate-400 hover:bg-slate-800/60"
                    }`}
                  >
                    <Icon size={16} className="shrink-0" />
                    <span>{n.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="flex-1 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          </div>
        )}

        {/* Conteúdo: começa abaixo do topo (56px) + barra mobile (48px) */}
        <div className="md:pl-64 pt-14">
          <div className="md:hidden h-12" aria-hidden="true" />
          <div className="min-h-[calc(100vh-3.5rem)] bg-slate-950">{children}</div>
        </div>
      </div>
    </div>
  );
}

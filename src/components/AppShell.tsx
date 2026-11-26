"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Building2,
  CheckSquare,
  FileText,
  FolderKanban,
  KanbanSquare,
  LayoutDashboard,
  Lock,
  LogOut,
  Menu,
  MessageSquareText,
  Search,
  Settings,
  Target,
  UserCircle2,
  Users,
  Wallet,
  X,
} from "lucide-react";
import type { AuthUser } from "@/lib/permissions";
import { getInitials } from "@/lib/format";
import {
  LEAD_STAGE_MAP,
  PROJECT_STATUS_MAP,
  PROPOSAL_STATUS_MAP,
  TASK_STATUS_MAP,
} from "@/lib/constants";
import type {
  LeadStage,
  ProjectStatus,
  ProposalStatus,
  TaskStatus,
} from "@/db/schema";

interface SearchResults {
  leads: {
    id: string;
    company: string;
    contactName: string;
    stage: LeadStage;
  }[];
  proposals: {
    id: string;
    title: string;
    status: ProposalStatus;
  }[];
  clients: {
    id: string;
    name: string;
    company: string;
    status: string;
  }[];
  projects: {
    id: string;
    name: string;
    status: ProjectStatus;
    clientCompany: string;
  }[];
  tasks: {
    id: string;
    title: string;
    status: TaskStatus;
    projectId: string | null;
    projectName: string | null;
  }[];
  meetings?: {
    id: string;
    title: string;
    clientCompany: string | null;
  }[];
  secrets?: {
    id: string;
    name: string;
    service: string;
    projectId: string | null;
    projectName: string | null;
  }[];
  contacts: {
    id: string;
    name: string;
    role: string | null;
    clientId: string;
    clientCompany: string;
  }[];
}

interface NavSection {
  label: string;
  items: {
    href: string;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    exact?: boolean;
  }[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Visão Geral",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard, exact: true },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/comercial/leads", label: "Leads", icon: Target },
      { href: "/comercial/pipeline", label: "Pipeline", icon: KanbanSquare },
      { href: "/comercial/propostas", label: "Propostas", icon: FileText },
    ],
  },
  {
    label: "Operação & Entrega",
    items: [
      { href: "/clientes", label: "Clientes", icon: Building2 },
      { href: "/projetos", label: "Projetos", icon: FolderKanban },
      { href: "/tarefas", label: "Tarefas", icon: CheckSquare },
      { href: "/reunioes", label: "Reuniões", icon: MessageSquareText },
    ],
  },
  {
    label: "Gestão & Segurança",
    items: [
      { href: "/financeiro", label: "Financeiro", icon: Wallet },
      { href: "/cofre", label: "Cofre", icon: Lock },
      { href: "/configuracoes", label: "Configurações", icon: Settings },
    ],
  },
];

export function AppShell({
  user,
  children,
}: {
  user: AuthUser;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);
  const searchBoxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        searchBoxRef.current &&
        !searchBoxRef.current.contains(e.target as Node)
      ) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults(null);
      setSearching(false);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        setSearching(true);
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        if (res.ok) {
          const data = (await res.json()) as SearchResults;
          setResults(data);
        }
      } catch {
        // Ignora abort
      } finally {
        setSearching(false);
      }
    }, 220);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const hasAnySearchResult =
    results &&
    (results.leads.length > 0 ||
      (results.proposals?.length ?? 0) > 0 ||
      results.clients.length > 0 ||
      results.projects.length > 0 ||
      (results.tasks?.length ?? 0) > 0 ||
      (results.meetings?.length ?? 0) > 0 ||
      (results.secrets?.length ?? 0) > 0 ||
      results.contacts.length > 0);

  const sidebarContent = (
    <div className="flex h-full flex-col bg-slate-950 text-slate-200">
      <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-5">
        <img
          src="/valemind-icon.png"
          alt="ValeMind"
          className="h-9 w-9 shrink-0 rounded-xl object-cover shadow-sm ring-1 ring-white/15"
        />
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold tracking-tight text-white">
            ValeMind OS
          </p>
          <p className="truncate text-[11px] text-slate-400">
            Gestão Interna
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {NAV_SECTIONS.map((section) => (
          <div key={section.label}>
            <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                const active = item.exact
                  ? pathname === item.href
                  : pathname === item.href ||
                    pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition ${
                      active
                        ? "bg-indigo-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-900 hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-slate-800/80 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-900/90 px-3 py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-500/20 text-xs font-semibold text-indigo-300 ring-1 ring-indigo-400/30">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-white">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-slate-400">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={loggingOut}
            title="Sair"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden">
          <div
            className="fixed inset-0 bg-slate-950/60"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 flex w-64 flex-col">
            {sidebarContent}
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      ) : null}

      {/* Main Column */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center gap-4 border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            aria-label="Abrir menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Busca Global */}
          <div ref={searchBoxRef} className="relative flex-1 max-w-xl">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="search"
              value={query}
              onFocus={() => setSearchOpen(true)}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchOpen(true);
              }}
              placeholder="Buscar leads, clientes, projetos, tarefas, reuniões ou credenciais..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-4 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />

            {searchOpen && query.trim().length >= 2 ? (
              <div className="absolute left-0 right-0 top-full z-40 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {searching ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-500">
                    Buscando no ValeMind OS...
                  </p>
                ) : !hasAnySearchResult ? (
                  <p className="px-3 py-4 text-center text-sm text-slate-500">
                    Nenhum registro encontrado para &ldquo;{query.trim()}&rdquo;.
                  </p>
                ) : (
                  <div className="space-y-3 p-1">
                    {results.clients.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Clientes
                        </p>
                        {results.clients.map((c) => (
                          <Link
                            key={c.id}
                            href={`/clientes/${c.id}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Building2 className="h-4 w-4 shrink-0 text-indigo-500" />
                              <span className="truncate font-medium text-slate-900">
                                {c.company}
                              </span>
                              <span className="truncate text-xs text-slate-500">
                                {c.name}
                              </span>
                            </div>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.projects.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Projetos
                        </p>
                        {results.projects.map((p) => (
                          <Link
                            key={p.id}
                            href={`/projetos/${p.id}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FolderKanban className="h-4 w-4 shrink-0 text-emerald-600" />
                              <span className="truncate font-medium text-slate-900">
                                {p.name}
                              </span>
                              <span className="truncate text-xs text-slate-500">
                                {p.clientCompany}
                              </span>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${PROJECT_STATUS_MAP[p.status].badgeClass}`}
                            >
                              {PROJECT_STATUS_MAP[p.status].label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.leads.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Leads
                        </p>
                        {results.leads.map((l) => (
                          <Link
                            key={l.id}
                            href={`/comercial/leads?q=${encodeURIComponent(l.company)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Target className="h-4 w-4 shrink-0 text-amber-500" />
                              <span className="truncate font-medium text-slate-900">
                                {l.company}
                              </span>
                              <span className="truncate text-xs text-slate-500">
                                {l.contactName}
                              </span>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${LEAD_STAGE_MAP[l.stage].badgeClass}`}
                            >
                              {LEAD_STAGE_MAP[l.stage].label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.tasks && results.tasks.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Tarefas
                        </p>
                        {results.tasks.map((t) => (
                          <Link
                            key={t.id}
                            href={
                              t.projectId
                                ? `/projetos/${t.projectId}`
                                : `/tarefas?q=${encodeURIComponent(t.title)}`
                            }
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <CheckSquare className="h-4 w-4 shrink-0 text-violet-600" />
                              <span className="truncate font-medium text-slate-900">
                                {t.title}
                              </span>
                              {t.projectName ? (
                                <span className="truncate text-xs text-slate-500">
                                  {t.projectName}
                                </span>
                              ) : null}
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${TASK_STATUS_MAP[t.status].badgeClass}`}
                            >
                              {TASK_STATUS_MAP[t.status].label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.proposals && results.proposals.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Propostas
                        </p>
                        {results.proposals.map((pr) => (
                          <Link
                            key={pr.id}
                            href="/comercial/propostas"
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <FileText className="h-4 w-4 shrink-0 text-sky-600" />
                              <span className="truncate font-medium text-slate-900">
                                {pr.title}
                              </span>
                            </div>
                            <span
                              className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-medium ${PROPOSAL_STATUS_MAP[pr.status].badgeClass}`}
                            >
                              {PROPOSAL_STATUS_MAP[pr.status].label}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.meetings && results.meetings.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Reuniões
                        </p>
                        {results.meetings.map((m) => (
                          <Link
                            key={m.id}
                            href={`/reunioes?q=${encodeURIComponent(m.title)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <MessageSquareText className="h-4 w-4 shrink-0 text-teal-600" />
                            <span className="truncate font-medium text-slate-900">
                              {m.title}
                            </span>
                            {m.clientCompany ? (
                              <span className="truncate text-xs text-slate-500">
                                {m.clientCompany}
                              </span>
                            ) : null}
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.secrets && results.secrets.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Cofre (Credenciais)
                        </p>
                        {results.secrets.map((sc) => (
                          <Link
                            key={sc.id}
                            href={`/cofre?q=${encodeURIComponent(sc.name)}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <Lock className="h-4 w-4 shrink-0 text-slate-700" />
                              <span className="truncate font-medium text-slate-900">
                                {sc.name}
                              </span>
                              {sc.projectName ? (
                                <span className="truncate text-xs text-slate-500">
                                  {sc.projectName}
                                </span>
                              ) : null}
                            </div>
                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                              {sc.service}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}

                    {results.contacts.length > 0 ? (
                      <div>
                        <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Contatos
                        </p>
                        {results.contacts.map((ct) => (
                          <Link
                            key={ct.id}
                            href={`/clientes/${ct.clientId}`}
                            onClick={() => setSearchOpen(false)}
                            className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm hover:bg-slate-50"
                          >
                            <Users className="h-4 w-4 shrink-0 text-slate-500" />
                            <span className="truncate font-medium text-slate-900">
                              {ct.name}
                            </span>
                            <span className="truncate text-xs text-slate-500">
                              {ct.clientCompany}
                            </span>
                          </Link>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
              </div>
            ) : null}
          </div>

          <div className="ml-auto hidden items-center gap-2 text-sm text-slate-600 sm:flex">
            <UserCircle2 className="h-4 w-4 text-slate-400" />
            <span className="font-medium text-slate-700">{user.name}</span>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle2,
  CheckSquare,
  FolderKanban,
  KanbanSquare,
  Plus,
  Target,
  Trash2,
  TrendingUp,
  Wallet,
} from "lucide-react";
import {
  LEAD_STAGE_MAP,
  PROJECT_STATUS_MAP,
  TASK_PRIORITY_MAP,
  TASK_STATUS_MAP,
} from "@/lib/constants";
import type {
  LeadStage,
  ProjectStatus,
  TaskPriority,
  TaskStatus,
} from "@/db/schema";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  isProjectOverdue,
  isTaskOverdue,
} from "@/lib/format";

interface DashboardData {
  period: string;
  commercial: {
    newLeadsCount: number;
    contactedCount: number;
    repliedCount: number;
    meetingsCount: number;
    proposalsCount: number;
    closedWonCount: number;
    conversionRate: number;
    openPipelineValue: number;
    totalLeadsAllTime: number;
    funnelBreakdown: {
      stage: LeadStage;
      label: string;
      count: number;
      value: number;
    }[];
    upcomingFollowUps: {
      id: string;
      company: string;
      contactName: string;
      stage: LeadStage;
      nextAction: string | null;
      nextFollowUpAt: string | null;
      ownerName: string | null;
    }[];
  };
  projects: {
    totalClients: number;
    activeClientsCount: number;
    totalProjects: number;
    activeProjectsCount: number;
    overdueProjectsCount: number;
    totalSoldRevenue: number;
    activeMrr: number;
    upcomingDeliveries: {
      id: string;
      name: string;
      status: ProjectStatus;
      dueDate: string | null;
      nextDelivery: string | null;
      clientId: string;
      clientCompany: string;
      ownerName: string | null;
    }[];
  };
  financial: {
    receivedThisMonth: number;
    forecastThisMonth: number;
    pendingAmount: number;
    overdueAmount: number;
    mrr: number;
    oneTimeReceived: number;
    recurringReceived: number;
  };
  tasks: {
    totalTasksCount: number;
    pendingTasksCount: number;
    overdueTasksCount: number;
    completedTasksCount: number;
    upcomingTasks: {
      id: string;
      title: string;
      status: TaskStatus;
      priority: TaskPriority;
      dueDate: string | null;
      projectId: string | null;
      projectName: string | null;
      assigneeName: string | null;
    }[];
  };
  weeklyGoals: {
    weekStart: string;
    total: number;
    completed: number;
    completionPct: number;
    items: {
      id: string;
      title: string;
      completed: boolean;
      ownerName: string | null;
      projectId: string | null;
      projectName: string | null;
    }[];
  };
  recentActivities: {
    id: string;
    entityType: string;
    entityId: string;
    action: string;
    description: string;
    createdAt: string;
    userName: string | null;
  }[];
}

const PERIOD_OPTIONS = [
  { value: "7d", label: "Últimos 7 dias (Semanal)" },
  { value: "30d", label: "Últimos 30 dias" },
  { value: "month", label: "Mês atual" },
  { value: "90d", label: "Últimos 90 dias" },
  { value: "all", label: "Todo o período" },
];

export default function DashboardPage() {
  const [period, setPeriod] = useState("30d");
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newGoalTitle, setNewGoalTitle] = useState("");
  const [addingGoal, setAddingGoal] = useState(false);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/dashboard?period=${period}`);
      if (!res.ok) throw new Error("Não foi possível carregar o dashboard.");
      const json = (await res.json()) as DashboardData;
      setData(json);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar o dashboard."
      );
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  async function handleAddGoal(e: React.FormEvent) {
    e.preventDefault();
    if (!newGoalTitle.trim()) return;
    setAddingGoal(true);
    try {
      const res = await fetch("/api/weekly-goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: newGoalTitle.trim() }),
      });
      if (res.ok) {
        setNewGoalTitle("");
        loadDashboard();
      }
    } finally {
      setAddingGoal(false);
    }
  }

  async function handleToggleGoal(goalId: string, completed: boolean) {
    const res = await fetch(`/api/weekly-goals/${goalId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: !completed }),
    });
    if (res.ok) loadDashboard();
  }

  async function handleDeleteGoal(goalId: string) {
    const res = await fetch(`/api/weekly-goals/${goalId}`, {
      method: "DELETE",
    });
    if (res.ok) loadDashboard();
  }

  const maxFunnelCount = Math.max(
    1,
    ...(data?.commercial.funnelBreakdown.map((f) => f.count) ?? [1])
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard ValeMind OS
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Visão semanal e gerencial em tempo real com 100% dos dados do Neon Postgres.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs focus:border-indigo-500 focus:outline-none"
          >
            {PERIOD_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Link
            href="/comercial/leads"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Calculando indicadores reais...
        </div>
      ) : error || !data ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error ?? "Erro ao carregar dashboard."}
        </div>
      ) : (
        <>
          {/* Bloco Comercial */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-indigo-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                  Comercial no período
                </h2>
              </div>
              <Link
                href="/comercial/pipeline"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Abrir Pipeline <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Novos leads</p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">
                  {data.commercial.newLeadsCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {data.commercial.totalLeadsAllTime} no total histórico
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Contatados / Respostas
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">
                  {data.commercial.contactedCount}{" "}
                  <span className="text-base font-medium text-slate-400">
                    / {data.commercial.repliedCount}
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Reuniões: {data.commercial.meetingsCount} · Propostas:{" "}
                  {data.commercial.proposalsCount}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Fechados / Conversão
                </p>
                <p className="mt-1.5 text-2xl font-bold text-emerald-700">
                  {data.commercial.closedWonCount}{" "}
                  <span className="text-sm font-semibold text-emerald-600">
                    ({data.commercial.conversionRate}%)
                  </span>
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Taxa sobre leads do período
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Valor total do pipeline
                </p>
                <p className="mt-1.5 text-2xl font-bold text-indigo-700">
                  {formatCurrency(data.commercial.openPipelineValue)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  Negócios abertos no funil
                </p>
              </div>
            </div>
          </section>

          {/* Bloco Financeiro (PRD Seção 4 & 8) */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-emerald-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                  Financeiro Gerencial
                </h2>
              </div>
              <Link
                href="/financeiro"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Abrir Financeiro <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Recebido no mês
                </p>
                <p className="mt-1.5 text-lg font-bold text-emerald-700">
                  {formatCurrency(data.financial.receivedThisMonth)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Previsto no mês
                </p>
                <p className="mt-1.5 text-lg font-bold text-slate-900">
                  {formatCurrency(data.financial.forecastThisMonth)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Pendentes</p>
                <p className="mt-1.5 text-lg font-bold text-amber-700">
                  {formatCurrency(data.financial.pendingAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">Atrasados</p>
                <p className="mt-1.5 text-lg font-bold text-rose-700">
                  {formatCurrency(data.financial.overdueAmount)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">MRR</p>
                <p className="mt-1.5 text-lg font-bold text-indigo-700">
                  {formatCurrency(data.financial.mrr)}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Pontual × Recorr.
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-800">
                  P: {formatCurrency(data.financial.oneTimeReceived)}
                </p>
                <p className="text-xs font-semibold text-emerald-700">
                  R: {formatCurrency(data.financial.recurringReceived)}
                </p>
              </div>
            </div>
          </section>

          {/* Bloco Projetos & Operação Semanal */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-4 w-4 text-violet-600" />
                <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-600">
                  Projetos & Operação Semanal
                </h2>
              </div>
              <Link
                href="/projetos"
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Ver Projetos <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Clientes ativos
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">
                  {data.projects.activeClientsCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {data.projects.totalClients} cadastrados
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Projetos ativos
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">
                  {data.projects.activeProjectsCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {data.projects.overdueProjectsCount > 0 ? (
                    <span className="font-semibold text-rose-600">
                      {data.projects.overdueProjectsCount} atrasado(s)
                    </span>
                  ) : (
                    "Nenhum atrasado"
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Tarefas pendentes
                </p>
                <p className="mt-1.5 text-2xl font-bold text-slate-900">
                  {data.tasks.pendingTasksCount}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {data.tasks.overdueTasksCount > 0 ? (
                    <span className="font-semibold text-rose-600">
                      {data.tasks.overdueTasksCount} atrasada(s)
                    </span>
                  ) : (
                    `${data.tasks.completedTasksCount} concluída(s)`
                  )}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <p className="text-xs font-medium text-slate-500">
                  Metas semanais concluídas
                </p>
                <p className="mt-1.5 text-2xl font-bold text-indigo-700">
                  {data.weeklyGoals.completionPct}%
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {data.weeklyGoals.completed} de {data.weeklyGoals.total} meta(s)
                </p>
              </div>
            </div>
          </section>

          {/* Detail Grid: Funil + Metas Semanais Interativas */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Distribuição do Funil Comercial
                  </h3>
                </div>
                <Link
                  href="/comercial/pipeline"
                  className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-indigo-600"
                >
                  <KanbanSquare className="h-3.5 w-3.5" />
                  Kanban
                </Link>
              </div>

              {data.commercial.totalLeadsAllTime === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-500">
                  Nenhum lead cadastrado ainda. Os números aparecerão aqui assim que o primeiro lead entrar no funil.
                </div>
              ) : (
                <div className="space-y-3">
                  {data.commercial.funnelBreakdown.map((item) => {
                    const meta = LEAD_STAGE_MAP[item.stage];
                    const widthPct =
                      item.count > 0
                        ? Math.max(
                            8,
                            Math.round((item.count / maxFunnelCount) * 100)
                          )
                        : 0;
                    return (
                      <div key={item.stage} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-2 font-medium text-slate-700">
                            <span
                              className={`h-2 w-2 rounded-full ${meta.dotClass}`}
                            />
                            {item.label}
                          </span>
                          <span className="text-slate-500">
                            <strong className="text-slate-900">
                              {item.count}
                            </strong>{" "}
                            · {formatCurrency(item.value)}
                          </span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full transition-all ${meta.dotClass}`}
                            style={{ width: `${widthPct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Metas da Semana */}
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Metas da semana
                  </h3>
                </div>
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                  {data.weeklyGoals.completionPct}%
                </span>
              </div>

              <form onSubmit={handleAddGoal} className="mb-3 flex gap-2">
                <input
                  value={newGoalTitle}
                  onChange={(e) => setNewGoalTitle(e.target.value)}
                  placeholder="Adicionar meta semanal..."
                  className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs focus:border-indigo-500 focus:bg-white focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={addingGoal || !newGoalTitle.trim()}
                  className="rounded-xl bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </form>

              {data.weeklyGoals.items.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-5 text-center text-xs text-slate-500">
                  Defina as metas da semana para acompanhar na reunião semanal da ValeMind.
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.weeklyGoals.items.map((g) => (
                    <li
                      key={g.id}
                      className="flex items-start justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2 text-xs"
                    >
                      <button
                        type="button"
                        onClick={() => handleToggleGoal(g.id, g.completed)}
                        className="flex items-start gap-2 text-left"
                      >
                        <CheckCircle2
                          className={`mt-0.5 h-4 w-4 shrink-0 ${
                            g.completed
                              ? "text-emerald-600"
                              : "text-slate-300 hover:text-emerald-600"
                          }`}
                        />
                        <span
                          className={
                            g.completed
                              ? "text-slate-400 line-through"
                              : "font-medium text-slate-800"
                          }
                        >
                          {g.title}
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteGoal(g.id)}
                        className="text-slate-300 hover:text-rose-600"
                        aria-label="Excluir meta"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          {/* Bottom Grid: Entregas + Tarefas + Follow-ups/Atividades */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Próximas entregas
                  </h3>
                </div>
                <Link
                  href="/projetos"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Projetos
                </Link>
              </div>

              {data.projects.upcomingDeliveries.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  Nenhum projeto ativo com prazo ou próxima entrega definida.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.projects.upcomingDeliveries.map((p) => {
                    const st = PROJECT_STATUS_MAP[p.status];
                    const overdue = isProjectOverdue(p.dueDate, p.status);
                    return (
                      <div
                        key={p.id}
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={`/projetos/${p.id}`}
                            className="text-sm font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {p.name}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {p.clientCompany}
                            {p.nextDelivery ? ` · ${p.nextDelivery}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${st.badgeClass}`}
                          >
                            {st.label}
                          </span>
                          <div className="mt-1 text-[11px]">
                            {overdue ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-rose-600">
                                <AlertTriangle className="h-3 w-3" />
                                {formatDate(p.dueDate)}
                              </span>
                            ) : (
                              <span className="text-slate-500">
                                {formatDate(p.dueDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-4 w-4 text-violet-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Tarefas pendentes
                  </h3>
                </div>
                <Link
                  href="/tarefas"
                  className="text-xs font-medium text-indigo-600 hover:underline"
                >
                  Ver todas
                </Link>
              </div>

              {data.tasks.upcomingTasks.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  Nenhuma tarefa pendente no momento.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.tasks.upcomingTasks.map((t) => {
                    const tst = TASK_STATUS_MAP[t.status];
                    const tpr = TASK_PRIORITY_MAP[t.priority];
                    const overdue = isTaskOverdue(t.dueDate, t.status);
                    return (
                      <div
                        key={t.id}
                        className="flex items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <Link
                            href={
                              t.projectId
                                ? `/projetos/${t.projectId}`
                                : "/tarefas"
                            }
                            className="block truncate text-sm font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {t.title}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {t.projectName || "Interna"}
                            {t.assigneeName ? ` · ${t.assigneeName}` : ""}
                          </p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tpr.badgeClass}`}
                            >
                              {tpr.label}
                            </span>
                            <span
                              className={`rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${tst.badgeClass}`}
                            >
                              {tst.label}
                            </span>
                          </div>
                          {t.dueDate ? (
                            <p
                              className={`mt-1 text-[11px] ${
                                overdue
                                  ? "font-semibold text-rose-600"
                                  : "text-slate-500"
                              }`}
                            >
                              {formatDate(t.dueDate)}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-slate-900">
                    Follow-ups & Atividades
                  </h3>
                </div>
                <Calendar className="h-4 w-4 text-slate-400" />
              </div>

              {data.commercial.upcomingFollowUps.length > 0 ? (
                <div className="mb-4 space-y-2 border-b border-slate-100 pb-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700">
                    Follow-ups agendados
                  </p>
                  {data.commercial.upcomingFollowUps.slice(0, 3).map((f) => (
                    <div
                      key={f.id}
                      className="rounded-lg bg-amber-50/70 px-2.5 py-2 text-xs"
                    >
                      <Link
                        href={`/comercial/leads?q=${encodeURIComponent(f.company)}`}
                        className="font-semibold text-slate-900 hover:text-indigo-600"
                      >
                        {f.company}
                      </Link>
                      <p className="text-slate-600">
                        {f.nextAction || "Follow-up"} ·{" "}
                        {formatDate(f.nextFollowUpAt)}
                      </p>
                    </div>
                  ))}
                </div>
              ) : null}

              {data.recentActivities.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                  As movimentações da empresa aparecerão aqui automaticamente.
                </p>
              ) : (
                <ul className="space-y-2.5">
                  {data.recentActivities.slice(0, 6).map((act) => (
                    <li
                      key={act.id}
                      className="border-l-2 border-indigo-200 pl-3 text-xs"
                    >
                      <p className="text-slate-800">{act.description}</p>
                      <p className="mt-0.5 text-[11px] text-slate-400">
                        {act.userName ?? "Sistema"} ·{" "}
                        {formatDateTime(act.createdAt)}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </>
      )}
    </div>
  );
}

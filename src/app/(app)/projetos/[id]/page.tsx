"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  CheckSquare,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  GitBranch,
  Globe,
  Lock,
  MessageSquareText,
  Pencil,
  Plus,
  Trash2,
  User,
  Users,
  Wallet,
} from "lucide-react";
import {
  FINANCIAL_STATUS_MAP,
  PROJECT_STATUSES,
  PROJECT_STATUS_MAP,
  TASK_PRIORITY_MAP,
  TASK_STATUSES,
  TASK_STATUS_MAP,
} from "@/lib/constants";
import type {
  FinancialStatus,
  ImportantLink,
  ProjectStatus,
  TaskStatus,
} from "@/db/schema";
import {
  ensureExternalUrl,
  formatCurrency,
  formatDate,
  formatDateTime,
  isProjectOverdue,
  isTaskOverdue,
} from "@/lib/format";
import {
  ProjectFormModal,
  type ProjectFormData,
  type SimpleClient,
} from "@/components/ProjectFormModal";
import { TaskFormModal, type TaskRecord } from "@/components/TaskFormModal";
import type { SimpleUser } from "@/components/LeadFormModal";

interface ProjectDetailResponse {
  project: Omit<ProjectFormData, "participants"> & {
    clientCompany: string;
    clientName: string;
    ownerName: string | null;
    participants: { id: string; name: string; email: string }[];
    createdAt: string;
    updatedAt: string;
  };
  tasks: TaskRecord[];
  contract?: {
    id: string;
    totalSoldValue: string | null;
    setupValue: string | null;
    monthlyFee: string | null;
    dueDay: number;
    paymentMethod: string | null;
    active: boolean;
  } | null;
  financialEntries?: {
    id: string;
    description: string;
    entryType: string;
    amount: string;
    dueDate: string;
    paidAt: string | null;
    status: FinancialStatus;
  }[];
  meetings?: {
    id: string;
    title: string;
    meetingDate: string;
    decisions: string | null;
    nextActions: string | null;
  }[];
  secrets?: {
    id: string;
    name: string;
    service: string;
    url: string | null;
    login: string | null;
    credentialType: string;
  }[];
  activities: {
    id: string;
    description: string;
    createdAt: string;
    userName: string | null;
  }[];
}

export default function ProjetoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const projectId = params.id;

  const [data, setData] = useState<ProjectDetailResponse | null>(null);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, string>>(
    {}
  );
  const [copiedSecretId, setCopiedSecretId] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projRes, usersRes, clientsRes] = await Promise.all([
        fetch(`/api/projects/${projectId}`),
        fetch("/api/users"),
        fetch("/api/clients"),
      ]);

      if (!projRes.ok) {
        throw new Error(
          projRes.status === 404
            ? "Projeto não encontrado."
            : "Erro ao carregar projeto."
        );
      }

      const projJson = (await projRes.json()) as ProjectDetailResponse;
      setData(projJson);

      if (usersRes.ok) {
        const u = await usersRes.json();
        setUsers(u.users ?? []);
      }
      if (clientsRes.ok) {
        const c = await clientsRes.json();
        setClients(c.clients ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar projeto.");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleStatusChange(newStatus: ProjectStatus) {
    if (!data) return;
    setData({
      ...data,
      project: { ...data.project, status: newStatus },
    });
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
    if (res.ok) {
      loadData();
    }
  }

  async function handleDelete() {
    if (!data) return;
    if (!confirm(`Excluir o projeto "${data.project.name}"?`)) return;
    const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
    if (res.ok) router.push("/projetos");
  }

  async function handleTaskStatus(taskId: string, status: TaskStatus) {
    if (!data) return;
    setData({
      ...data,
      tasks: data.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)),
    });
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadData();
  }

  async function handleDeleteTask(task: TaskRecord) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) loadData();
  }

  async function toggleRevealSecret(secretId: string) {
    if (revealedSecrets[secretId]) {
      setRevealedSecrets((prev) => {
        const next = { ...prev };
        delete next[secretId];
        return next;
      });
      return;
    }
    const res = await fetch(`/api/vault/${secretId}/reveal`, { method: "POST" });
    if (res.ok) {
      const json = await res.json();
      setRevealedSecrets((prev) => ({ ...prev, [secretId]: json.secretValue }));
      setTimeout(() => {
        setRevealedSecrets((prev) => {
          if (!prev[secretId]) return prev;
          const next = { ...prev };
          delete next[secretId];
          return next;
        });
      }, 30000);
    }
  }

  async function copyProjectSecret(secretId: string) {
    let val = revealedSecrets[secretId];
    if (!val) {
      const res = await fetch(`/api/vault/${secretId}/reveal`, {
        method: "POST",
      });
      if (!res.ok) return;
      val = (await res.json()).secretValue;
    }
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopiedSecretId(secretId);
    setTimeout(() => setCopiedSecretId(null), 2000);
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Carregando projeto...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/projetos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Projetos
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error ?? "Projeto não encontrado."}
        </div>
      </div>
    );
  }

  const {
    project,
    tasks: projectTasks = [],
    financialEntries = [],
    meetings: projectMeetings = [],
    secrets: projectSecrets = [],
    activities,
  } = data;
  const st = PROJECT_STATUS_MAP[project.status];
  const overdue = isProjectOverdue(project.dueDate, project.status);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/projetos"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Projetos
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {project.name}
            </h1>
            <select
              value={project.status}
              onChange={(e) =>
                handleStatusChange(e.target.value as ProjectStatus)
              }
              className={`rounded-full border px-3 py-1 text-xs font-semibold focus:outline-none ${st.badgeClass}`}
            >
              {PROJECT_STATUSES.map((opt) => (
                <option
                  key={opt.value}
                  value={opt.value}
                  className="bg-white text-slate-900"
                >
                  {opt.label}
                </option>
              ))}
            </select>
            {overdue ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-0.5 text-xs font-semibold text-rose-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                Prazo atrasado
              </span>
            ) : null}
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <Link
              href={`/clientes/${project.clientId}`}
              className="inline-flex items-center gap-1.5 font-medium text-indigo-600 hover:underline"
            >
              <Building2 className="h-4 w-4" />
              {project.clientCompany}
            </Link>
            <span>·</span>
            <span className="inline-flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              Responsável: <strong className="text-slate-700">{project.ownerName || "Não definido"}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setEditOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Editar projeto
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="inline-flex items-center rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50"
            title="Excluir projeto"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Valor vendido
          </p>
          <p className="mt-1.5 text-xl font-bold text-slate-900">
            {formatCurrency(project.soldValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Mensalidade
          </p>
          <p className="mt-1.5 text-xl font-bold text-emerald-700">
            {formatCurrency(project.monthlyFee)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Início / Prazo
          </p>
          <p className="mt-1.5 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
            <Calendar className="h-4 w-4 text-slate-400" />
            {formatDate(project.startDate)} → {formatDate(project.dueDate)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Próxima entrega
          </p>
          <p className="mt-1.5 text-sm font-semibold text-slate-900">
            {project.nextDelivery || "Não definida"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Tarefas do Projeto */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckSquare className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Tarefas do projeto ({projectTasks.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingTask(null);
                  setTaskModalOpen(true);
                }}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Nova tarefa
              </button>
            </div>

            {projectTasks.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Nenhuma tarefa cadastrada para este projeto ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projectTasks.map((t) => {
                  const done = t.status === "concluido";
                  const taskOverdue = isTaskOverdue(t.dueDate, t.status);
                  const tst = TASK_STATUS_MAP[t.status];
                  const tpr = TASK_PRIORITY_MAP[t.priority];
                  return (
                    <div
                      key={t.id}
                      className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <button
                          type="button"
                          onClick={() =>
                            handleTaskStatus(t.id, done ? "a_fazer" : "concluido")
                          }
                          className={`mt-0.5 ${
                            done
                              ? "text-emerald-600"
                              : "text-slate-300 hover:text-emerald-600"
                          }`}
                        >
                          <CheckCircle2 className="h-4 w-4" />
                        </button>
                        <div className="min-w-0">
                          <p
                            className={`text-sm font-medium ${
                              done
                                ? "text-slate-400 line-through"
                                : "text-slate-900"
                            }`}
                          >
                            {t.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                            <span
                              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${tpr.badgeClass}`}
                            >
                              {tpr.label}
                            </span>
                            {t.assigneeName ? (
                              <span>{t.assigneeName}</span>
                            ) : null}
                            {t.dueDate ? (
                              <span
                                className={
                                  taskOverdue
                                    ? "font-semibold text-rose-600"
                                    : ""
                                }
                              >
                                Prazo: {formatDate(t.dueDate)}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <select
                          value={t.status}
                          onChange={(e) =>
                            handleTaskStatus(t.id, e.target.value as TaskStatus)
                          }
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium focus:outline-none ${tst.badgeClass}`}
                        >
                          {TASK_STATUSES.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              className="bg-white text-slate-900"
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingTask(t);
                            setTaskModalOpen(true);
                          }}
                          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteTask(t)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Descrição & Observações */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-base font-semibold text-slate-900">
              Escopo e detalhes
            </h2>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">
              {project.description || "Nenhuma descrição cadastrada para este projeto."}
            </p>

            {project.notes ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Observações operacionais
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {project.notes}
                </p>
              </div>
            ) : null}
          </section>

          {/* Links Técnicos & Importantes */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-3 text-base font-semibold text-slate-900">
              Links do projeto
            </h2>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {project.githubUrl ? (
                <a
                  href={ensureExternalUrl(project.githubUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-800 hover:border-indigo-300 hover:bg-indigo-50/40"
                >
                  <span className="flex items-center gap-2 truncate">
                    <GitBranch className="h-4 w-4 text-slate-500" />
                    Repositório GitHub
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                </a>
              ) : null}

              {project.productionUrl ? (
                <a
                  href={ensureExternalUrl(project.productionUrl)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50/40 p-3 text-sm font-medium text-emerald-900 hover:bg-emerald-50"
                >
                  <span className="flex items-center gap-2 truncate">
                    <Globe className="h-4 w-4 text-emerald-600" />
                    URL de Produção
                  </span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-emerald-600" />
                </a>
              ) : null}

              {(project.importantLinks as ImportantLink[])?.map((link, idx) => (
                <a
                  key={idx}
                  href={ensureExternalUrl(link.url)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-between rounded-xl border border-slate-200 p-3 text-sm font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                >
                  <span className="truncate">{link.label}</span>
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                </a>
              ))}
            </div>

            {!project.githubUrl &&
            !project.productionUrl &&
            ((project.importantLinks as ImportantLink[])?.length ?? 0) === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum link técnico adicionado ainda. Clique em &ldquo;Editar projeto&rdquo; para adicionar GitHub, produção ou outros links.
              </p>
            ) : null}
          </section>

          {/* Financeiro do Projeto */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-emerald-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Financeiro do projeto ({financialEntries.length})
                </h2>
              </div>
              <Link
                href="/financeiro"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Gerenciar no Financeiro
              </Link>
            </div>
            {financialEntries.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum lançamento financeiro registrado para este projeto ainda.
              </p>
            ) : (
              <div className="divide-y divide-slate-100 text-xs">
                {financialEntries.map((fe) => {
                  const fst = FINANCIAL_STATUS_MAP[fe.status];
                  return (
                    <div
                      key={fe.id}
                      className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {fe.description}
                        </p>
                        <p className="text-slate-400">
                          Venc.: {formatDate(fe.dueDate)}
                          {fe.paidAt ? ` · Pago: ${formatDate(fe.paidAt)}` : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(fe.amount)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${fst.badgeClass}`}
                        >
                          {fst.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Reuniões & Histórico de Decisões */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-5 w-5 text-teal-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Reuniões e Decisões ({projectMeetings.length})
                </h2>
              </div>
              <Link
                href="/reunioes"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Registrar reunião
              </Link>
            </div>
            {projectMeetings.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma reunião vinculada a este projeto.
              </p>
            ) : (
              <div className="space-y-3">
                {projectMeetings.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{m.title}</p>
                      <span className="text-slate-400">
                        {formatDate(m.meetingDate)}
                      </span>
                    </div>
                    {m.decisions ? (
                      <p className="mt-1.5 text-emerald-800">
                        <strong>Decisões:</strong> {m.decisions}
                      </p>
                    ) : null}
                    {m.nextActions ? (
                      <p className="mt-1 text-slate-600">
                        <strong>Próximas ações:</strong> {m.nextActions}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Credenciais Relacionadas (Cofre) */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-5 w-5 text-slate-700" />
                <h2 className="text-base font-semibold text-slate-900">
                  Credenciais relacionadas ({projectSecrets.length})
                </h2>
              </div>
              <Link
                href="/cofre"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Abrir Cofre
              </Link>
            </div>
            {projectSecrets.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma credencial vinculada a este projeto no Cofre.
              </p>
            ) : (
              <div className="space-y-2.5">
                {projectSecrets.map((sc) => {
                  const isRev = Boolean(revealedSecrets[sc.id]);
                  return (
                    <div
                      key={sc.id}
                      className="flex flex-col gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="rounded bg-slate-900 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                            {sc.service}
                          </span>
                          <p className="truncate text-sm font-semibold text-slate-900">
                            {sc.name}
                          </p>
                        </div>
                        <p className="mt-1 truncate font-mono text-xs text-slate-600">
                          {sc.login ? `${sc.login} · ` : ""}
                          {isRev ? revealedSecrets[sc.id] : "••••••••••••"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => toggleRevealSecret(sc.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        >
                          {isRev ? (
                            <>
                              <EyeOff className="h-3.5 w-3.5" />
                              Ocultar
                            </>
                          ) : (
                            <>
                              <Eye className="h-3.5 w-3.5" />
                              Revelar
                            </>
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => copyProjectSecret(sc.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          {copiedSecretId === sc.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Copiado
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5" />
                              Copiar
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Right col: Team + History */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-indigo-600" />
              <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-500">
                Equipe envolvida
              </h2>
            </div>
            {project.participants.length === 0 ? (
              <p className="text-xs text-slate-500">Nenhum participante listado.</p>
            ) : (
              <ul className="space-y-2">
                {project.participants.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-slate-900">{p.name}</p>
                      <p className="text-slate-500">{p.email}</p>
                    </div>
                    {p.id === project.ownerId ? (
                      <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                        Responsável
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Histórico do projeto
            </h2>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500">
                Sem atividades registradas.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="text-xs">
                    <p className="text-slate-800">{a.description}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {a.userName ?? "Sistema"} · {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ProjectFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSaved={loadData}
        users={users}
        clients={clients}
        initialProject={project}
      />

      <TaskFormModal
        open={taskModalOpen}
        onClose={() => setTaskModalOpen(false)}
        onSaved={loadData}
        users={users}
        projects={[
          {
            id: project.id,
            name: project.name,
            clientId: project.clientId,
            clientCompany: project.clientCompany,
          },
        ]}
        clients={clients}
        initialTask={editingTask}
        defaultProjectId={project.id}
        defaultClientId={project.clientId}
      />
    </div>
  );
}

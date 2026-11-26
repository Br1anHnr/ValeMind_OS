"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  CheckSquare,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Trash2,
  User,
} from "lucide-react";
import {
  TASK_PRIORITIES,
  TASK_PRIORITY_MAP,
  TASK_STATUSES,
  TASK_STATUS_MAP,
} from "@/lib/constants";
import type { TaskStatus } from "@/db/schema";
import { formatDate, isTaskOverdue } from "@/lib/format";
import {
  TaskFormModal,
  type SimpleProject,
  type TaskRecord,
} from "@/components/TaskFormModal";
import type { SimpleUser } from "@/components/LeadFormModal";
import type { SimpleClient } from "@/components/ProjectFormModal";

type TaskView = "mine" | "week" | "by_project" | "overdue" | "all";

const VIEW_TABS: { value: TaskView; label: string }[] = [
  { value: "mine", label: "Minhas tarefas" },
  { value: "week", label: "Tarefas da semana" },
  { value: "by_project", label: "Por projeto" },
  { value: "overdue", label: "Atrasadas" },
  { value: "all", label: "Todas" },
];

export default function TarefasPage() {
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [view, setView] = useState<TaskView>("all");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");
  const [assigneeFilter, setAssigneeFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskRecord | null>(null);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const q = params.get("q");
    if (q) setSearch(q);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (view !== "by_project") qs.set("view", view);
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (priorityFilter !== "all") qs.set("priority", priorityFilter);
      if (projectFilter !== "all") qs.set("projectId", projectFilter);
      if (assigneeFilter !== "all" && view !== "mine") {
        qs.set("assigneeId", assigneeFilter);
      }

      const [tasksRes, usersRes, projRes, clientsRes] = await Promise.all([
        fetch(`/api/tasks?${qs.toString()}`),
        fetch("/api/users"),
        fetch("/api/projects"),
        fetch("/api/clients"),
      ]);

      if (!tasksRes.ok) throw new Error("Erro ao carregar tarefas.");
      setTasks((await tasksRes.json()).tasks ?? []);

      if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
      if (projRes.ok) setProjects((await projRes.json()).projects ?? []);
      if (clientsRes.ok) setClients((await clientsRes.json()).clients ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar tarefas.");
    } finally {
      setLoading(false);
    }
  }, [view, search, statusFilter, priorityFilter, projectFilter, assigneeFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleQuickStatus(taskId: string, status: TaskStatus) {
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status } : t))
    );
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) loadData();
  }

  async function handleDelete(task: TaskRecord) {
    if (!confirm(`Excluir a tarefa "${task.title}"?`)) return;
    const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
    if (res.ok) loadData();
  }

  // Agrupamento por projeto para a visao "Por projeto"
  const groupedByProject = tasks.reduce<
    { key: string; label: string; projectId: string | null; items: TaskRecord[] }[]
  >((groups, task) => {
    const key = task.projectId ?? "__internal__";
    const label = task.projectName
      ? `${task.projectName}${task.clientCompany ? ` (${task.clientCompany})` : ""}`
      : "Operação Interna (sem projeto)";
    let group = groups.find((g) => g.key === key);
    if (!group) {
      group = { key, label, projectId: task.projectId, items: [] };
      groups.push(group);
    }
    group.items.push(task);
    return groups;
  }, []);

  function renderTaskRow(task: TaskRecord) {
    const st = TASK_STATUS_MAP[task.status];
    const pr = TASK_PRIORITY_MAP[task.priority];
    const overdue = isTaskOverdue(task.dueDate, task.status);
    const done = task.status === "concluido";

    return (
      <tr key={task.id} className="transition hover:bg-slate-50/70">
        <td className="px-4 py-3.5 align-top">
          <div className="flex items-start gap-2.5">
            <button
              type="button"
              onClick={() =>
                handleQuickStatus(task.id, done ? "a_fazer" : "concluido")
              }
              title={done ? "Reabrir tarefa" : "Marcar como concluída"}
              className={`mt-0.5 rounded-full transition ${
                done
                  ? "text-emerald-600 hover:text-slate-400"
                  : "text-slate-300 hover:text-emerald-600"
              }`}
            >
              <CheckCircle2 className="h-4.5 w-4.5" />
            </button>
            <div className="min-w-0">
              <p
                className={`font-semibold ${
                  done ? "text-slate-400 line-through" : "text-slate-900"
                }`}
              >
                {task.title}
              </p>
              {task.description ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
                  {task.description}
                </p>
              ) : null}
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                {task.projectId && task.projectName ? (
                  <Link
                    href={`/projetos/${task.projectId}`}
                    className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                  >
                    <FolderKanban className="h-3 w-3" />
                    {task.projectName}
                  </Link>
                ) : (
                  <span className="text-slate-400">Operação Interna</span>
                )}
                {task.clientId && task.clientCompany ? (
                  <Link
                    href={`/clientes/${task.clientId}`}
                    className="text-slate-500 hover:underline"
                  >
                    · {task.clientCompany}
                  </Link>
                ) : null}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3.5 align-top">
          <select
            value={task.status}
            onChange={(e) =>
              handleQuickStatus(task.id, e.target.value as TaskStatus)
            }
            className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none ${st.badgeClass}`}
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
        </td>
        <td className="px-4 py-3.5 align-top">
          <span
            className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${pr.badgeClass}`}
          >
            {pr.label}
          </span>
        </td>
        <td className="px-4 py-3.5 align-top text-xs">
          {overdue ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
              <AlertTriangle className="h-3 w-3" />
              {formatDate(task.dueDate)}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-slate-700">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              {formatDate(task.dueDate)}
            </span>
          )}
        </td>
        <td className="px-4 py-3.5 align-top text-xs font-medium text-slate-700">
          <span className="inline-flex items-center gap-1">
            <User className="h-3.5 w-3.5 text-slate-400" />
            {task.assigneeName || "Sem resp."}
          </span>
        </td>
        <td className="px-4 py-3.5 align-top text-right">
          <div className="inline-flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setEditingTask(task);
                setFormOpen(true);
              }}
              title="Editar tarefa"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleDelete(task)}
              title="Excluir tarefa"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Tarefas e Operação
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Controle prático de entregas dos projetos e demandas internas da ValeMind.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingTask(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </button>
      </div>

      {/* View Tabs (PRD Seção 9) */}
      <div className="flex flex-wrap gap-2">
        {VIEW_TABS.map((tab) => {
          const active = view === tab.value;
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => setView(tab.value)}
              className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
                active
                  ? "bg-slate-900 text-white shadow-xs"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-4">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tarefa, projeto ou cliente..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Status</option>
            {TASK_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Prioridade</option>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Projeto</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
            disabled={view === "mine"}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none disabled:opacity-50"
          >
            <option value="all">Responsável</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Carregando tarefas...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <CheckSquare className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhuma tarefa encontrada nesta visão
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre tarefas internas ou vinculadas aos projetos para acompanhar a operação semanal.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingTask(null);
              setFormOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Criar tarefa
          </button>
        </div>
      ) : view === "by_project" ? (
        <div className="space-y-5">
          {groupedByProject.map((group) => (
            <div
              key={group.key}
              className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                {group.projectId ? (
                  <Link
                    href={`/projetos/${group.projectId}`}
                    className="text-sm font-semibold text-slate-900 hover:text-indigo-600"
                  >
                    {group.label}
                  </Link>
                ) : (
                  <span className="text-sm font-semibold text-slate-900">
                    {group.label}
                  </span>
                )}
                <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                  {group.items.length}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100 text-left text-sm">
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map(renderTaskRow)}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Tarefa / Projeto</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prioridade</th>
                  <th className="px-4 py-3">Prazo</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasks.map(renderTaskRow)}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TaskFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        users={users}
        projects={projects}
        clients={clients}
        initialTask={editingTask}
      />
    </div>
  );
}

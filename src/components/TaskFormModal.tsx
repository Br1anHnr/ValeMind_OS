"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { TASK_PRIORITIES, TASK_STATUSES } from "@/lib/constants";
import type { TaskPriority, TaskStatus } from "@/db/schema";
import type { SimpleUser } from "@/components/LeadFormModal";
import type { SimpleClient } from "@/components/ProjectFormModal";

export interface SimpleProject {
  id: string;
  name: string;
  clientId: string;
  clientCompany?: string;
}

export interface TaskRecord {
  id: string;
  title: string;
  projectId: string | null;
  projectName?: string | null;
  clientId: string | null;
  clientCompany?: string | null;
  assigneeId: string | null;
  assigneeName?: string | null;
  priority: TaskPriority;
  dueDate: string | null;
  status: TaskStatus;
  description: string | null;
  completedAt?: string | null;
}

interface TaskFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  users: SimpleUser[];
  projects: SimpleProject[];
  clients: SimpleClient[];
  initialTask?: TaskRecord | null;
  defaultProjectId?: string;
  defaultClientId?: string;
}

export function TaskFormModal({
  open,
  onClose,
  onSaved,
  users,
  projects,
  clients,
  initialTask,
  defaultProjectId,
  defaultClientId,
}: TaskFormModalProps) {
  const isEditing = Boolean(initialTask);
  const [title, setTitle] = useState("");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("media");
  const [dueDate, setDueDate] = useState("");
  const [status, setStatus] = useState<TaskStatus>("a_fazer");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialTask) {
      setTitle(initialTask.title);
      setProjectId(initialTask.projectId ?? "");
      setClientId(initialTask.clientId ?? "");
      setAssigneeId(initialTask.assigneeId ?? "");
      setPriority(initialTask.priority);
      setDueDate(initialTask.dueDate?.slice(0, 10) ?? "");
      setStatus(initialTask.status);
      setDescription(initialTask.description ?? "");
    } else {
      setTitle("");
      setProjectId(defaultProjectId ?? "");
      setClientId(defaultClientId ?? "");
      setAssigneeId(users[0]?.id ?? "");
      setPriority("media");
      setDueDate("");
      setStatus("a_fazer");
      setDescription("");
    }
  }, [open, initialTask, defaultProjectId, defaultClientId, users]);

  function handleProjectChange(newProjectId: string) {
    setProjectId(newProjectId);
    if (newProjectId) {
      const found = projects.find((p) => p.id === newProjectId);
      if (found) setClientId(found.clientId);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = isEditing ? `/api/tasks/${initialTask!.id}` : "/api/tasks";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          projectId: projectId || null,
          clientId: clientId || null,
          assigneeId: assigneeId || null,
          priority,
          dueDate: dueDate || null,
          status,
          description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar tarefa");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão ao salvar tarefa.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Tarefa" : "Nova Tarefa"}
      description="Controle simples para tarefas internas ou vinculadas a projetos."
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Título da tarefa *
          </label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Configurar domínio e deploy na Vercel"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Projeto (opcional)
            </label>
            <select
              value={projectId}
              onChange={(e) => handleProjectChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Tarefa interna (sem projeto)</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.clientCompany ? ` — ${p.clientCompany}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Cliente (opcional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Sem cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Responsável
            </label>
            <select
              value={assigneeId}
              onChange={(e) => setAssigneeId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Sem responsável</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Prazo
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as TaskStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {TASK_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Prioridade
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {TASK_PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Descrição
          </label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Detalhes, checklist ou critérios de entrega..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
          >
            {saving
              ? "Salvando..."
              : isEditing
                ? "Salvar alterações"
                : "Criar Tarefa"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

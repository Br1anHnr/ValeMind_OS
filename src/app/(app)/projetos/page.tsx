"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { PROJECT_STATUSES, PROJECT_STATUS_MAP } from "@/lib/constants";
import type { ImportantLink, ProjectStatus } from "@/db/schema";
import {
  ensureExternalUrl,
  formatCurrency,
  formatDate,
  isProjectOverdue,
} from "@/lib/format";
import {
  ProjectFormModal,
  type ProjectFormData,
  type SimpleClient,
} from "@/components/ProjectFormModal";
import type { SimpleUser } from "@/components/LeadFormModal";

interface ProjectListItem extends ProjectFormData {
  clientCompany: string;
  clientName: string;
  ownerName: string | null;
  participants: { id: string; name: string }[];
}

export default function ProjetosPage() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectFormData | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (clientFilter !== "all") qs.set("clientId", clientFilter);
      if (ownerFilter !== "all") qs.set("ownerId", ownerFilter);

      const [projRes, clientsRes, usersRes] = await Promise.all([
        fetch(`/api/projects?${qs.toString()}`),
        fetch("/api/clients"),
        fetch("/api/users"),
      ]);

      if (!projRes.ok) throw new Error("Erro ao carregar projetos.");
      const projData = await projRes.json();
      setProjects(projData.projects ?? []);

      if (clientsRes.ok) {
        const cData = await clientsRes.json();
        setClients(cData.clients ?? []);
      }
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar projetos."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, clientFilter, ownerFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleQuickStatus(projectId: string, status: ProjectStatus) {
    setProjects((prev) =>
      prev.map((p) => (p.id === projectId ? { ...p, status } : p))
    );
    const res = await fetch(`/api/projects/${projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) loadData();
  }

  async function handleDelete(project: ProjectListItem) {
    if (!confirm(`Excluir o projeto "${project.name}"?`)) return;
    const res = await fetch(`/api/projects/${project.id}`, {
      method: "DELETE",
    });
    if (res.ok) loadData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Projetos
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Acompanhamento de entregas, prazos, valores e links técnicos por cliente.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingProject(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Novo Projeto
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar projeto, cliente ou próxima entrega..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os status</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
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
          Carregando projetos...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FolderKanban className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhum projeto cadastrado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre projetos já em operação (criando o cliente na hora, se ainda não existir) ou converta um lead no Pipeline.
          </p>
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEditingProject(null);
                setFormOpen(true);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              <Plus className="h-4 w-4" />
              Cadastrar projeto
            </button>
            <Link
              href="/comercial/pipeline"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Ir para Pipeline Comercial
            </Link>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Projeto / Cliente</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Prazo / Próx. Entrega</th>
                  <th className="px-4 py-3">Valor / Mensalidade</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {projects.map((p) => {
                  const st = PROJECT_STATUS_MAP[p.status];
                  const overdue = isProjectOverdue(p.dueDate, p.status);
                  return (
                    <tr
                      key={p.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <Link
                          href={`/projetos/${p.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {p.name}
                        </Link>
                        <div>
                          <Link
                            href={`/clientes/${p.clientId}`}
                            className="text-xs text-slate-500 hover:text-indigo-600 hover:underline"
                          >
                            {p.clientCompany}
                          </Link>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2">
                          {p.githubUrl ? (
                            <a
                              href={ensureExternalUrl(p.githubUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-slate-500 hover:text-indigo-600"
                            >
                              GitHub <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : null}
                          {p.productionUrl ? (
                            <a
                              href={ensureExternalUrl(p.productionUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-0.5 text-[11px] font-medium text-emerald-700 hover:underline"
                            >
                              Produção <ExternalLink className="h-2.5 w-2.5" />
                            </a>
                          ) : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <select
                          value={p.status}
                          onChange={(e) =>
                            handleQuickStatus(
                              p.id,
                              e.target.value as ProjectStatus
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none ${st.badgeClass}`}
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
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="flex items-center gap-1.5 text-xs">
                          {overdue ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 font-semibold text-rose-700">
                              <AlertTriangle className="h-3 w-3" />
                              {formatDate(p.dueDate)}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-700">
                              <Calendar className="h-3.5 w-3.5 text-slate-400" />
                              {formatDate(p.dueDate)}
                            </span>
                          )}
                        </div>
                        {p.nextDelivery ? (
                          <div className="mt-1 max-w-xs text-xs text-slate-500">
                            {p.nextDelivery}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs font-semibold text-slate-900">
                          {formatCurrency(p.soldValue)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {Number(p.monthlyFee ?? 0) > 0
                            ? `${formatCurrency(p.monthlyFee)}/mês`
                            : "Sem mensalidade"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs font-medium text-slate-700">
                          {p.ownerName || "Sem responsável"}
                        </div>
                        {p.participants.length > 1 ? (
                          <div className="text-[11px] text-slate-400">
                            +{p.participants.length - 1} participante(s)
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/projetos/${p.id}`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Abrir
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingProject({
                                id: p.id,
                                name: p.name,
                                clientId: p.clientId,
                                description: p.description,
                                ownerId: p.ownerId,
                                participants: p.participants,
                                status: p.status,
                                startDate: p.startDate,
                                dueDate: p.dueDate,
                                nextDelivery: p.nextDelivery,
                                soldValue: p.soldValue,
                                monthlyFee: p.monthlyFee,
                                githubUrl: p.githubUrl,
                                productionUrl: p.productionUrl,
                                importantLinks:
                                  (p.importantLinks as ImportantLink[]) ?? [],
                                notes: p.notes,
                              });
                              setFormOpen(true);
                            }}
                            title="Editar projeto"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(p)}
                            title="Excluir projeto"
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <ProjectFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        users={users}
        clients={clients}
        initialProject={editingProject}
      />
    </div>
  );
}

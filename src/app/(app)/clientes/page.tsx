"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  FolderKanban,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { CLIENT_STATUSES, CLIENT_STATUS_MAP } from "@/lib/constants";
import type { ClientStatus, ImportantLink } from "@/db/schema";
import { formatCurrency } from "@/lib/format";
import {
  ClientFormModal,
  type ClientFormData,
} from "@/components/ClientFormModal";
import type { SimpleUser } from "@/components/LeadFormModal";

interface ClientListItem extends ClientFormData {
  ownerName: string | null;
  projectCount: number;
  activeProjectCount: number;
  totalSoldValue: string;
  totalMonthlyFee: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClientesPage() {
  const [clients, setClients] = useState<ClientListItem[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<ClientFormData | null>(
    null
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (ownerFilter !== "all") qs.set("ownerId", ownerFilter);

      const [clientsRes, usersRes] = await Promise.all([
        fetch(`/api/clients?${qs.toString()}`),
        fetch("/api/users"),
      ]);

      if (!clientsRes.ok) throw new Error("Erro ao carregar clientes.");
      const clientsData = await clientsRes.json();
      setClients(clientsData.clients ?? []);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users ?? []);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar clientes."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, ownerFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleDelete(client: ClientListItem) {
    if (
      !confirm(
        `Excluir o cliente "${client.company}"? Projetos vinculados também serão removidos.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
    if (res.ok) {
      loadData();
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Clientes
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Visão completa de cada cliente, contatos, projetos vinculados e valores contratados.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditingClient(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Novo Cliente
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, nome do contato, e-mail ou telefone..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos os status</option>
            {CLIENT_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos responsáveis</option>
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
          Carregando clientes...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : clients.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Building2 className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhum cliente cadastrado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Converta um lead no Pipeline ou cadastre um cliente diretamente aqui.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setFormOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Cadastrar cliente
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa / Contato</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3">Projetos</th>
                  <th className="px-4 py-3">Contratado / MRR</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {clients.map((client) => {
                  const statusMeta =
                    CLIENT_STATUS_MAP[client.status as ClientStatus];
                  return (
                    <tr
                      key={client.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {client.company}
                        </Link>
                        <div className="text-xs text-slate-500">
                          {client.name}
                          {client.phone ? ` · ${client.phone}` : ""}
                        </div>
                        {client.email ? (
                          <div className="text-xs text-slate-400">
                            {client.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 align-top text-xs font-medium text-slate-700">
                        {client.ownerName || "Sem responsável"}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <Link
                          href={`/clientes/${client.id}`}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-indigo-600"
                        >
                          <FolderKanban className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {client.projectCount}{" "}
                            {client.projectCount === 1 ? "projeto" : "projetos"}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs font-semibold text-slate-900">
                          {formatCurrency(client.totalSoldValue)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          MRR: {formatCurrency(client.totalMonthlyFee)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/clientes/${client.id}`}
                            className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                          >
                            Abrir
                          </Link>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingClient({
                                id: client.id,
                                name: client.name,
                                company: client.company,
                                email: client.email,
                                phone: client.phone,
                                website: client.website,
                                instagram: client.instagram,
                                legalName: client.legalName ?? null,
                                document: client.document ?? null,
                                address: client.address ?? null,
                                representativeName:
                                  client.representativeName ?? null,
                                representativeCpf:
                                  client.representativeCpf ?? null,
                                ownerId: client.ownerId,
                                status: client.status,
                                importantLinks:
                                  (client.importantLinks as ImportantLink[]) ??
                                  [],
                                notes: client.notes,
                              });
                              setFormOpen(true);
                            }}
                            title="Editar cliente"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(client)}
                            title="Excluir cliente"
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

      <ClientFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        users={users}
        initialClient={editingClient}
      />
    </div>
  );
}

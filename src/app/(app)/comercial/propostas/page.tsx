"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Calendar,
  ExternalLink,
  FileText,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import { PROPOSAL_STATUSES, PROPOSAL_STATUS_MAP } from "@/lib/constants";
import type { ProposalStatus } from "@/db/schema";
import {
  ensureExternalUrl,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import {
  ProposalFormModal,
  type ProposalRecord,
  type SimpleLead,
} from "@/components/ProposalFormModal";
import type { SimpleUser } from "@/components/LeadFormModal";
import type { SimpleClient } from "@/components/ProjectFormModal";

export default function PropostasPage() {
  const [proposals, setProposals] = useState<ProposalRecord[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [leads, setLeads] = useState<SimpleLead[]>([]);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ProposalRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (ownerFilter !== "all") qs.set("ownerId", ownerFilter);

      const [propRes, usersRes, leadsRes, clientsRes] = await Promise.all([
        fetch(`/api/proposals?${qs.toString()}`),
        fetch("/api/users"),
        fetch("/api/leads"),
        fetch("/api/clients"),
      ]);

      if (!propRes.ok) throw new Error("Erro ao carregar propostas.");
      const propJson = await propRes.json();
      setProposals(propJson.proposals ?? []);

      if (usersRes.ok) setUsers((await usersRes.json()).users ?? []);
      if (leadsRes.ok) setLeads((await leadsRes.json()).leads ?? []);
      if (clientsRes.ok) setClients((await clientsRes.json()).clients ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar propostas."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, ownerFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleQuickStatus(id: string, status: ProposalStatus) {
    setProposals((prev) =>
      prev.map((p) => (p.id === id ? { ...p, status } : p))
    );
    const res = await fetch(`/api/proposals/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) loadData();
  }

  async function handleDelete(item: ProposalRecord) {
    if (!confirm(`Excluir a proposta "${item.title}"?`)) return;
    const res = await fetch(`/api/proposals/${item.id}`, { method: "DELETE" });
    if (res.ok) loadData();
  }

  const openProposalsValue = proposals
    .filter(
      (p) =>
        p.status === "enviada" ||
        p.status === "em_negociacao" ||
        p.status === "rascunho"
    )
    .reduce((acc, p) => acc + Number(p.totalValue ?? 0), 0);

  const approvedProposalsValue = proposals
    .filter((p) => p.status === "aprovada")
    .reduce((acc, p) => acc + Number(p.totalValue ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Propostas Comerciais
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Controle de propostas enviadas, valores, mensalidades e aprovação integrada ao funil.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Nova Proposta
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">Total de propostas</p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {proposals.length}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Em aberto / negociação
          </p>
          <p className="mt-1 text-2xl font-bold text-indigo-700">
            {formatCurrency(openProposalsValue)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <p className="text-xs font-medium text-slate-500">
            Propostas aprovadas
          </p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {formatCurrency(approvedProposalsValue)}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proposta, escopo, lead ou cliente..."
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
            {PROPOSAL_STATUSES.map((s) => (
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
          Carregando propostas...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileText className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhuma proposta cadastrada
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Crie propostas comerciais vinculadas aos leads do pipeline para acompanhar valores e aprovações.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Criar primeira proposta
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Proposta / Vínculo</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Valores</th>
                  <th className="px-4 py-3">Envio / Validade</th>
                  <th className="px-4 py-3">Responsável</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {proposals.map((prop) => {
                  const st = PROPOSAL_STATUS_MAP[prop.status];
                  return (
                    <tr key={prop.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {prop.title}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          {prop.leadCompany ? (
                            <Link
                              href={`/comercial/leads?q=${encodeURIComponent(prop.leadCompany)}`}
                              className="hover:text-indigo-600 hover:underline"
                            >
                              Lead: {prop.leadCompany}
                            </Link>
                          ) : null}
                          {prop.clientId && prop.clientCompany ? (
                            <Link
                              href={`/clientes/${prop.clientId}`}
                              className="text-indigo-600 hover:underline"
                            >
                              Cliente: {prop.clientCompany}
                            </Link>
                          ) : null}
                        </div>
                        {prop.documentUrl ? (
                          <a
                            href={ensureExternalUrl(prop.documentUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:underline"
                          >
                            Abrir documento
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <select
                          value={prop.status}
                          onChange={(e) =>
                            handleQuickStatus(
                              prop.id,
                              e.target.value as ProposalStatus
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none ${st.badgeClass}`}
                        >
                          {PROPOSAL_STATUSES.map((opt) => (
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
                        <div className="font-semibold text-slate-900">
                          {formatCurrency(prop.totalValue)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {Number(prop.setupValue ?? 0) > 0
                            ? `Implant.: ${formatCurrency(prop.setupValue)}`
                            : null}
                          {Number(prop.setupValue ?? 0) > 0 &&
                          Number(prop.monthlyFee ?? 0) > 0
                            ? " · "
                            : null}
                          {Number(prop.monthlyFee ?? 0) > 0
                            ? `${formatCurrency(prop.monthlyFee)}/mês`
                            : null}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-xs text-slate-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-slate-400" />
                          Envio: {formatDate(prop.sentAt)}
                        </div>
                        {prop.validUntil ? (
                          <div className="mt-0.5 text-slate-400">
                            Validade: {formatDate(prop.validUntil)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top text-xs font-medium text-slate-700">
                        {prop.ownerName || "Sem responsável"}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditing(prop);
                              setFormOpen(true);
                            }}
                            title="Editar proposta"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(prop)}
                            title="Excluir proposta"
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

      <ProposalFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        users={users}
        leads={leads}
        clients={clients}
        initialProposal={editing}
      />
    </div>
  );
}

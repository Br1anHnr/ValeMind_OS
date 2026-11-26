"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Calendar,
  ExternalLink,
  KanbanSquare,
  Pencil,
  Plus,
  Search,
  Target,
  Trash2,
} from "lucide-react";
import { LEAD_SOURCES, LEAD_STAGES, LEAD_STAGE_MAP } from "@/lib/constants";
import type { LeadStage } from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  LeadFormModal,
  type LeadRecord,
  type SimpleUser,
} from "@/components/LeadFormModal";
import { ConvertLeadModal } from "@/components/ConvertLeadModal";

export default function LeadsPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [ownerFilter, setOwnerFilter] = useState("all");
  const [sourceFilter, setSourceFilter] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<LeadRecord | null>(null);
  const [convertingLead, setConvertingLead] = useState<LeadRecord | null>(null);

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
      if (search.trim()) qs.set("search", search.trim());
      if (stageFilter !== "all") qs.set("stage", stageFilter);
      if (ownerFilter !== "all") qs.set("ownerId", ownerFilter);
      if (sourceFilter !== "all") qs.set("source", sourceFilter);

      const [leadsRes, usersRes] = await Promise.all([
        fetch(`/api/leads?${qs.toString()}`),
        fetch("/api/users"),
      ]);

      if (!leadsRes.ok) throw new Error("Não foi possível carregar os leads.");
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads ?? []);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar leads.");
    } finally {
      setLoading(false);
    }
  }, [search, stageFilter, ownerFilter, sourceFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function handleQuickStageChange(leadId: string, newStage: LeadStage) {
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stage: newStage } : l))
    );
    const res = await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: newStage }),
    });
    if (!res.ok) {
      loadData();
    }
  }

  async function handleDelete(lead: LeadRecord) {
    if (!confirm(`Excluir o lead "${lead.company}"? Esta ação não pode ser desfeita.`)) {
      return;
    }
    const res = await fetch(`/api/leads/${lead.id}`, { method: "DELETE" });
    if (res.ok) {
      loadData();
    }
  }

  const totalPotential = leads
    .filter((l) => l.stage !== "perdido")
    .reduce((acc, l) => acc + Number(l.potentialValue ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Leads
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Prospecção comercial, follow-ups e conversão em Cliente + Projeto.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/comercial/pipeline"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <KanbanSquare className="h-4 w-4 text-slate-500" />
            Ver Pipeline
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-5">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar empresa, contato, e-mail ou próxima ação..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-2">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Etapas</option>
            {LEAD_STAGES.map((st) => (
              <option key={st.value} value={st.value}>
                {st.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={ownerFilter}
            onChange={(e) => setOwnerFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Todos responsáveis</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-2">
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="all">Origens</option>
            {LEAD_SOURCES.map((src) => (
              <option key={src} value={src}>
                {src}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
        <span>
          <strong className="text-slate-900">{leads.length}</strong>{" "}
          {leads.length === 1 ? "lead encontrado" : "leads encontrados"}
        </span>
        <span>
          Potencial somado (exceto perdidos):{" "}
          <strong className="text-slate-900">
            {formatCurrency(totalPotential)}
          </strong>
        </span>
      </div>

      {/* Table / States */}
      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Carregando leads do banco...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : leads.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Target className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhum lead cadastrado
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Cadastre o primeiro lead para começar a acompanhar o funil comercial da ValeMind.
          </p>
          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setFormOpen(true);
            }}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Cadastrar primeiro lead
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Empresa / Contato</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Valor potencial</th>
                  <th className="px-4 py-3">Próxima ação / Follow-up</th>
                  <th className="px-4 py-3">Responsável / Origem</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {leads.map((lead) => {
                  const stageMeta = LEAD_STAGE_MAP[lead.stage];
                  return (
                    <tr
                      key={lead.id}
                      className="transition hover:bg-slate-50/70"
                    >
                      <td className="px-4 py-3.5 align-top">
                        <div className="font-semibold text-slate-900">
                          {lead.company}
                        </div>
                        <div className="text-xs text-slate-500">
                          {lead.contactName}
                          {lead.phone ? ` · ${lead.phone}` : ""}
                        </div>
                        {lead.email ? (
                          <div className="text-xs text-slate-400">
                            {lead.email}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <select
                          value={lead.stage}
                          onChange={(e) =>
                            handleQuickStageChange(
                              lead.id,
                              e.target.value as LeadStage
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none ${stageMeta.badgeClass}`}
                        >
                          {LEAD_STAGES.map((st) => (
                            <option
                              key={st.value}
                              value={st.value}
                              className="bg-white text-slate-900"
                            >
                              {st.label}
                            </option>
                          ))}
                        </select>
                        {lead.convertedClientId ? (
                          <Link
                            href={`/clientes/${lead.convertedClientId}`}
                            className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                          >
                            Convertido em cliente
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top font-medium text-slate-900">
                        {lead.potentialValue
                          ? formatCurrency(lead.potentialValue)
                          : "—"}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="max-w-xs text-xs text-slate-700">
                          {lead.nextAction || "—"}
                        </div>
                        {lead.nextFollowUpAt ? (
                          <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(lead.nextFollowUpAt)}
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <div className="text-xs font-medium text-slate-700">
                          {lead.ownerName || "Sem responsável"}
                        </div>
                        <div className="text-xs text-slate-400">
                          {lead.source || "Origem não informada"}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {!lead.convertedClientId ? (
                            <button
                              type="button"
                              onClick={() => setConvertingLead(lead)}
                              title="Converter em Cliente + Projeto"
                              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-100"
                            >
                              <ArrowRightLeft className="h-3.5 w-3.5" />
                              Converter
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLead(lead);
                              setFormOpen(true);
                            }}
                            title="Editar lead"
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(lead)}
                            title="Excluir lead"
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

      <LeadFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        users={users}
        initialLead={editingLead}
      />

      <ConvertLeadModal
        open={Boolean(convertingLead)}
        onClose={() => setConvertingLead(null)}
        onConverted={loadData}
        lead={convertingLead}
        users={users}
      />
    </div>
  );
}

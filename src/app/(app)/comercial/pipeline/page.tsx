"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRightLeft,
  Calendar,
  ExternalLink,
  List,
  Plus,
  Search,
  User,
} from "lucide-react";
import { LEAD_STAGES } from "@/lib/constants";
import type { LeadStage } from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  LeadFormModal,
  type LeadRecord,
  type SimpleUser,
} from "@/components/LeadFormModal";
import { ConvertLeadModal } from "@/components/ConvertLeadModal";

export default function PipelinePage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("all");

  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverStage, setDragOverStage] = useState<LeadStage | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [defaultStage, setDefaultStage] = useState<LeadStage>("identificado");
  const [editingLead, setEditingLead] = useState<LeadRecord | null>(null);
  const [convertingLead, setConvertingLead] = useState<LeadRecord | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (ownerFilter !== "all") qs.set("ownerId", ownerFilter);

      const [leadsRes, usersRes] = await Promise.all([
        fetch(`/api/leads?${qs.toString()}`),
        fetch("/api/users"),
      ]);

      if (!leadsRes.ok) throw new Error("Erro ao carregar pipeline.");
      const leadsData = await leadsRes.json();
      setLeads(leadsData.leads ?? []);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData.users ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar pipeline.");
    } finally {
      setLoading(false);
    }
  }, [search, ownerFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  async function moveLeadToStage(leadId: string, newStage: LeadStage) {
    const current = leads.find((l) => l.id === leadId);
    if (!current || current.stage === newStage) return;

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

  const openPipelineValue = leads
    .filter((l) => l.stage !== "fechado" && l.stage !== "perdido")
    .reduce((acc, l) => acc + Number(l.potentialValue ?? 0), 0);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Pipeline Comercial
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Arraste os cards entre etapas ou converta negócios fechados direto em Cliente + Projeto.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/comercial/leads"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs transition hover:bg-slate-50"
          >
            <List className="h-4 w-4 text-slate-500" />
            Ver Lista
          </Link>
          <button
            type="button"
            onClick={() => {
              setEditingLead(null);
              setDefaultStage("identificado");
              setFormOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filters & Open Value */}
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filtrar cards por empresa ou contato..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <select
          value={ownerFilter}
          onChange={(e) => setOwnerFilter(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none sm:w-52"
        >
          <option value="all">Todos responsáveis</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <div className="rounded-xl bg-indigo-50 px-3.5 py-2 text-sm">
          <span className="text-indigo-700">Pipeline aberto: </span>
          <strong className="text-indigo-950">
            {formatCurrency(openPipelineValue)}
          </strong>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Carregando pipeline...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : (
        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-4">
          {LEAD_STAGES.map((stage) => {
            const stageLeads = leads.filter((l) => l.stage === stage.value);
            const stageSum = stageLeads.reduce(
              (acc, l) => acc + Number(l.potentialValue ?? 0),
              0
            );
            const isOver = dragOverStage === stage.value;

            return (
              <div
                key={stage.value}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverStage(stage.value);
                }}
                onDragLeave={() => {
                  if (dragOverStage === stage.value) setDragOverStage(null);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || draggedId;
                  setDragOverStage(null);
                  setDraggedId(null);
                  if (id) moveLeadToStage(id, stage.value);
                }}
                className={`flex w-72 shrink-0 flex-col rounded-2xl border transition ${
                  isOver
                    ? "border-indigo-400 bg-indigo-50/50 ring-2 ring-indigo-500/20"
                    : "border-slate-200 bg-slate-100/70"
                }`}
              >
                {/* Column Header */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-200/80 px-3.5 py-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${stage.dotClass}`}
                      />
                      <h2 className="truncate text-sm font-semibold text-slate-900">
                        {stage.label}
                      </h2>
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold text-slate-600 shadow-2xs">
                        {stageLeads.length}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-medium text-slate-500">
                      {formatCurrency(stageSum)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingLead(null);
                      setDefaultStage(stage.value);
                      setFormOpen(true);
                    }}
                    title={`Adicionar lead em ${stage.label}`}
                    className="rounded-lg p-1 text-slate-400 transition hover:bg-white hover:text-slate-700"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Cards */}
                <div className="flex-1 space-y-2.5 p-2.5">
                  {stageLeads.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-xs text-slate-400">
                      Arraste um lead aqui
                    </div>
                  ) : (
                    stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        draggable
                        onDragStart={(e) => {
                          setDraggedId(lead.id);
                          e.dataTransfer.setData("text/plain", lead.id);
                        }}
                        onDragEnd={() => {
                          setDraggedId(null);
                          setDragOverStage(null);
                        }}
                        className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs transition hover:border-indigo-300 hover:shadow-sm active:cursor-grabbing ${
                          draggedId === lead.id ? "opacity-50" : ""
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingLead(lead);
                              setFormOpen(true);
                            }}
                            className="text-left"
                          >
                            <p className="text-sm font-semibold text-slate-900 hover:text-indigo-600">
                              {lead.company}
                            </p>
                            <p className="text-xs text-slate-500">
                              {lead.contactName}
                            </p>
                          </button>
                          {lead.potentialValue ? (
                            <span className="shrink-0 rounded-lg bg-slate-50 px-2 py-0.5 text-xs font-semibold text-slate-800">
                              {formatCurrency(lead.potentialValue)}
                            </span>
                          ) : null}
                        </div>

                        {lead.nextAction ? (
                          <p className="mt-2 line-clamp-2 text-xs text-slate-600">
                            {lead.nextAction}
                          </p>
                        ) : null}

                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {lead.ownerName || "Sem resp."}
                          </span>
                          {lead.nextFollowUpAt ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(lead.nextFollowUpAt)}
                            </span>
                          ) : null}
                        </div>

                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                          <select
                            aria-label="Mover etapa"
                            value={lead.stage}
                            onChange={(e) =>
                              moveLeadToStage(
                                lead.id,
                                e.target.value as LeadStage
                              )
                            }
                            className="max-w-[130px] rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 focus:border-indigo-500 focus:outline-none"
                          >
                            {LEAD_STAGES.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>

                          {lead.convertedClientId ? (
                            <Link
                              href={`/clientes/${lead.convertedClientId}`}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline"
                            >
                              Ver Cliente
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConvertingLead(lead)}
                              className={`inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold transition ${
                                lead.stage === "fechado"
                                  ? "bg-emerald-600 text-white hover:bg-emerald-500"
                                  : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                              }`}
                            >
                              <ArrowRightLeft className="h-3 w-3" />
                              Converter
                            </button>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <LeadFormModal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={loadData}
        users={users}
        initialLead={editingLead}
        defaultStage={defaultStage}
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

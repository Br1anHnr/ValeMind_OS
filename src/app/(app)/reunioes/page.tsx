"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  Building2,
  Calendar,
  CheckCircle2,
  FolderKanban,
  MessageSquareText,
  Pencil,
  Plus,
  Search,
  Trash2,
  Users,
} from "lucide-react";
import { MEETING_TYPES } from "@/lib/constants";
import type { MeetingType } from "@/db/schema";
import { formatDate, formatDateTime, toDateInputValue } from "@/lib/format";
import { Modal } from "@/components/Modal";
import type { SimpleClient } from "@/components/ProjectFormModal";
import type { SimpleProject } from "@/components/TaskFormModal";

interface MeetingItem {
  id: string;
  title: string;
  meetingDate: string;
  meetingType: MeetingType;
  clientId: string | null;
  clientCompany: string | null;
  projectId: string | null;
  projectName: string | null;
  participants: string | null;
  topicsDiscussed: string | null;
  decisions: string | null;
  nextActions: string | null;
  responsibles: string | null;
  dueDate: string | null;
  notes: string | null;
  createdByName: string | null;
}

export default function ReunioesPage() {
  const [meetings, setMeetings] = useState<MeetingItem[]>([]);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [clientFilter, setClientFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MeetingItem | null>(null);
  const [title, setTitle] = useState("");
  const [meetingDate, setMeetingDate] = useState("");
  const [meetingType, setMeetingType] = useState<MeetingType>("cliente");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [participants, setParticipants] = useState("");
  const [topicsDiscussed, setTopicsDiscussed] = useState("");
  const [decisions, setDecisions] = useState("");
  const [nextActions, setNextActions] = useState("");
  const [responsibles, setResponsibles] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("q");
    if (q) setSearch(q);
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (typeFilter !== "all") qs.set("meetingType", typeFilter);
      if (clientFilter !== "all") qs.set("clientId", clientFilter);

      const [mRes, cRes, pRes] = await Promise.all([
        fetch(`/api/meetings?${qs.toString()}`),
        fetch("/api/clients"),
        fetch("/api/projects"),
      ]);

      if (!mRes.ok) throw new Error("Erro ao carregar reuniões.");
      setMeetings((await mRes.json()).meetings ?? []);
      if (cRes.ok) setClients((await cRes.json()).clients ?? []);
      if (pRes.ok) setProjects((await pRes.json()).projects ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar reuniões."
      );
    } finally {
      setLoading(false);
    }
  }, [search, typeFilter, clientFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  function openNew() {
    setFormError(null);
    setEditing(null);
    setTitle("");
    setMeetingDate(new Date().toISOString().slice(0, 10));
    setMeetingType("cliente");
    setClientId("");
    setProjectId("");
    setParticipants("");
    setTopicsDiscussed("");
    setDecisions("");
    setNextActions("");
    setResponsibles("");
    setDueDate("");
    setNotes("");
    setModalOpen(true);
  }

  function openEdit(item: MeetingItem) {
    setFormError(null);
    setEditing(item);
    setTitle(item.title);
    setMeetingDate(toDateInputValue(item.meetingDate));
    setMeetingType(item.meetingType);
    setClientId(item.clientId ?? "");
    setProjectId(item.projectId ?? "");
    setParticipants(item.participants ?? "");
    setTopicsDiscussed(item.topicsDiscussed ?? "");
    setDecisions(item.decisions ?? "");
    setNextActions(item.nextActions ?? "");
    setResponsibles(item.responsibles ?? "");
    setDueDate(item.dueDate?.slice(0, 10) ?? "");
    setNotes(item.notes ?? "");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const url = editing ? `/api/meetings/${editing.id}` : "/api/meetings";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          meetingDate,
          meetingType,
          clientId: clientId || null,
          projectId: projectId || null,
          participants,
          topicsDiscussed,
          decisions,
          nextActions,
          responsibles,
          dueDate: dueDate || null,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Erro ao salvar reunião");
        return;
      }
      setModalOpen(false);
      loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: MeetingItem) {
    if (!confirm(`Excluir o registro da reunião "${item.title}"?`)) return;
    const res = await fetch(`/api/meetings/${item.id}`, { method: "DELETE" });
    if (res.ok) loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Reuniões e Decisões
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Atas internas e com clientes, decisões tomadas e próximas ações vinculadas aos projetos.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Registrar Reunião
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar título, assuntos, decisões ou cliente..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Internas e com clientes</option>
            {MEETING_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={clientFilter}
            onChange={(e) => setClientFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Todos os clientes</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.company}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Carregando reuniões...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <MessageSquareText className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhuma reunião registrada
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Documente reuniões semanais internas e alinhamentos com clientes para manter o histórico de decisões.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Registrar primeira reunião
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {meetings.map((m) => (
            <article
              key={m.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900">
                      {m.title}
                    </h2>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        m.meetingType === "interna"
                          ? "bg-slate-100 text-slate-700"
                          : "bg-indigo-50 text-indigo-700"
                      }`}
                    >
                      {m.meetingType === "interna" ? "Interna" : "Cliente"}
                    </span>
                  </div>

                  <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDateTime(m.meetingDate)}
                    </span>
                    {m.clientId && m.clientCompany ? (
                      <Link
                        href={`/clientes/${m.clientId}`}
                        className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                      >
                        <Building2 className="h-3.5 w-3.5" />
                        {m.clientCompany}
                      </Link>
                    ) : null}
                    {m.projectId && m.projectName ? (
                      <Link
                        href={`/projetos/${m.projectId}`}
                        className="inline-flex items-center gap-1 font-medium text-emerald-700 hover:underline"
                      >
                        <FolderKanban className="h-3.5 w-3.5" />
                        {m.projectName}
                      </Link>
                    ) : null}
                    {m.participants ? (
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {m.participants}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => openEdit(m)}
                    className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(m)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                {m.topicsDiscussed ? (
                  <div className="rounded-xl bg-slate-50 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      Assuntos discutidos
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-slate-700">
                      {m.topicsDiscussed}
                    </p>
                  </div>
                ) : null}
                {m.decisions ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                    <p className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-800">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Decisões tomadas
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-emerald-950">
                      {m.decisions}
                    </p>
                  </div>
                ) : null}
                {m.nextActions ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-3.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">
                      Próximas ações
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-xs text-amber-950">
                      {m.nextActions}
                    </p>
                    {m.responsibles || m.dueDate ? (
                      <p className="mt-2 text-[11px] font-medium text-amber-800">
                        {m.responsibles ? `Resp.: ${m.responsibles}` : ""}
                        {m.responsibles && m.dueDate ? " · " : ""}
                        {m.dueDate ? `Prazo: ${formatDate(m.dueDate)}` : ""}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Reunião" : "Registrar Reunião e Decisões"}
        description="As decisões registradas ficam vinculadas automaticamente ao cliente e ao projeto."
        size="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Título / Pauta principal *
              </label>
              <input
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex.: Alinhamento Semanal ValeMind / Kickoff Real Mercado"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Data *
              </label>
              <input
                required
                type="date"
                value={meetingDate}
                onChange={(e) => setMeetingDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tipo
              </label>
              <select
                value={meetingType}
                onChange={(e) => setMeetingType(e.target.value as MeetingType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {MEETING_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Projeto vinculado
              </label>
              <select
                value={projectId}
                onChange={(e) => {
                  const val = e.target.value;
                  setProjectId(val);
                  const found = projects.find((p) => p.id === val);
                  if (found) setClientId(found.clientId);
                }}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Sem projeto</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Cliente vinculado
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Sem cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Participantes
              </label>
              <input
                value={participants}
                onChange={(e) => setParticipants(e.target.value)}
                placeholder="Ex.: Brian, Fabio, João (Real Mercado)"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Assuntos discutidos
            </label>
            <textarea
              rows={2}
              value={topicsDiscussed}
              onChange={(e) => setTopicsDiscussed(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Decisões tomadas
            </label>
            <textarea
              rows={2}
              value={decisions}
              onChange={(e) => setDecisions(e.target.value)}
              placeholder="Liste claramente o que ficou decidido..."
              className="w-full rounded-xl border border-emerald-200 bg-emerald-50/30 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Próximas ações
            </label>
            <textarea
              rows={2}
              value={nextActions}
              onChange={(e) => setNextActions(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Responsáveis
              </label>
              <input
                value={responsibles}
                onChange={(e) => setResponsibles(e.target.value)}
                placeholder="Ex.: Brian / Fabio"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Prazo das ações
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="sticky bottom-0 -mx-6 -mb-5 flex justify-end gap-2 border-t border-slate-100 bg-white px-6 py-3.5">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar Reunião"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  CheckCircle2,
  CreditCard,
  FileSpreadsheet,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Wallet,
} from "lucide-react";
import {
  FINANCIAL_ENTRY_TYPES,
  FINANCIAL_STATUSES,
  FINANCIAL_STATUS_MAP,
  PAYMENT_METHODS,
} from "@/lib/constants";
import type { FinancialEntryType, FinancialStatus } from "@/db/schema";
import { formatCurrency, formatDate } from "@/lib/format";
import { Modal } from "@/components/Modal";
import type { SimpleClient } from "@/components/ProjectFormModal";
import type { SimpleProject } from "@/components/TaskFormModal";

interface FinancialEntryItem {
  id: string;
  clientId: string;
  clientCompany: string;
  projectId: string | null;
  projectName: string | null;
  description: string;
  entryType: FinancialEntryType;
  referenceMonth: string | null;
  amount: string;
  dueDate: string;
  paidAt: string | null;
  status: FinancialStatus;
  paymentMethod: string | null;
  notes: string | null;
}

interface ContractItem {
  id: string;
  projectId: string;
  projectName: string;
  projectStatus: string;
  clientId: string;
  clientCompany: string;
  totalSoldValue: string | null;
  setupValue: string | null;
  monthlyFee: string | null;
  billingStartDate: string | null;
  dueDay: number;
  paymentMethod: string | null;
  installmentsCount: number;
  active: boolean;
  notes: string | null;
}

interface FinanceSummary {
  receivedThisMonth: number;
  totalReceivedAllTime: number;
  forecastThisMonth: number;
  futureForecast: number;
  pendingAmount: number;
  overdueAmount: number;
  mrr: number;
  oneTimeReceived: number;
  recurringReceived: number;
  oneTimeTotal: number;
  recurringTotal: number;
  byProject: {
    projectId: string;
    projectName: string;
    clientCompany: string;
    received: number;
    receivable: number;
    monthlyFee: number;
  }[];
}

export default function FinanceiroPage() {
  const [tab, setTab] = useState<"entries" | "contracts" | "projects">("entries");
  const [entries, setEntries] = useState<FinancialEntryItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [summary, setSummary] = useState<FinanceSummary | null>(null);
  const [clients, setClients] = useState<SimpleClient[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Entry modal
  const [entryModalOpen, setEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinancialEntryItem | null>(null);
  const [eClientId, setEClientId] = useState("");
  const [eProjectId, setEProjectId] = useState("");
  const [eDescription, setEDescription] = useState("");
  const [eType, setEType] = useState<FinancialEntryType>("pontual");
  const [eAmount, setEAmount] = useState("");
  const [eDueDate, setEDueDate] = useState("");
  const [ePaidAt, setEPaidAt] = useState("");
  const [eStatus, setEStatus] = useState<FinancialStatus>("pendente");
  const [eMethod, setEMethod] = useState("PIX");
  const [eNotes, setENotes] = useState("");
  const [savingEntry, setSavingEntry] = useState(false);

  // Contract modal
  const [contractModalOpen, setContractModalOpen] = useState(false);
  const [cProjectId, setCProjectId] = useState("");
  const [cTotalSold, setCTotalSold] = useState("");
  const [cSetup, setCSetup] = useState("");
  const [cMonthly, setCMonthly] = useState("");
  const [cStartDate, setCStartDate] = useState("");
  const [cDueDay, setCDueDay] = useState("10");
  const [cMethod, setCMethod] = useState("PIX");
  const [cInstallments, setCInstallments] = useState("1");
  const [cActive, setCActive] = useState(true);
  const [cGenerateInstallments, setCGenerateInstallments] = useState(false);
  const [cNotes, setCNotes] = useState("");
  const [savingContract, setSavingContract] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "all") qs.set("status", statusFilter);
      if (typeFilter !== "all") qs.set("entryType", typeFilter);

      const [finRes, clientsRes, projRes] = await Promise.all([
        fetch(`/api/financial?${qs.toString()}`),
        fetch("/api/clients"),
        fetch("/api/projects"),
      ]);

      if (!finRes.ok) throw new Error("Erro ao carregar financeiro.");
      const finData = await finRes.json();
      setEntries(finData.entries ?? []);
      setContracts(finData.contracts ?? []);
      setSummary(finData.summary ?? null);

      if (clientsRes.ok) setClients((await clientsRes.json()).clients ?? []);
      if (projRes.ok) setProjects((await projRes.json()).projects ?? []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar financeiro."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, typeFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  function openNewEntry() {
    setFormError(null);
    setEditingEntry(null);
    setEClientId(clients[0]?.id ?? "");
    setEProjectId("");
    setEDescription("");
    setEType("pontual");
    setEAmount("");
    setEDueDate(new Date().toISOString().slice(0, 10));
    setEPaidAt("");
    setEStatus("pendente");
    setEMethod("PIX");
    setENotes("");
    setEntryModalOpen(true);
  }

  function openEditEntry(entry: FinancialEntryItem) {
    setFormError(null);
    setEditingEntry(entry);
    setEClientId(entry.clientId);
    setEProjectId(entry.projectId ?? "");
    setEDescription(entry.description);
    setEType(entry.entryType);
    setEAmount(entry.amount);
    setEDueDate(entry.dueDate?.slice(0, 10) ?? "");
    setEPaidAt(entry.paidAt?.slice(0, 10) ?? "");
    setEStatus(entry.status);
    setEMethod(entry.paymentMethod ?? "PIX");
    setENotes(entry.notes ?? "");
    setEntryModalOpen(true);
  }

  function openContractModal(existing?: ContractItem) {
    setFormError(null);
    if (existing) {
      setCProjectId(existing.projectId);
      setCTotalSold(existing.totalSoldValue ?? "");
      setCSetup(existing.setupValue ?? "");
      setCMonthly(existing.monthlyFee ?? "");
      setCStartDate(
        existing.billingStartDate?.slice(0, 10) ??
          new Date().toISOString().slice(0, 10)
      );
      setCDueDay(String(existing.dueDay ?? 10));
      setCMethod(existing.paymentMethod ?? "PIX");
      setCInstallments(String(existing.installmentsCount ?? 1));
      setCActive(existing.active);
      setCGenerateInstallments(false);
      setCNotes(existing.notes ?? "");
    } else {
      setCProjectId(projects[0]?.id ?? "");
      setCTotalSold("");
      setCSetup("");
      setCMonthly("");
      setCStartDate(new Date().toISOString().slice(0, 10));
      setCDueDay("10");
      setCMethod("PIX");
      setCInstallments("1");
      setCActive(true);
      setCGenerateInstallments(true);
      setCNotes("");
    }
    setContractModalOpen(true);
  }

  async function handleSaveEntry(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSavingEntry(true);
    try {
      const url = editingEntry
        ? `/api/financial/${editingEntry.id}`
        : "/api/financial";
      const method = editingEntry ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId: eClientId,
          projectId: eProjectId || null,
          description: eDescription,
          entryType: eType,
          amount: eAmount,
          dueDate: eDueDate,
          paidAt: ePaidAt || null,
          status: eStatus,
          paymentMethod: eMethod || null,
          notes: eNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Erro ao salvar lançamento");
        return;
      }
      setEntryModalOpen(false);
      loadData();
    } finally {
      setSavingEntry(false);
    }
  }

  async function handleSaveContract(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSavingContract(true);
    try {
      const res = await fetch("/api/financial/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: cProjectId,
          totalSoldValue: cTotalSold || null,
          setupValue: cSetup || null,
          monthlyFee: cMonthly || null,
          billingStartDate: cStartDate || null,
          dueDay: Number(cDueDay) || 10,
          paymentMethod: cMethod || null,
          installmentsCount: Number(cInstallments) || 1,
          active: cActive,
          generateInstallments: cGenerateInstallments,
          notes: cNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Erro ao salvar contrato");
        return;
      }
      setContractModalOpen(false);
      loadData();
    } finally {
      setSavingContract(false);
    }
  }

  async function handleQuickStatus(id: string, status: FinancialStatus) {
    const res = await fetch(`/api/financial/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) loadData();
  }

  async function handleDeleteEntry(entry: FinancialEntryItem) {
    if (!confirm(`Excluir o lançamento "${entry.description}"?`)) return;
    const res = await fetch(`/api/financial/${entry.id}`, { method: "DELETE" });
    if (res.ok) loadData();
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Financeiro Gerencial
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Contratos dos projetos, recebimentos, geração automática de mensalidades e MRR.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => openContractModal()}
            disabled={projects.length === 0}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-xs hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-4 w-4 text-indigo-600" />
            Configurar Contrato
          </button>
          <button
            type="button"
            onClick={openNewEntry}
            disabled={clients.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Novo Recebimento
          </button>
        </div>
      </div>

      {/* KPIs Reais */}
      {summary ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Recebido no mês</p>
            <p className="mt-1.5 text-lg font-bold text-emerald-700">
              {formatCurrency(summary.receivedThisMonth)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Total geral: {formatCurrency(summary.totalReceivedAllTime)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Previsto no mês</p>
            <p className="mt-1.5 text-lg font-bold text-slate-900">
              {formatCurrency(summary.forecastThisMonth)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Futuro: {formatCurrency(summary.futureForecast)}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Pendentes</p>
            <p className="mt-1.5 text-lg font-bold text-amber-700">
              {formatCurrency(summary.pendingAmount)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Previstos + pendentes
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">Atrasados</p>
            <p className="mt-1.5 text-lg font-bold text-rose-700">
              {formatCurrency(summary.overdueAmount)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Vencidos não pagos
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">MRR Ativo</p>
            <p className="mt-1.5 text-lg font-bold text-indigo-700">
              {formatCurrency(summary.mrr)}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Recorrência mensal
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
            <p className="text-xs font-medium text-slate-500">
              Pontual × Recorrente
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-800">
              Pontual: {formatCurrency(summary.oneTimeReceived)}
            </p>
            <p className="mt-0.5 text-xs font-semibold text-emerald-700">
              Recorr.: {formatCurrency(summary.recurringReceived)}
            </p>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "entries" as const, label: `Recebimentos (${entries.length})` },
          { id: "contracts" as const, label: `Contratos (${contracts.length})` },
          {
            id: "projects" as const,
            label: `Receita por Projeto (${summary?.byProject.length ?? 0})`,
          },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`rounded-xl px-3.5 py-2 text-sm font-medium transition ${
              tab === t.id
                ? "bg-slate-900 text-white"
                : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Sincronizando lançamentos e recorrências no Neon...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : tab === "entries" ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
            <div className="relative md:col-span-6">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar descrição, cliente ou projeto..."
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
                {FINANCIAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="md:col-span-3">
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">Pontual + Recorrente</option>
                {FINANCIAL_ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {entries.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Wallet className="mx-auto h-10 w-10 text-slate-300" />
              <h3 className="mt-3 text-base font-semibold text-slate-900">
                Nenhum recebimento cadastrado
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Configure o contrato de um projeto (gerando mensalidades automaticamente) ou registre um recebimento pontual.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Descrição / Cliente</th>
                      <th className="px-4 py-3">Tipo</th>
                      <th className="px-4 py-3">Vencimento / Pago em</th>
                      <th className="px-4 py-3">Valor</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {entries.map((entry) => {
                      const st = FINANCIAL_STATUS_MAP[entry.status];
                      return (
                        <tr key={entry.id} className="hover:bg-slate-50/70">
                          <td className="px-4 py-3.5 align-top">
                            <p className="font-semibold text-slate-900">
                              {entry.description}
                            </p>
                            <div className="mt-0.5 flex flex-wrap gap-2 text-xs text-slate-500">
                              <Link
                                href={`/clientes/${entry.clientId}`}
                                className="hover:text-indigo-600 hover:underline"
                              >
                                {entry.clientCompany}
                              </Link>
                              {entry.projectId && entry.projectName ? (
                                <Link
                                  href={`/projetos/${entry.projectId}`}
                                  className="text-indigo-600 hover:underline"
                                >
                                  · {entry.projectName}
                                </Link>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${
                                entry.entryType === "recorrente"
                                  ? "bg-indigo-50 text-indigo-700"
                                  : "bg-slate-100 text-slate-700"
                              }`}
                            >
                              {entry.entryType === "recorrente" ? (
                                <RefreshCw className="h-3 w-3" />
                              ) : (
                                <CreditCard className="h-3 w-3" />
                              )}
                              {entry.entryType === "recorrente"
                                ? "Recorrente"
                                : "Pontual"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-top text-xs">
                            <div
                              className={
                                entry.status === "atrasado"
                                  ? "inline-flex items-center gap-1 font-semibold text-rose-700"
                                  : "text-slate-700"
                              }
                            >
                              {entry.status === "atrasado" ? (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              ) : null}
                              {formatDate(entry.dueDate)}
                            </div>
                            {entry.paidAt ? (
                              <div className="mt-0.5 text-emerald-700">
                                Pago: {formatDate(entry.paidAt)}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-4 py-3.5 align-top font-semibold text-slate-900">
                            {formatCurrency(entry.amount)}
                          </td>
                          <td className="px-4 py-3.5 align-top">
                            <select
                              value={entry.status}
                              onChange={(e) =>
                                handleQuickStatus(
                                  entry.id,
                                  e.target.value as FinancialStatus
                                )
                              }
                              className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none ${st.badgeClass}`}
                            >
                              {FINANCIAL_STATUSES.map((opt) => (
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
                          <td className="px-4 py-3.5 align-top text-right">
                            <div className="inline-flex items-center gap-1">
                              {entry.status !== "pago" &&
                              entry.status !== "cancelado" ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleQuickStatus(entry.id, "pago")
                                  }
                                  title="Marcar como pago"
                                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                                >
                                  <CheckCircle2 className="h-3.5 w-3.5" />
                                  Pagar
                                </button>
                              ) : null}
                              <button
                                type="button"
                                onClick={() => openEditEntry(entry)}
                                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                              >
                                <Pencil className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteEntry(entry)}
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
        </div>
      ) : tab === "contracts" ? (
        contracts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
            <FileSpreadsheet className="mx-auto h-10 w-10 text-slate-300" />
            <h3 className="mt-3 text-base font-semibold text-slate-900">
              Nenhum contrato configurado
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Configure o contrato de um projeto para definir parcelas, vencimento e mensalidade recorrente automática.
            </p>
            <button
              type="button"
              onClick={() => openContractModal()}
              disabled={projects.length === 0}
              className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Configurar primeiro contrato
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {contracts.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <Link
                      href={`/projetos/${c.projectId}`}
                      className="text-base font-semibold text-slate-900 hover:text-indigo-600"
                    >
                      {c.projectName}
                    </Link>
                    <p className="text-xs text-slate-500">{c.clientCompany}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        c.active
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {c.active ? "Recorrência ativa" : "Pausado"}
                    </span>
                    <button
                      type="button"
                      onClick={() => openContractModal(c)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-3 gap-3 rounded-xl bg-slate-50 p-3 text-xs">
                  <div>
                    <p className="text-slate-500">Vendido</p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {formatCurrency(c.totalSoldValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Implantação</p>
                    <p className="mt-0.5 font-semibold text-slate-900">
                      {formatCurrency(c.setupValue)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Mensalidade</p>
                    <p className="mt-0.5 font-semibold text-emerald-700">
                      {formatCurrency(c.monthlyFee)}/mês
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
                  <span>Vencimento dia {c.dueDay}</span>
                  {c.paymentMethod ? <span>· {c.paymentMethod}</span> : null}
                  <span>· {c.installmentsCount} parcela(s)</span>
                  {c.billingStartDate ? (
                    <span>· Início: {formatDate(c.billingStartDate)}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Projeto / Cliente</th>
                  <th className="px-4 py-3">Já gerou (Pago)</th>
                  <th className="px-4 py-3">A receber</th>
                  <th className="px-4 py-3">Gera mensalmente (MRR)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(summary?.byProject ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-4 py-10 text-center text-sm text-slate-500"
                    >
                      Nenhum projeto com movimentação financeira ainda.
                    </td>
                  </tr>
                ) : (
                  summary!.byProject.map((bp) => (
                    <tr key={bp.projectId} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/projetos/${bp.projectId}`}
                          className="font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {bp.projectName}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {bp.clientCompany}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-emerald-700">
                        {formatCurrency(bp.received)}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-amber-700">
                        {formatCurrency(bp.receivable)}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-indigo-700">
                        {formatCurrency(bp.monthlyFee)}/mês
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Recebimento */}
      <Modal
        open={entryModalOpen}
        onClose={() => setEntryModalOpen(false)}
        title={editingEntry ? "Editar Recebimento" : "Novo Recebimento"}
        description="Registre cobranças pontuais ou recorrentes vinculadas ao cliente e projeto."
        size="lg"
      >
        <form onSubmit={handleSaveEntry} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Cliente *
              </label>
              <select
                required
                value={eClientId}
                onChange={(e) => setEClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Selecionar cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Projeto (opcional)
              </label>
              <select
                value={eProjectId}
                onChange={(e) => {
                  const val = e.target.value;
                  setEProjectId(val);
                  const found = projects.find((p) => p.id === val);
                  if (found) setEClientId(found.clientId);
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

            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Descrição *
              </label>
              <input
                required
                value={eDescription}
                onChange={(e) => setEDescription(e.target.value)}
                placeholder="Ex.: Entrada 50% E-commerce / Mensalidade Dezembro"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Valor (R$) *
              </label>
              <input
                required
                inputMode="decimal"
                value={eAmount}
                onChange={(e) => setEAmount(e.target.value)}
                placeholder="2500.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tipo de receita
              </label>
              <select
                value={eType}
                onChange={(e) => setEType(e.target.value as FinancialEntryType)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {FINANCIAL_ENTRY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Vencimento *
              </label>
              <input
                required
                type="date"
                value={eDueDate}
                onChange={(e) => setEDueDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Data do pagamento
              </label>
              <input
                type="date"
                value={ePaidAt}
                onChange={(e) => setEPaidAt(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Status
              </label>
              <select
                value={eStatus}
                onChange={(e) => setEStatus(e.target.value as FinancialStatus)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {FINANCIAL_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Forma de pagamento
              </label>
              <select
                value={eMethod}
                onChange={(e) => setEMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Observações
            </label>
            <textarea
              rows={2}
              value={eNotes}
              onChange={(e) => setENotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setEntryModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingEntry}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {savingEntry ? "Salvando..." : "Salvar Recebimento"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Contrato do Projeto */}
      <Modal
        open={contractModalOpen}
        onClose={() => setContractModalOpen(false)}
        title="Contrato Financeiro do Projeto"
        description="Mensalidades recorrentes ativas geram automaticamente os lançamentos dos meses seguintes."
        size="lg"
      >
        <form onSubmit={handleSaveContract} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Projeto *
            </label>
            <select
              required
              value={cProjectId}
              onChange={(e) => setCProjectId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
            >
              <option value="">Selecionar projeto</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                  {p.clientCompany ? ` — ${p.clientCompany}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Valor total vendido (R$)
              </label>
              <input
                inputMode="decimal"
                value={cTotalSold}
                onChange={(e) => setCTotalSold(e.target.value)}
                placeholder="15000.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Valor de implantação (R$)
              </label>
              <input
                inputMode="decimal"
                value={cSetup}
                onChange={(e) => setCSetup(e.target.value)}
                placeholder="5000.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Mensalidade (R$)
              </label>
              <input
                inputMode="decimal"
                value={cMonthly}
                onChange={(e) => setCMonthly(e.target.value)}
                placeholder="1500.00"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Início da cobrança
              </label>
              <input
                type="date"
                value={cStartDate}
                onChange={(e) => setCStartDate(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Dia de vencimento (1 a 31)
              </label>
              <input
                type="number"
                min={1}
                max={31}
                value={cDueDay}
                onChange={(e) => setCDueDay(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Forma de pagamento
              </label>
              <select
                value={cMethod}
                onChange={(e) => setCMethod(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Número de parcelas (implantação)
              </label>
              <input
                type="number"
                min={1}
                max={48}
                value={cInstallments}
                onChange={(e) => setCInstallments(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 text-xs">
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
              <input
                type="checkbox"
                checked={cActive}
                onChange={(e) => setCActive(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Recorrência ativa (gerar mensalidades automaticamente)
            </label>
            <label className="flex cursor-pointer items-center gap-2 font-medium text-slate-700">
              <input
                type="checkbox"
                checked={cGenerateInstallments}
                onChange={(e) => setCGenerateInstallments(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600"
              />
              Gerar agora os lançamentos pontuais de implantação / parcelas
            </label>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Observações do contrato
            </label>
            <textarea
              rows={2}
              value={cNotes}
              onChange={(e) => setCNotes(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          {formError ? (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-sm text-rose-700">
              {formError}
            </div>
          ) : null}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setContractModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingContract}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {savingContract ? "Salvando..." : "Salvar Contrato"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

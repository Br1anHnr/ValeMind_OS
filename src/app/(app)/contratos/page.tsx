"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ExternalLink,
  FileSignature,
  Printer,
  Plus,
  Search,
  Sparkles,
  Trash2,
} from "lucide-react";
import {
  CONTRACT_DOC_STATUSES,
  CONTRACT_DOC_STATUS_MAP,
  CONTRACT_IP_MODES,
  CONTRACT_TEMPLATE_MAP,
  CONTRACT_TEMPLATE_TYPES,
  PAYMENT_METHODS,
} from "@/lib/constants";
import type {
  ContractDocStatus,
  ContractIpMode,
  ContractTemplateType,
} from "@/db/schema";
import {
  ensureExternalUrl,
  formatCurrency,
  formatDate,
} from "@/lib/format";
import {
  buildStandardContractText,
  type ClientTemplateData,
  type CompanyTemplateData,
} from "@/lib/contract-templates";
import { Modal } from "@/components/Modal";

interface ContractListItem {
  id: string;
  contractNumber: string;
  title: string;
  templateType: ContractTemplateType;
  clientId: string;
  clientCompany: string;
  clientName: string;
  projectId: string | null;
  projectName: string | null;
  status: ContractDocStatus;
  totalValue: string | null;
  setupValue: string | null;
  monthlyFee: string | null;
  dueDay: number;
  paymentMethod: string | null;
  startDate: string | null;
  dueDate: string | null;
  ipMode: ContractIpMode;
  signedUrl: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface ClientFull extends ClientTemplateData {
  id: string;
}

interface ProjectFull {
  id: string;
  name: string;
  clientId: string;
  description: string | null;
  soldValue: string | null;
  monthlyFee: string | null;
  startDate: string | null;
  dueDate: string | null;
}

export default function ContratosPage() {
  const router = useRouter();
  const [contracts, setContracts] = useState<ContractListItem[]>([]);
  const [clients, setClients] = useState<ClientFull[]>([]);
  const [projects, setProjects] = useState<ProjectFull[]>([]);
  const [company, setCompany] = useState<CompanyTemplateData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [clientId, setClientId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [templateType, setTemplateType] = useState<ContractTemplateType>(
    "desenvolvimento_manutencao"
  );
  const [ipMode, setIpMode] = useState<ContractIpMode>("cessao_apos_quitacao");
  const [totalValue, setTotalValue] = useState("");
  const [setupValue, setSetupValue] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [paymentMethod, setPaymentMethod] = useState("PIX");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [scope, setScope] = useState("");
  const [content, setContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const qs = new URLSearchParams();
      if (search.trim()) qs.set("search", search.trim());
      if (statusFilter !== "all") qs.set("status", statusFilter);

      const [cRes, cliRes, projRes, compRes] = await Promise.all([
        fetch(`/api/contracts?${qs.toString()}`),
        fetch("/api/clients"),
        fetch("/api/projects"),
        fetch("/api/company"),
      ]);

      if (!cRes.ok) throw new Error("Erro ao carregar contratos.");
      setContracts((await cRes.json()).contracts ?? []);
      if (cliRes.ok) setClients((await cliRes.json()).clients ?? []);
      if (projRes.ok) setProjects((await projRes.json()).projects ?? []);
      if (compRes.ok) setCompany((await compRes.json()).company ?? {});
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar contratos."
      );
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  function generateDraftText(overrides?: {
    clientId?: string;
    projectId?: string;
    templateType?: ContractTemplateType;
    ipMode?: ContractIpMode;
    totalValue?: string;
    setupValue?: string;
    monthlyFee?: string;
    dueDay?: string;
    paymentMethod?: string;
    startDate?: string;
    dueDate?: string;
    scope?: string;
  }) {
    const cId = overrides?.clientId ?? clientId;
    const pId = overrides?.projectId ?? projectId;
    const client = clients.find((c) => c.id === cId);
    if (!client) return;
    const project = projects.find((p) => p.id === pId);

    const text = buildStandardContractText({
      templateType: overrides?.templateType ?? templateType,
      ipMode: overrides?.ipMode ?? ipMode,
      company,
      client,
      projectName: project?.name ?? null,
      scope: overrides?.scope ?? scope,
      totalValue: overrides?.totalValue ?? totalValue,
      setupValue: overrides?.setupValue ?? setupValue,
      monthlyFee: overrides?.monthlyFee ?? monthlyFee,
      dueDay: Number(overrides?.dueDay ?? dueDay) || 10,
      paymentMethod: overrides?.paymentMethod ?? paymentMethod,
      startDate: overrides?.startDate ?? startDate,
      dueDate: overrides?.dueDate ?? dueDate,
    });
    setContent(text);
  }

  function openNewContract() {
    setFormError(null);
    const defaultClient = clients[0];
    const defaultProject = defaultClient
      ? projects.find((p) => p.clientId === defaultClient.id)
      : undefined;

    const cId = defaultClient?.id ?? "";
    const pId = defaultProject?.id ?? "";
    const sold = defaultProject?.soldValue ?? "";
    const fee = defaultProject?.monthlyFee ?? "";
    const start =
      defaultProject?.startDate?.slice(0, 10) ??
      new Date().toISOString().slice(0, 10);
    const due = defaultProject?.dueDate?.slice(0, 10) ?? "";
    const desc = defaultProject?.description ?? "";
    const tType: ContractTemplateType =
      Number(fee) > 0 && Number(sold) === 0
        ? "manutencao"
        : Number(fee) > 0
          ? "desenvolvimento_manutencao"
          : "desenvolvimento";

    setClientId(cId);
    setProjectId(pId);
    setTitle(
      defaultProject
        ? `Contrato — ${defaultProject.name}`
        : defaultClient
          ? `Contrato de Prestação de Serviços — ${defaultClient.company}`
          : ""
    );
    setTemplateType(tType);
    setIpMode("cessao_apos_quitacao");
    setTotalValue(sold);
    setSetupValue("");
    setMonthlyFee(fee);
    setDueDay("10");
    setPaymentMethod("PIX");
    setStartDate(start);
    setDueDate(due);
    setScope(desc);

    if (defaultClient) {
      setContent(
        buildStandardContractText({
          templateType: tType,
          ipMode: "cessao_apos_quitacao",
          company,
          client: defaultClient,
          projectName: defaultProject?.name ?? null,
          scope: desc,
          totalValue: sold,
          setupValue: "",
          monthlyFee: fee,
          dueDay: 10,
          paymentMethod: "PIX",
          startDate: start,
          dueDate: due,
        })
      );
    } else {
      setContent("");
    }

    setModalOpen(true);
  }

  function handleProjectPick(newProjectId: string) {
    setProjectId(newProjectId);
    const proj = projects.find((p) => p.id === newProjectId);
    if (!proj) return;
    setClientId(proj.clientId);
    setTitle(`Contrato — ${proj.name}`);
    setTotalValue(proj.soldValue ?? "");
    setMonthlyFee(proj.monthlyFee ?? "");
    setStartDate(
      proj.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10)
    );
    setDueDate(proj.dueDate?.slice(0, 10) ?? "");
    setScope(proj.description ?? "");
    generateDraftText({
      clientId: proj.clientId,
      projectId: proj.id,
      totalValue: proj.soldValue ?? "",
      monthlyFee: proj.monthlyFee ?? "",
      startDate:
        proj.startDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      dueDate: proj.dueDate?.slice(0, 10) ?? "",
      scope: proj.description ?? "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const res = await fetch("/api/contracts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          templateType,
          clientId,
          projectId: projectId || null,
          status: "rascunho",
          totalValue: totalValue || null,
          setupValue: setupValue || null,
          monthlyFee: monthlyFee || null,
          dueDay: Number(dueDay) || 10,
          paymentMethod,
          startDate: startDate || null,
          dueDate: dueDate || null,
          ipMode,
          content,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Erro ao emitir contrato");
        return;
      }
      setModalOpen(false);
      router.push(`/contratos/${json.contract.id}`);
    } finally {
      setSaving(false);
    }
  }

  async function handleQuickStatus(id: string, status: ContractDocStatus) {
    setContracts((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
    const res = await fetch(`/api/contracts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (!res.ok) loadData();
  }

  async function handleDelete(item: ContractListItem) {
    if (!confirm(`Excluir o contrato ${item.contractNumber}?`)) return;
    const res = await fetch(`/api/contracts/${item.id}`, { method: "DELETE" });
    if (res.ok) loadData();
  }

  const missingCompanyCnpj = !company.cnpj;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Contratos Jurídicos
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Emissão padronizada em PDF com os dados do CNPJ da ValeMind, cláusulas legais (CC, Lei do Software e LGPD) e controle de assinatura.
          </p>
        </div>
        <button
          type="button"
          onClick={openNewContract}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Emitir Contrato
        </button>
      </div>

      {/* Company CNPJ reminder banner */}
      {missingCompanyCnpj ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
            <div>
              <p className="font-semibold">
                Configure o CNPJ e dados da ValeMind antes de emitir
              </p>
              <p className="text-xs text-amber-800">
                Preencha uma única vez a Razão Social, CNPJ, endereço, representante legal e cidade/foro em Configurações para sair preenchido automaticamente em todos os contratos.
              </p>
            </div>
          </div>
          <Link
            href="/configuracoes"
            className="shrink-0 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-amber-500"
          >
            Configurar CNPJ agora
          </Link>
        </div>
      ) : null}

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-8">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar número do contrato, título, cliente ou projeto..."
            className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-4">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm"
          >
            <option value="all">Todos os status</option>
            {CONTRACT_DOC_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Carregando contratos...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : contracts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <FileSignature className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhum contrato jurídico emitido ainda
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Gere contratos padronizados em PDF com base nos dados dos clientes e projetos para assinatura eletrônica (Gov.br, Autentique ou ZapSign).
          </p>
          <button
            type="button"
            onClick={openNewContract}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Emitir primeiro contrato
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <tr>
                  <th className="px-4 py-3">Nº / Contrato</th>
                  <th className="px-4 py-3">Cliente / Projeto</th>
                  <th className="px-4 py-3">Valores</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {contracts.map((item) => {
                  const st = CONTRACT_DOC_STATUS_MAP[item.status];
                  const tpl = CONTRACT_TEMPLATE_MAP[item.templateType];
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3.5 align-top">
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                          {item.contractNumber}
                        </span>
                        <Link
                          href={`/contratos/${item.id}`}
                          className="mt-1 block font-semibold text-slate-900 hover:text-indigo-600"
                        >
                          {item.title}
                        </Link>
                        <p className="text-xs text-slate-400">{tpl.label}</p>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <Link
                          href={`/clientes/${item.clientId}`}
                          className="font-medium text-slate-800 hover:text-indigo-600 hover:underline"
                        >
                          {item.clientCompany}
                        </Link>
                        {item.projectId && item.projectName ? (
                          <div>
                            <Link
                              href={`/projetos/${item.projectId}`}
                              className="text-xs text-indigo-600 hover:underline"
                            >
                              {item.projectName}
                            </Link>
                          </div>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top text-xs">
                        {Number(item.totalValue ?? 0) > 0 ? (
                          <div className="font-semibold text-slate-900">
                            {formatCurrency(item.totalValue)}
                          </div>
                        ) : null}
                        {Number(item.monthlyFee ?? 0) > 0 ? (
                          <div className="font-medium text-emerald-700">
                            {formatCurrency(item.monthlyFee)}/mês
                          </div>
                        ) : null}
                        <div className="text-slate-400">
                          Emitido: {formatDate(item.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 align-top">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleQuickStatus(
                              item.id,
                              e.target.value as ContractDocStatus
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-xs font-medium focus:outline-none ${st.badgeClass}`}
                        >
                          {CONTRACT_DOC_STATUSES.map((opt) => (
                            <option
                              key={opt.value}
                              value={opt.value}
                              className="bg-white text-slate-900"
                            >
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        {item.signedUrl ? (
                          <a
                            href={ensureExternalUrl(item.signedUrl)}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                          >
                            Link assinado <ExternalLink className="h-3 w-3" />
                          </a>
                        ) : null}
                      </td>
                      <td className="px-4 py-3.5 align-top text-right">
                        <div className="inline-flex items-center gap-1">
                          <Link
                            href={`/contratos/${item.id}`}
                            className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                          >
                            <Printer className="h-3.5 w-3.5" />
                            Abrir / PDF
                          </Link>
                          <button
                            type="button"
                            onClick={() => handleDelete(item)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Excluir contrato"
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

      {/* Modal Emitir Contrato */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Emitir Contrato Padronizado"
        description="Os dados da ValeMind, do cliente e do projeto são preenchidos automaticamente. Revise e ajuste qualquer cláusula antes de salvar."
        size="xl"
      >
        {clients.length === 0 ? (
          <div className="space-y-4 py-4 text-center">
            <p className="text-sm text-slate-600">
              Para emitir um contrato jurídico, cadastre primeiro o cliente (com CNPJ/CPF opcional) na aba <strong>Clientes</strong> ou crie o projeto em <strong>Projetos</strong>.
            </p>
            <div className="flex justify-center gap-2">
              <Link
                href="/clientes"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
              >
                Ir para Clientes
              </Link>
              <Link
                href="/projetos"
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Ir para Projetos
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Cliente (Contratante) *
                </label>
                <select
                  required
                  value={clientId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setClientId(val);
                    const c = clients.find((item) => item.id === val);
                    if (c && !projectId) {
                      setTitle(`Contrato de Prestação de Serviços — ${c.company}`);
                    }
                    generateDraftText({ clientId: val });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Selecionar cliente</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company}
                      {c.document ? ` (${c.document})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Projeto vinculado (preenche valores e escopo)
                </label>
                <select
                  value={projectId}
                  onChange={(e) => handleProjectPick(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  <option value="">Sem projeto específico</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Título do contrato *
                </label>
                <input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Modelo de contrato
                </label>
                <select
                  value={templateType}
                  onChange={(e) => {
                    const val = e.target.value as ContractTemplateType;
                    setTemplateType(val);
                    generateDraftText({ templateType: val });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {CONTRACT_TEMPLATE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Propriedade Intelectual (Código)
                </label>
                <select
                  value={ipMode}
                  onChange={(e) => {
                    const val = e.target.value as ContractIpMode;
                    setIpMode(val);
                    generateDraftText({ ipMode: val });
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                >
                  {CONTRACT_IP_MODES.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Valor total do projeto (R$)
                </label>
                <input
                  inputMode="decimal"
                  value={totalValue}
                  onChange={(e) => setTotalValue(e.target.value)}
                  placeholder="10000.00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Mensalidade (R$)
                </label>
                <input
                  inputMode="decimal"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  placeholder="1200.00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Início / Prazo de entrega
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
                  />
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-700">
                    Forma de pagto.
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs"
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
                    Dia vencimento
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-2.5 py-2 text-xs"
                  />
                </div>
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Resumo do escopo (entra na Cláusula 1ª)
                </label>
                <textarea
                  rows={2}
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  placeholder="Descreva os módulos, entregáveis e limites do escopo..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 rounded-xl bg-indigo-50/70 px-3.5 py-2.5">
              <span className="text-xs text-indigo-900">
                Alterou valores, escopo ou datas acima? Clique para regerar o texto com os dados atualizados.
              </span>
              <button
                type="button"
                onClick={() => generateDraftText()}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Atualizar minuta
              </button>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Minuta do contrato (editável) *
              </label>
              <textarea
                required
                rows={12}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xl border border-slate-200 font-mono text-xs leading-relaxed px-3.5 py-3 focus:border-indigo-500 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Recomendação: revise o texto-base uma vez com um advogado de confiança e confirme o enquadramento do CNAE do MEI com seu contador.
              </p>
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
                {saving ? "Emitindo..." : "Salvar e Abrir PDF"}
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

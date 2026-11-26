"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  ExternalLink,
  Link2,
  Pencil,
  Printer,
  Save,
  Trash2,
} from "lucide-react";
import {
  CONTRACT_DOC_STATUSES,
  CONTRACT_DOC_STATUS_MAP,
} from "@/lib/constants";
import type { ContractDocStatus } from "@/db/schema";
import { ensureExternalUrl, formatDate } from "@/lib/format";

interface ContractDetail {
  id: string;
  contractNumber: string;
  title: string;
  clientId: string;
  clientCompany: string;
  projectId: string | null;
  projectName: string | null;
  status: ContractDocStatus;
  content: string;
  signedUrl: string | null;
  signedAt: string | null;
  createdAt: string;
}

interface CompanyHeader {
  legalName: string;
  tradeName: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
}

export default function ContratoDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = params.id;

  const [contract, setContract] = useState<ContractDetail | null>(null);
  const [company, setCompany] = useState<CompanyHeader | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [draftContent, setDraftContent] = useState("");
  const [signedUrl, setSignedUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedNotice, setSavedNotice] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/contracts/${id}`);
      if (!res.ok) {
        throw new Error(
          res.status === 404
            ? "Contrato não encontrado."
            : "Erro ao carregar contrato."
        );
      }
      const json = await res.json();
      setContract(json.contract);
      setCompany(json.company);
      setDraftContent(json.contract.content);
      setSignedUrl(json.contract.signedUrl ?? "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao carregar contrato."
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function saveChanges(patch: Record<string, unknown>) {
    setSaving(true);
    setSavedNotice(false);
    try {
      const res = await fetch(`/api/contracts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (res.ok) {
        await loadData();
        setEditing(false);
        setSavedNotice(true);
        setTimeout(() => setSavedNotice(false), 2500);
      }
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!contract) return;
    if (!confirm(`Excluir o contrato ${contract.contractNumber}?`)) return;
    const res = await fetch(`/api/contracts/${id}`, { method: "DELETE" });
    if (res.ok) router.push("/contratos");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Carregando documento...
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="space-y-4">
        <Link
          href="/contratos"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Contratos
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error ?? "Contrato não encontrado."}
        </div>
      </div>
    );
  }

  const st = CONTRACT_DOC_STATUS_MAP[contract.status];

  return (
    <div className="space-y-6">
      {/* Toolbar (oculta na impressão/PDF) */}
      <div className="space-y-4 print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/contratos"
              className="mb-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Contratos Jurídicos
            </Link>
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="rounded-md bg-slate-200 px-2 py-0.5 font-mono text-xs font-semibold text-slate-800">
                {contract.contractNumber}
              </span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                {contract.title}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={contract.status}
              onChange={(e) =>
                saveChanges({ status: e.target.value as ContractDocStatus })
              }
              className={`rounded-xl border px-3 py-2 text-xs font-semibold focus:outline-none ${st.badgeClass}`}
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

            <button
              type="button"
              onClick={() => setEditing((prev) => !prev)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              {editing ? "Cancelar edição" : "Editar cláusulas"}
            </button>

            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-slate-800"
            >
              <Printer className="h-4 w-4" />
              Imprimir / Salvar PDF
            </button>

            <button
              type="button"
              onClick={handleDelete}
              className="rounded-xl border border-rose-200 bg-white p-2 text-rose-600 hover:bg-rose-50"
              title="Excluir contrato"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Link do documento assinado (Gov.br / Autentique / ZapSign / Drive) */}
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:flex-row sm:items-center">
          <div className="flex flex-1 items-center gap-2">
            <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              value={signedUrl}
              onChange={(e) => setSignedUrl(e.target.value)}
              placeholder="Cole aqui o link do contrato assinado (Gov.br, Autentique, ZapSign ou Google Drive)..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={saving}
              onClick={() => saveChanges({ signedUrl })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {savedNotice ? (
                <>
                  <Check className="h-3.5 w-3.5" />
                  Salvo
                </>
              ) : (
                <>
                  <Save className="h-3.5 w-3.5" />
                  Salvar link
                </>
              )}
            </button>
            {contract.signedUrl ? (
              <a
                href={ensureExternalUrl(contract.signedUrl)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
              >
                Abrir assinado <ExternalLink className="h-3.5 w-3.5" />
              </a>
            ) : null}
          </div>
        </div>
      </div>

      {/* Editor inline */}
      {editing ? (
        <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs print:hidden">
          <textarea
            rows={24}
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            className="w-full rounded-xl border border-slate-200 p-4 font-mono text-xs leading-relaxed focus:border-indigo-500 focus:outline-none"
          />
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setDraftContent(contract.content);
                setEditing(false);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => saveChanges({ content: draftContent })}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar texto do contrato"}
            </button>
          </div>
        </div>
      ) : null}

      {/* Documento A4 pronto para PDF / Impressão */}
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-8 shadow-sm print:max-w-none print:rounded-none print:border-0 print:p-0 print:shadow-none sm:p-12">
        {/* Cabeçalho oficial ValeMind */}
        <header className="mb-8 flex items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="flex items-center gap-3.5">
            <img
              src="/valemind-logo.png"
              alt="ValeMind"
              className="h-12 w-auto object-contain"
            />
          </div>
          <div className="text-right text-xs text-slate-500">
            <p className="font-semibold text-slate-900">
              {company?.legalName || "ValeMind"}
            </p>
            {company?.cnpj ? <p>CNPJ: {company.cnpj}</p> : null}
            <p>
              Contrato nº{" "}
              <strong className="text-slate-800">
                {contract.contractNumber}
              </strong>
            </p>
            <p>Emitido em {formatDate(contract.createdAt)}</p>
          </div>
        </header>

        {/* Corpo jurídico */}
        <div className="whitespace-pre-wrap font-serif text-[13.5px] leading-7 text-slate-800">
          {contract.content}
        </div>
      </article>
    </div>
  );
}

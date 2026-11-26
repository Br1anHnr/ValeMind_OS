"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { PROPOSAL_STATUSES } from "@/lib/constants";
import type { ProposalStatus } from "@/db/schema";
import { toDateInputValue } from "@/lib/format";
import type { SimpleUser } from "@/components/LeadFormModal";
import type { SimpleClient } from "@/components/ProjectFormModal";

export interface SimpleLead {
  id: string;
  company: string;
  contactName: string;
}

export interface ProposalRecord {
  id: string;
  title: string;
  leadId: string | null;
  leadCompany: string | null;
  clientId: string | null;
  clientCompany: string | null;
  ownerId: string | null;
  ownerName: string | null;
  status: ProposalStatus;
  totalValue: string | null;
  setupValue: string | null;
  monthlyFee: string | null;
  sentAt: string | null;
  validUntil: string | null;
  documentUrl: string | null;
  scope: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ProposalFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  users: SimpleUser[];
  leads: SimpleLead[];
  clients: SimpleClient[];
  initialProposal?: ProposalRecord | null;
}

export function ProposalFormModal({
  open,
  onClose,
  onSaved,
  users,
  leads,
  clients,
  initialProposal,
}: ProposalFormModalProps) {
  const isEditing = Boolean(initialProposal);
  const [title, setTitle] = useState("");
  const [leadId, setLeadId] = useState("");
  const [clientId, setClientId] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<ProposalStatus>("rascunho");
  const [totalValue, setTotalValue] = useState("");
  const [setupValue, setSetupValue] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [sentAt, setSentAt] = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [documentUrl, setDocumentUrl] = useState("");
  const [scope, setScope] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialProposal) {
      setTitle(initialProposal.title);
      setLeadId(initialProposal.leadId ?? "");
      setClientId(initialProposal.clientId ?? "");
      setOwnerId(initialProposal.ownerId ?? "");
      setStatus(initialProposal.status);
      setTotalValue(initialProposal.totalValue ?? "");
      setSetupValue(initialProposal.setupValue ?? "");
      setMonthlyFee(initialProposal.monthlyFee ?? "");
      setSentAt(toDateInputValue(initialProposal.sentAt));
      setValidUntil(initialProposal.validUntil?.slice(0, 10) ?? "");
      setDocumentUrl(initialProposal.documentUrl ?? "");
      setScope(initialProposal.scope ?? "");
      setNotes(initialProposal.notes ?? "");
    } else {
      setTitle("");
      setLeadId("");
      setClientId("");
      setOwnerId(users[0]?.id ?? "");
      setStatus("rascunho");
      setTotalValue("");
      setSetupValue("");
      setMonthlyFee("");
      setSentAt("");
      setValidUntil("");
      setDocumentUrl("");
      setScope("");
      setNotes("");
    }
  }, [open, initialProposal, users]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = isEditing
        ? `/api/proposals/${initialProposal!.id}`
        : "/api/proposals";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          leadId: leadId || null,
          clientId: clientId || null,
          ownerId: ownerId || null,
          status,
          totalValue: totalValue || null,
          setupValue: setupValue || null,
          monthlyFee: monthlyFee || null,
          sentAt: sentAt || null,
          validUntil: validUntil || null,
          documentUrl,
          scope,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar proposta");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão ao salvar proposta.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Proposta" : "Nova Proposta Comercial"}
      description="Ao marcar como Enviada ou Aprovada, o lead vinculado avança automaticamente no pipeline."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Título da proposta *
            </label>
            <input
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex.: Proposta E-commerce + Automação — Real Mercado"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Lead vinculado
            </label>
            <select
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Nenhum lead</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.company} ({l.contactName})
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              <option value="">Nenhum cliente</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProposalStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            >
              {PROPOSAL_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Responsável
            </label>
            <select
              value={ownerId}
              onChange={(e) => setOwnerId(e.target.value)}
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
              Valor total (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={totalValue}
              onChange={(e) => setTotalValue(e.target.value)}
              placeholder="12000.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Valor de implantação (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={setupValue}
              onChange={(e) => setSetupValue(e.target.value)}
              placeholder="4000.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Mensalidade proposta (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              placeholder="1500.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Link do documento (PDF / Notion / Drive)
            </label>
            <input
              value={documentUrl}
              onChange={(e) => setDocumentUrl(e.target.value)}
              placeholder="https://..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Data de envio
            </label>
            <input
              type="date"
              value={sentAt}
              onChange={(e) => setSentAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Válida até
            </label>
            <input
              type="date"
              value={validUntil}
              onChange={(e) => setValidUntil(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Resumo do escopo
          </label>
          <textarea
            rows={3}
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            placeholder="Principais entregáveis, prazos e condições comerciais..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Observações internas
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anotações de negociação, objeções ou descontos discutidos..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="sticky bottom-0 -mx-6 -mb-5 flex items-center justify-end gap-2 border-t border-slate-100 bg-white px-6 py-3.5">
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
                : "Criar Proposta"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

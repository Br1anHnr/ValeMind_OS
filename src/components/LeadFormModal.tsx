"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/Modal";
import { LEAD_SOURCES, LEAD_STAGES } from "@/lib/constants";
import type { LeadStage } from "@/db/schema";
import { toDateInputValue } from "@/lib/format";

export interface SimpleUser {
  id: string;
  name: string;
  email: string;
}

export interface LeadRecord {
  id: string;
  company: string;
  contactName: string;
  phone: string | null;
  email: string | null;
  website: string | null;
  instagram: string | null;
  source: string | null;
  ownerId: string | null;
  ownerName: string | null;
  stage: LeadStage;
  lastContactAt: string | null;
  nextAction: string | null;
  nextFollowUpAt: string | null;
  potentialValue: string | null;
  notes: string | null;
  convertedClientId: string | null;
  convertedClientCompany: string | null;
  convertedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface LeadFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  users: SimpleUser[];
  initialLead?: LeadRecord | null;
  defaultStage?: LeadStage;
}

export function LeadFormModal({
  open,
  onClose,
  onSaved,
  users,
  initialLead,
  defaultStage = "identificado",
}: LeadFormModalProps) {
  const isEditing = Boolean(initialLead);
  const [company, setCompany] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [source, setSource] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [stage, setStage] = useState<LeadStage>(defaultStage);
  const [lastContactAt, setLastContactAt] = useState("");
  const [nextAction, setNextAction] = useState("");
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [potentialValue, setPotentialValue] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialLead) {
      setCompany(initialLead.company);
      setContactName(initialLead.contactName);
      setPhone(initialLead.phone ?? "");
      setEmail(initialLead.email ?? "");
      setWebsite(initialLead.website ?? "");
      setInstagram(initialLead.instagram ?? "");
      setSource(initialLead.source ?? "");
      setOwnerId(initialLead.ownerId ?? "");
      setStage(initialLead.stage);
      setLastContactAt(toDateInputValue(initialLead.lastContactAt));
      setNextAction(initialLead.nextAction ?? "");
      setNextFollowUpAt(toDateInputValue(initialLead.nextFollowUpAt));
      setPotentialValue(initialLead.potentialValue ?? "");
      setNotes(initialLead.notes ?? "");
    } else {
      setCompany("");
      setContactName("");
      setPhone("");
      setEmail("");
      setWebsite("");
      setInstagram("");
      setSource("");
      setOwnerId(users[0]?.id ?? "");
      setStage(defaultStage);
      setLastContactAt("");
      setNextAction("");
      setNextFollowUpAt("");
      setPotentialValue("");
      setNotes("");
    }
  }, [open, initialLead, defaultStage, users]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const url = isEditing ? `/api/leads/${initialLead!.id}` : "/api/leads";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          contactName,
          phone,
          email,
          website,
          instagram,
          source,
          ownerId: ownerId || null,
          stage,
          lastContactAt: lastContactAt || null,
          nextAction,
          nextFollowUpAt: nextFollowUpAt || null,
          potentialValue: potentialValue || null,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar lead");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão ao salvar lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Lead" : "Novo Lead"}
      description="Registre as informações comerciais para acompanhamento no funil."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Empresa *
            </label>
            <input
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Ex.: Real Mercado"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Nome do contato *
            </label>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              placeholder="Ex.: João Silva"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Telefone / WhatsApp
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(11) 99999-9999"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              E-mail
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="contato@empresa.com.br"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Site
            </label>
            <input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://empresa.com.br"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Instagram
            </label>
            <input
              value={instagram}
              onChange={(e) => setInstagram(e.target.value)}
              placeholder="@empresa"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Origem do lead
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            >
              <option value="">Selecionar origem</option>
              {LEAD_SOURCES.map((src) => (
                <option key={src} value={src}>
                  {src}
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
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
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
              Etapa do funil
            </label>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as LeadStage)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            >
              {LEAD_STAGES.map((st) => (
                <option key={st.value} value={st.value}>
                  {st.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Valor potencial (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={potentialValue}
              onChange={(e) => setPotentialValue(e.target.value)}
              placeholder="5000.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Último contato
            </label>
            <input
              type="date"
              value={lastContactAt}
              onChange={(e) => setLastContactAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Data do próximo follow-up
            </label>
            <input
              type="date"
              value={nextFollowUpAt}
              onChange={(e) => setNextFollowUpAt(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Próxima ação
          </label>
          <input
            value={nextAction}
            onChange={(e) => setNextAction(e.target.value)}
            placeholder="Ex.: Enviar proposta comercial revisada"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Observações
          </label>
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Contexto comercial, dores identificadas, escopo discutido..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        {error ? (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
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
                : "Criar Lead"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

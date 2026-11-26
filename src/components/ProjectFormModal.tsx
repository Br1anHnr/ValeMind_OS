"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { PROJECT_STATUSES } from "@/lib/constants";
import type { ImportantLink, ProjectStatus } from "@/db/schema";
import type { SimpleUser } from "@/components/LeadFormModal";

export interface SimpleClient {
  id: string;
  company: string;
  name: string;
}

export interface ProjectFormData {
  id: string;
  name: string;
  clientId: string;
  description: string | null;
  ownerId: string | null;
  participants?: { id: string; name: string }[];
  status: ProjectStatus;
  startDate: string | null;
  dueDate: string | null;
  nextDelivery: string | null;
  soldValue: string | null;
  monthlyFee: string | null;
  githubUrl: string | null;
  productionUrl: string | null;
  importantLinks: ImportantLink[];
  notes: string | null;
}

interface ProjectFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  users: SimpleUser[];
  clients: SimpleClient[];
  initialProject?: ProjectFormData | null;
  defaultClientId?: string;
}

export function ProjectFormModal({
  open,
  onClose,
  onSaved,
  users,
  clients,
  initialProject,
  defaultClientId,
}: ProjectFormModalProps) {
  const isEditing = Boolean(initialProject);
  const [name, setName] = useState("");
  const [clientId, setClientId] = useState("");
  const [createNewClient, setCreateNewClient] = useState(false);
  const [newClientCompany, setNewClientCompany] = useState("");
  const [newClientName, setNewClientName] = useState("");
  const [newClientEmail, setNewClientEmail] = useState("");
  const [newClientPhone, setNewClientPhone] = useState("");
  const [description, setDescription] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [status, setStatus] = useState<ProjectStatus>("planejamento");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [nextDelivery, setNextDelivery] = useState("");
  const [soldValue, setSoldValue] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [productionUrl, setProductionUrl] = useState("");
  const [importantLinks, setImportantLinks] = useState<ImportantLink[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialProject) {
      setName(initialProject.name);
      setClientId(initialProject.clientId);
      setCreateNewClient(false);
      setNewClientCompany("");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setDescription(initialProject.description ?? "");
      setOwnerId(initialProject.ownerId ?? "");
      setParticipantIds(
        initialProject.participants?.map((p) => p.id) ??
          (initialProject.ownerId ? [initialProject.ownerId] : [])
      );
      setStatus(initialProject.status);
      setStartDate(initialProject.startDate?.slice(0, 10) ?? "");
      setDueDate(initialProject.dueDate?.slice(0, 10) ?? "");
      setNextDelivery(initialProject.nextDelivery ?? "");
      setSoldValue(initialProject.soldValue ?? "");
      setMonthlyFee(initialProject.monthlyFee ?? "");
      setGithubUrl(initialProject.githubUrl ?? "");
      setProductionUrl(initialProject.productionUrl ?? "");
      setImportantLinks(initialProject.importantLinks ?? []);
      setNotes(initialProject.notes ?? "");
    } else {
      setName("");
      const resolvedDefaultClient = defaultClientId ?? clients[0]?.id ?? "";
      setClientId(resolvedDefaultClient);
      setCreateNewClient(!defaultClientId && clients.length === 0);
      setNewClientCompany("");
      setNewClientName("");
      setNewClientEmail("");
      setNewClientPhone("");
      setDescription("");
      const defaultOwner = users[0]?.id ?? "";
      setOwnerId(defaultOwner);
      setParticipantIds(defaultOwner ? [defaultOwner] : []);
      setStatus("planejamento");
      setStartDate(new Date().toISOString().slice(0, 10));
      setDueDate("");
      setNextDelivery("");
      setSoldValue("");
      setMonthlyFee("");
      setGithubUrl("");
      setProductionUrl("");
      setImportantLinks([]);
      setNotes("");
    }
  }, [open, initialProject, defaultClientId, clients, users]);

  function toggleParticipant(id: string) {
    setParticipantIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  }

  function addLinkRow() {
    setImportantLinks((prev) => [...prev, { label: "", url: "" }]);
  }

  function updateLinkRow(index: number, field: "label" | "url", value: string) {
    setImportantLinks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  }

  function removeLinkRow(index: number) {
    setImportantLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const cleanedLinks = importantLinks.filter(
      (l) => l.label.trim() && l.url.trim()
    );

    try {
      const url = isEditing
        ? `/api/projects/${initialProject!.id}`
        : "/api/projects";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          clientId: !isEditing && createNewClient ? null : clientId,
          ...(!isEditing && createNewClient
            ? {
                newClient: {
                  company: newClientCompany,
                  name: newClientName || null,
                  email: newClientEmail || null,
                  phone: newClientPhone || null,
                },
              }
            : {}),
          description,
          ownerId: ownerId || null,
          participantIds,
          status,
          startDate: startDate || null,
          dueDate: dueDate || null,
          nextDelivery,
          soldValue: soldValue || null,
          monthlyFee: monthlyFee || null,
          githubUrl,
          productionUrl,
          importantLinks: cleanedLinks,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar projeto");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão ao salvar projeto.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Projeto" : "Novo Projeto"}
      description="Defina escopo, responsável, prazos, valores e links técnicos do projeto."
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Nome do projeto *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: E-commerce Real Mercado"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <div className="mb-1 flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-slate-700">
                Cliente *
              </label>
              {!isEditing && clients.length > 0 ? (
                <button
                  type="button"
                  onClick={() => setCreateNewClient((prev) => !prev)}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  {createNewClient ? "Selecionar existente" : "+ Cadastrar novo cliente"}
                </button>
              ) : null}
            </div>

            {!isEditing && createNewClient ? (
              <input
                required
                value={newClientCompany}
                onChange={(e) => setNewClientCompany(e.target.value)}
                placeholder="Empresa / Cliente (ex.: Real Mercado)"
                className="w-full rounded-xl border border-indigo-200 bg-indigo-50/30 px-3 py-2 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            ) : (
              <select
                required
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              >
                <option value="">Selecionar cliente</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.company} ({c.name})
                  </option>
                ))}
              </select>
            )}
          </div>

          {!isEditing && createNewClient ? (
            <div className="sm:col-span-2 grid grid-cols-1 gap-3 rounded-xl border border-indigo-100 bg-indigo-50/40 p-3.5 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Contato do cliente (opcional)
                </label>
                <input
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  placeholder="Ex.: João Silva"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  E-mail do cliente (opcional)
                </label>
                <input
                  type="email"
                  value={newClientEmail}
                  onChange={(e) => setNewClientEmail(e.target.value)}
                  placeholder="contato@empresa.com"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium text-slate-700">
                  Telefone / WhatsApp (opcional)
                </label>
                <input
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  placeholder="(11) 99999-9999"
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>
          ) : null}

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
              Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as ProjectStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            >
              {PROJECT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Data de início
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Prazo
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Valor vendido (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={soldValue}
              onChange={(e) => setSoldValue(e.target.value)}
              placeholder="12000.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Mensalidade (R$)
            </label>
            <input
              type="text"
              inputMode="decimal"
              value={monthlyFee}
              onChange={(e) => setMonthlyFee(e.target.value)}
              placeholder="1500.00"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Próxima entrega
            </label>
            <input
              value={nextDelivery}
              onChange={(e) => setNextDelivery(e.target.value)}
              placeholder="Ex.: Protótipo aprovado / Deploy em homologação"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Link do GitHub
            </label>
            <input
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/valemind/..."
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              URL de produção
            </label>
            <input
              value={productionUrl}
              onChange={(e) => setProductionUrl(e.target.value)}
              placeholder="https://app.cliente.com.br"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            />
          </div>
        </div>

        {/* Participantes */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-slate-700">
            Participantes
          </label>
          <div className="flex flex-wrap gap-2">
            {users.map((u) => {
              const checked = participantIds.includes(u.id);
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => toggleParticipant(u.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    checked
                      ? "border-indigo-300 bg-indigo-50 text-indigo-700"
                      : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  {u.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Descrição
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Objetivo do projeto e escopo principal..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        {/* Links importantes */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">
              Links importantes
            </label>
            <button
              type="button"
              onClick={addLinkRow}
              className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-500"
            >
              <Plus className="h-3.5 w-3.5" />
              Adicionar link
            </button>
          </div>
          {importantLinks.length > 0 ? (
            <div className="space-y-2">
              {importantLinks.map((link, idx) => (
                <div key={idx} className="flex gap-2">
                  <input
                    value={link.label}
                    onChange={(e) => updateLinkRow(idx, "label", e.target.value)}
                    placeholder="Nome (ex.: Figma)"
                    className="w-1/3 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <input
                    value={link.url}
                    onChange={(e) => updateLinkRow(idx, "url", e.target.value)}
                    placeholder="https://..."
                    className="flex-1 rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => removeLinkRow(idx)}
                    className="rounded-xl border border-slate-200 p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">
            Observações
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Notas operacionais ou técnicas..."
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
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
                : "Criar Projeto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

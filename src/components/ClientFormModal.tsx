"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/Modal";
import { CLIENT_STATUSES } from "@/lib/constants";
import type { ClientStatus, ImportantLink } from "@/db/schema";
import type { SimpleUser } from "@/components/LeadFormModal";

export interface ClientFormData {
  id: string;
  name: string;
  company: string;
  email: string | null;
  phone: string | null;
  website: string | null;
  instagram: string | null;
  ownerId: string | null;
  status: ClientStatus;
  importantLinks: ImportantLink[];
  notes: string | null;
}

interface ClientFormModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  users: SimpleUser[];
  initialClient?: ClientFormData | null;
}

export function ClientFormModal({
  open,
  onClose,
  onSaved,
  users,
  initialClient,
}: ClientFormModalProps) {
  const isEditing = Boolean(initialClient);
  const [company, setCompany] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [ownerId, setOwnerId] = useState("");
  const [status, setStatus] = useState<ClientStatus>("ativo");
  const [importantLinks, setImportantLinks] = useState<ImportantLink[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (initialClient) {
      setCompany(initialClient.company);
      setName(initialClient.name);
      setEmail(initialClient.email ?? "");
      setPhone(initialClient.phone ?? "");
      setWebsite(initialClient.website ?? "");
      setInstagram(initialClient.instagram ?? "");
      setOwnerId(initialClient.ownerId ?? "");
      setStatus(initialClient.status);
      setImportantLinks(initialClient.importantLinks ?? []);
      setNotes(initialClient.notes ?? "");
    } else {
      setCompany("");
      setName("");
      setEmail("");
      setPhone("");
      setWebsite("");
      setInstagram("");
      setOwnerId(users[0]?.id ?? "");
      setStatus("ativo");
      setImportantLinks([]);
      setNotes("");
    }
  }, [open, initialClient, users]);

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
        ? `/api/clients/${initialClient!.id}`
        : "/api/clients";
      const method = isEditing ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          company,
          name,
          email,
          phone,
          website,
          instagram,
          ownerId: ownerId || null,
          status,
          importantLinks: cleanedLinks,
          notes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar cliente");
        return;
      }

      onSaved();
      onClose();
    } catch {
      setError("Erro de conexão ao salvar cliente.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? "Editar Cliente" : "Novo Cliente"}
      description="Centralize os dados da empresa, responsável interno e links importantes."
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
              Nome do contato principal *
            </label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: João Silva"
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
              Responsável interno
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
              onChange={(e) => setStatus(e.target.value as ClientStatus)}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
            >
              {CLIENT_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Links importantes */}
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label className="text-xs font-medium text-slate-700">
              Links importantes (Drive, Figma, Contrato, etc.)
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
                    placeholder="Nome (ex.: Pasta Drive)"
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
                    aria-label="Remover link"
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
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Detalhes comerciais, acordos ou notas importantes sobre o cliente..."
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
                : "Criar Cliente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FolderKanban,
  KeyRound,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";
import {
  CREDENTIAL_TYPES,
  CREDENTIAL_TYPE_MAP,
  VAULT_SERVICES,
} from "@/lib/constants";
import type { CredentialType } from "@/db/schema";
import { ensureExternalUrl, formatDateTime } from "@/lib/format";
import { Modal } from "@/components/Modal";
import type { SimpleProject } from "@/components/TaskFormModal";

interface SecretMetadataItem {
  id: string;
  name: string;
  service: string;
  projectId: string | null;
  projectName: string | null;
  clientCompany: string | null;
  url: string | null;
  login: string | null;
  credentialType: CredentialType;
  notes: string | null;
  updatedByName: string | null;
  updatedAt: string;
}

export default function CofrePage() {
  const [secrets, setSecrets] = useState<SecretMetadataItem[]>([]);
  const [projects, setProjects] = useState<SimpleProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [serviceFilter, setServiceFilter] = useState("all");
  const [projectFilter, setProjectFilter] = useState("all");

  // Revealed secrets in memory only (auto-hidden after 30s and cleared on unmount)
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [revealingId, setRevealingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const hideTimersRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const timers = hideTimersRef.current;
    return () => {
      Object.values(timers).forEach(clearTimeout);
    };
  }, []);

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SecretMetadataItem | null>(null);
  const [name, setName] = useState("");
  const [service, setService] = useState("Vercel");
  const [projectId, setProjectId] = useState("");
  const [url, setUrl] = useState("");
  const [login, setLogin] = useState("");
  const [secretValue, setSecretValue] = useState("");
  const [credentialType, setCredentialType] = useState<CredentialType>("senha");
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
      if (serviceFilter !== "all") qs.set("service", serviceFilter);
      if (projectFilter !== "all") qs.set("projectId", projectFilter);

      const [secRes, projRes] = await Promise.all([
        fetch(`/api/vault?${qs.toString()}`),
        fetch("/api/projects"),
      ]);

      if (!secRes.ok) throw new Error("Erro ao carregar Cofre ValeMind.");
      setSecrets((await secRes.json()).secrets ?? []);
      if (projRes.ok) setProjects((await projRes.json()).projects ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar Cofre.");
    } finally {
      setLoading(false);
    }
  }, [search, serviceFilter, projectFilter]);

  useEffect(() => {
    const timer = setTimeout(loadData, 150);
    return () => clearTimeout(timer);
  }, [loadData]);

  function hideSecret(id: string) {
    if (hideTimersRef.current[id]) {
      clearTimeout(hideTimersRef.current[id]);
      delete hideTimersRef.current[id];
    }
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function revealSecret(id: string): Promise<string | null> {
    if (revealed[id]) return revealed[id];
    setRevealingId(id);
    try {
      const res = await fetch(`/api/vault/${id}/reveal`, { method: "POST" });
      if (!res.ok) return null;
      const data = await res.json();
      setRevealed((prev) => ({ ...prev, [id]: data.secretValue }));
      if (hideTimersRef.current[id]) clearTimeout(hideTimersRef.current[id]);
      hideTimersRef.current[id] = setTimeout(() => hideSecret(id), 30000);
      return data.secretValue as string;
    } finally {
      setRevealingId(null);
    }
  }

  async function copySecret(id: string) {
    const val = revealed[id] ?? (await revealSecret(id));
    if (!val) return;
    await navigator.clipboard.writeText(val);
    setCopiedId(id);
    setTimeout(() => {
      setCopiedId((cur) => (cur === id ? null : cur));
    }, 2000);
  }

  function openNew() {
    setFormError(null);
    setEditing(null);
    setName("");
    setService("Vercel");
    setProjectId("");
    setUrl("");
    setLogin("");
    setSecretValue("");
    setCredentialType("senha");
    setNotes("");
    setModalOpen(true);
  }

  function openEdit(item: SecretMetadataItem) {
    setFormError(null);
    setEditing(item);
    setName(item.name);
    setService(item.service);
    setProjectId(item.projectId ?? "");
    setUrl(item.url ?? "");
    setLogin(item.login ?? "");
    setSecretValue(""); // vazio = mantém segredo atual criptografado
    setCredentialType(item.credentialType);
    setNotes(item.notes ?? "");
    setModalOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setSaving(true);
    try {
      const endpoint = editing ? `/api/vault/${editing.id}` : "/api/vault";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          service,
          projectId: projectId || null,
          url,
          login,
          secretValue: secretValue || undefined,
          credentialType,
          notes,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setFormError(json.error ?? "Erro ao salvar credencial");
        return;
      }
      if (editing) hideSecret(editing.id);
      setModalOpen(false);
      loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: SecretMetadataItem) {
    if (!confirm(`Remover a credencial "${item.name}" do Cofre?`)) return;
    const res = await fetch(`/api/vault/${item.id}`, { method: "DELETE" });
    if (res.ok) {
      hideSecret(item.id);
      loadData();
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Cofre ValeMind
            </h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              <ShieldCheck className="h-3.5 w-3.5" />
              AES-256-GCM
            </span>
          </div>
          <p className="mt-0.5 text-sm text-slate-500">
            Credenciais, senhas e API Keys criptografadas no backend. Nunca armazenadas em texto puro.
          </p>
        </div>
        <button
          type="button"
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
        >
          <Plus className="h-4 w-4" />
          Nova Credencial
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs md:grid-cols-12">
        <div className="relative md:col-span-6">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, serviço ou projeto (nunca pelo segredo)..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-500 focus:bg-white focus:outline-none"
          />
        </div>
        <div className="md:col-span-3">
          <select
            value={serviceFilter}
            onChange={(e) => setServiceFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Todos os serviços</option>
            {VAULT_SERVICES.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>
        <div className="md:col-span-3">
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
          >
            <option value="all">Todos os projetos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
          Carregando Cofre ValeMind...
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error}
        </div>
      ) : secrets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Lock className="mx-auto h-10 w-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhuma credencial cadastrada no Cofre
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Armazene acessos de Supabase, Vercel, GitHub, APIs e servidores com criptografia real.
          </p>
          <button
            type="button"
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Adicionar primeira credencial
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {secrets.map((item) => {
            const typeMeta = CREDENTIAL_TYPE_MAP[item.credentialType];
            const isRevealed = Boolean(revealed[item.id]);
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-slate-900 px-2 py-0.5 text-[11px] font-semibold text-white">
                        {item.service}
                      </span>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${typeMeta.badgeClass}`}
                      >
                        {typeMeta.label}
                      </span>
                    </div>
                    <h2 className="mt-2 truncate text-base font-semibold text-slate-900">
                      {item.name}
                    </h2>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                      {item.projectId && item.projectName ? (
                        <Link
                          href={`/projetos/${item.projectId}`}
                          className="inline-flex items-center gap-1 font-medium text-indigo-600 hover:underline"
                        >
                          <FolderKanban className="h-3.5 w-3.5" />
                          {item.projectName}
                        </Link>
                      ) : (
                        <span>Interno ValeMind</span>
                      )}
                      {item.url ? (
                        <a
                          href={ensureExternalUrl(item.url)}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 hover:text-indigo-600 hover:underline"
                        >
                          Acessar serviço
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(item)}
                      className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(item)}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Login & Secret Box */}
                <div className="mt-4 space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  {item.login ? (
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="text-slate-500">Login / E-mail:</span>
                      <code className="truncate font-mono font-medium text-slate-800">
                        {item.login}
                      </code>
                    </div>
                  ) : null}

                  <div className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <KeyRound className="h-4 w-4 shrink-0 text-slate-400" />
                      <code className="truncate font-mono text-xs text-slate-900">
                        {isRevealed ? revealed[item.id] : "••••••••••••••••••••"}
                      </code>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        disabled={revealingId === item.id}
                        onClick={() =>
                          isRevealed
                            ? hideSecret(item.id)
                            : revealSecret(item.id)
                        }
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                      >
                        {isRevealed ? (
                          <>
                            <EyeOff className="h-3.5 w-3.5" />
                            Ocultar
                          </>
                        ) : (
                          <>
                            <Eye className="h-3.5 w-3.5" />
                            {revealingId === item.id ? "..." : "Revelar"}
                          </>
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => copySecret(item.id)}
                        className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                      >
                        {isCopied ? (
                          <>
                            <Check className="h-3.5 w-3.5 text-emerald-400" />
                            Copiado
                          </>
                        ) : (
                          <>
                            <Copy className="h-3.5 w-3.5" />
                            Copiar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {item.notes ? (
                  <p className="mt-3 text-xs text-slate-600">{item.notes}</p>
                ) : null}

                <p className="mt-3 text-[11px] text-slate-400">
                  Atualizado em {formatDateTime(item.updatedAt)}
                  {item.updatedByName ? ` por ${item.updatedByName}` : ""}
                </p>
              </div>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Editar Credencial" : "Nova Credencial no Cofre"}
        description="A senha, token ou API Key será criptografada no backend com AES-256-GCM antes de gravar no Neon."
        size="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Nome da credencial *
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex.: Supabase — Real Mercado"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Serviço *
              </label>
              <select
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {VAULT_SERVICES.map((svc) => (
                  <option key={svc} value={svc}>
                    {svc}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Tipo da credencial
              </label>
              <select
                value={credentialType}
                onChange={(e) =>
                  setCredentialType(e.target.value as CredentialType)
                }
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                {CREDENTIAL_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Projeto relacionado
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
              >
                <option value="">Uso interno ValeMind</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                    {p.clientCompany ? ` — ${p.clientCompany}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                URL do serviço
              </label>
              <input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://vercel.com/..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Login ou e-mail
              </label>
              <input
                value={login}
                onChange={(e) => setLogin(e.target.value)}
                placeholder="conta@valemind.com"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              {editing
                ? "Nova senha / chave (deixe vazio para manter a atual)"
                : "Senha, Token ou API Key *"}
            </label>
            <textarea
              required={!editing}
              rows={2}
              value={secretValue}
              onChange={(e) => setSecretValue(e.target.value)}
              placeholder={
                editing
                  ? "Preencha apenas se quiser substituir o segredo..."
                  : "Cole aqui a senha, token ou API Key"
              }
              className="w-full rounded-xl border border-slate-200 font-mono text-xs px-3 py-2"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Observações
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ambiente (produção/homologação), instruções de uso..."
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
              {saving ? "Criptografando..." : "Salvar no Cofre"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

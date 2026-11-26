"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  FolderKanban,
  Globe,
  Mail,
  Pencil,
  Phone,
  Plus,
  Trash2,
  User,
  Users,
} from "lucide-react";
import {
  CLIENT_STATUS_MAP,
  FINANCIAL_STATUS_MAP,
  PROJECT_STATUS_MAP,
} from "@/lib/constants";
import type {
  ClientStatus,
  FinancialStatus,
  ImportantLink,
  ProjectStatus,
} from "@/db/schema";
import {
  ensureExternalUrl,
  formatCurrency,
  formatDate,
  formatDateTime,
  isProjectOverdue,
} from "@/lib/format";
import {
  ClientFormModal,
  type ClientFormData,
} from "@/components/ClientFormModal";
import { ProjectFormModal } from "@/components/ProjectFormModal";
import type { SimpleUser } from "@/components/LeadFormModal";
import { Modal } from "@/components/Modal";

interface ClientDetailResponse {
  client: ClientFormData & {
    ownerName: string | null;
    createdAt: string;
    updatedAt: string;
  };
  contacts: {
    id: string;
    name: string;
    role: string | null;
    email: string | null;
    phone: string | null;
    isPrimary: boolean;
    notes: string | null;
  }[];
  projects: {
    id: string;
    name: string;
    status: ProjectStatus;
    ownerName: string | null;
    startDate: string | null;
    dueDate: string | null;
    nextDelivery: string | null;
    soldValue: string | null;
    monthlyFee: string | null;
    githubUrl: string | null;
    productionUrl: string | null;
  }[];
  meetings?: {
    id: string;
    title: string;
    meetingDate: string;
    decisions: string | null;
    nextActions: string | null;
  }[];
  financialEntries?: {
    id: string;
    description: string;
    amount: string;
    dueDate: string;
    status: FinancialStatus;
    entryType: string;
  }[];
  originLeads: {
    id: string;
    company: string;
    source: string | null;
    convertedAt: string | null;
  }[];
  activities: {
    id: string;
    description: string;
    createdAt: string;
    userName: string | null;
  }[];
}

export default function ClienteDetalhePage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const clientId = params.id;

  const [data, setData] = useState<ClientDetailResponse | null>(null);
  const [users, setUsers] = useState<SimpleUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editClientOpen, setEditClientOpen] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [contactModalOpen, setContactModalOpen] = useState(false);

  // Contact form
  const [contactName, setContactName] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactIsPrimary, setContactIsPrimary] = useState(false);
  const [savingContact, setSavingContact] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [clientRes, usersRes] = await Promise.all([
        fetch(`/api/clients/${clientId}`),
        fetch("/api/users"),
      ]);

      if (!clientRes.ok) {
        throw new Error(
          clientRes.status === 404
            ? "Cliente não encontrado."
            : "Erro ao carregar cliente."
        );
      }

      const clientJson = (await clientRes.json()) as ClientDetailResponse;
      setData(clientJson);

      if (usersRes.ok) {
        const usersJson = await usersRes.json();
        setUsers(usersJson.users ?? []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao carregar cliente.");
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function handleAddContact(e: React.FormEvent) {
    e.preventDefault();
    setSavingContact(true);
    try {
      const res = await fetch(`/api/clients/${clientId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: contactName,
          role: contactRole,
          email: contactEmail,
          phone: contactPhone,
          isPrimary: contactIsPrimary,
        }),
      });
      if (res.ok) {
        setContactName("");
        setContactRole("");
        setContactEmail("");
        setContactPhone("");
        setContactIsPrimary(false);
        setContactModalOpen(false);
        loadData();
      }
    } finally {
      setSavingContact(false);
    }
  }

  async function handleDeleteContact(contactId: string) {
    if (!confirm("Remover este contato?")) return;
    const res = await fetch(`/api/clients/${clientId}/contacts/${contactId}`, {
      method: "DELETE",
    });
    if (res.ok) loadData();
  }

  async function handleDeleteClient() {
    if (!data) return;
    if (
      !confirm(
        `Excluir o cliente "${data.client.company}" e todos os projetos vinculados?`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/clients/${clientId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/clientes");
    }
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
        Carregando página do cliente...
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link
          href="/clientes"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Voltar para Clientes
        </Link>
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-sm text-rose-700">
          {error ?? "Cliente não encontrado."}
        </div>
      </div>
    );
  }

  const {
    client,
    contacts,
    projects,
    meetings = [],
    financialEntries = [],
    originLeads,
    activities,
  } = data;
  const statusMeta = CLIENT_STATUS_MAP[client.status as ClientStatus];
  const totalSold = projects.reduce(
    (acc, p) => acc + Number(p.soldValue ?? 0),
    0
  );
  const totalMonthly = projects
    .filter((p) => p.status !== "encerrado")
    .reduce((acc, p) => acc + Number(p.monthlyFee ?? 0), 0);

  return (
    <div className="space-y-6">
      {/* Top breadcrumb + Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <Link
            href="/clientes"
            className="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Clientes
          </Link>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {client.company}
            </h1>
            <span
              className={`rounded-full border px-2.5 py-0.5 text-xs font-medium ${statusMeta.badgeClass}`}
            >
              {statusMeta.label}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Contato principal: <strong className="text-slate-700">{client.name}</strong>
            {" · "}Responsável interno:{" "}
            <strong className="text-slate-700">
              {client.ownerName || "Não definido"}
            </strong>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setNewProjectOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-xs hover:bg-indigo-500"
          >
            <Plus className="h-4 w-4" />
            Novo Projeto
          </button>
          <button
            type="button"
            onClick={() => setEditClientOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil className="h-4 w-4" />
            Editar
          </button>
          <button
            type="button"
            onClick={handleDeleteClient}
            className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Projetos vinculados
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {projects.length}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {projects.filter((p) => p.status !== "encerrado").length} ativos
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Valores contratados
          </p>
          <p className="mt-2 text-2xl font-bold text-slate-900">
            {formatCurrency(totalSold)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Soma dos projetos deste cliente
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500">
            Mensalidades ativas (MRR)
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {formatCurrency(totalMonthly)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Recorrência mensal ativa
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 cols: Projects + Contacts */}
        <div className="space-y-6 lg:col-span-2">
          {/* Projetos Vinculados */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderKanban className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Projetos vinculados
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setNewProjectOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar projeto
              </button>
            </div>

            {projects.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-sm text-slate-500">
                Nenhum projeto vinculado a este cliente ainda.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {projects.map((p) => {
                  const st = PROJECT_STATUS_MAP[p.status];
                  const overdue = isProjectOverdue(p.dueDate, p.status);
                  return (
                    <div
                      key={p.id}
                      className="flex flex-col gap-3 py-3.5 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Link
                            href={`/projetos/${p.id}`}
                            className="font-semibold text-slate-900 hover:text-indigo-600"
                          >
                            {p.name}
                          </Link>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${st.badgeClass}`}
                          >
                            {st.label}
                          </span>
                          {overdue ? (
                            <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                              Atrasado
                            </span>
                          ) : null}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                          {p.ownerName ? (
                            <span className="inline-flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {p.ownerName}
                            </span>
                          ) : null}
                          {p.dueDate ? (
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              Prazo: {formatDate(p.dueDate)}
                            </span>
                          ) : null}
                          {p.nextDelivery ? (
                            <span>Próx. entrega: {p.nextDelivery}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="shrink-0 text-left sm:text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {formatCurrency(p.soldValue)}
                        </div>
                        {Number(p.monthlyFee ?? 0) > 0 ? (
                          <div className="text-xs text-emerald-700">
                            {formatCurrency(p.monthlyFee)}/mês
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Contatos */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-indigo-600" />
                <h2 className="text-base font-semibold text-slate-900">
                  Contatos ({contacts.length})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setContactModalOpen(true)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 hover:text-indigo-500"
              >
                <Plus className="h-3.5 w-3.5" />
                Novo contato
              </button>
            </div>

            {contacts.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhum contato cadastrado.
              </p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {contacts.map((ct) => (
                  <div
                    key={ct.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-slate-200 p-3.5"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-semibold text-slate-900">
                          {ct.name}
                        </p>
                        {ct.isPrimary ? (
                          <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
                            Principal
                          </span>
                        ) : null}
                      </div>
                      {ct.role ? (
                        <p className="text-xs text-slate-500">{ct.role}</p>
                      ) : null}
                      {ct.email ? (
                        <p className="mt-1.5 flex items-center gap-1.5 truncate text-xs text-slate-600">
                          <Mail className="h-3.5 w-3.5 text-slate-400" />
                          {ct.email}
                        </p>
                      ) : null}
                      {ct.phone ? (
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-600">
                          <Phone className="h-3.5 w-3.5 text-slate-400" />
                          {ct.phone}
                        </p>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteContact(ct.id)}
                      className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      title="Remover contato"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Histórico de Reuniões e Decisões */}
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                Reuniões e Decisões ({meetings.length})
              </h2>
              <Link
                href="/reunioes"
                className="text-xs font-semibold text-indigo-600 hover:underline"
              >
                Ver todas
              </Link>
            </div>
            {meetings.length === 0 ? (
              <p className="text-sm text-slate-500">
                Nenhuma reunião registrada para este cliente.
              </p>
            ) : (
              <div className="space-y-3">
                {meetings.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200 p-3.5 text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-slate-900">{m.title}</p>
                      <span className="text-slate-400">
                        {formatDate(m.meetingDate)}
                      </span>
                    </div>
                    {m.decisions ? (
                      <p className="mt-1.5 text-emerald-800">
                        <strong>Decisões:</strong> {m.decisions}
                      </p>
                    ) : null}
                    {m.nextActions ? (
                      <p className="mt-1 text-slate-600">
                        <strong>Próximas ações:</strong> {m.nextActions}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Recebimentos do Cliente */}
          {financialEntries.length > 0 ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-slate-900">
                  Financeiro do cliente ({financialEntries.length})
                </h2>
                <Link
                  href="/financeiro"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Abrir Financeiro
                </Link>
              </div>
              <div className="divide-y divide-slate-100 text-xs">
                {financialEntries.map((fe) => {
                  const fst = FINANCIAL_STATUS_MAP[fe.status];
                  return (
                    <div
                      key={fe.id}
                      className="flex items-center justify-between gap-2 py-2.5 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-slate-900">
                          {fe.description}
                        </p>
                        <p className="text-slate-400">
                          Venc.: {formatDate(fe.dueDate)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="font-semibold text-slate-900">
                          {formatCurrency(fe.amount)}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${fst.badgeClass}`}
                        >
                          {fst.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : null}
        </div>

        {/* Right col: Details, Links, Notes, Activities */}
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Informações gerais
            </h2>
            <dl className="space-y-2.5 text-sm">
              {client.email ? (
                <div className="flex items-center gap-2 text-slate-700">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{client.email}</span>
                </div>
              ) : null}
              {client.phone ? (
                <div className="flex items-center gap-2 text-slate-700">
                  <Phone className="h-4 w-4 text-slate-400" />
                  <span>{client.phone}</span>
                </div>
              ) : null}
              {client.website ? (
                <div className="flex items-center gap-2 text-slate-700">
                  <Globe className="h-4 w-4 text-slate-400" />
                  <a
                    href={ensureExternalUrl(client.website)}
                    target="_blank"
                    rel="noreferrer"
                    className="truncate text-indigo-600 hover:underline"
                  >
                    {client.website}
                  </a>
                </div>
              ) : null}
              {client.instagram ? (
                <div className="text-xs text-slate-600">
                  Instagram:{" "}
                  <strong className="text-slate-900">{client.instagram}</strong>
                </div>
              ) : null}
              {originLeads.length > 0 ? (
                <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                  Convertido do lead <strong>{originLeads[0].company}</strong>
                  {originLeads[0].source ? ` (${originLeads[0].source})` : ""}
                  {originLeads[0].convertedAt
                    ? ` em ${formatDate(originLeads[0].convertedAt)}`
                    : ""}
                </div>
              ) : null}
            </dl>

            {(client.importantLinks as ImportantLink[])?.length > 0 ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Links importantes
                </p>
                <div className="space-y-1.5">
                  {(client.importantLinks as ImportantLink[]).map((l, idx) => (
                    <a
                      key={idx}
                      href={ensureExternalUrl(l.url)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                    >
                      <span className="truncate">{l.label}</span>
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            ) : null}

            {client.notes ? (
              <div className="mt-4 border-t border-slate-100 pt-4">
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Observações
                </p>
                <p className="whitespace-pre-wrap text-sm text-slate-700">
                  {client.notes}
                </p>
              </div>
            ) : null}
          </section>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
              Histórico recente
            </h2>
            {activities.length === 0 ? (
              <p className="text-xs text-slate-500">
                Sem atividades registradas.
              </p>
            ) : (
              <ul className="space-y-3">
                {activities.map((a) => (
                  <li key={a.id} className="text-xs">
                    <p className="text-slate-800">{a.description}</p>
                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {a.userName ?? "Sistema"} · {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      <ClientFormModal
        open={editClientOpen}
        onClose={() => setEditClientOpen(false)}
        onSaved={loadData}
        users={users}
        initialClient={client}
      />

      <ProjectFormModal
        open={newProjectOpen}
        onClose={() => setNewProjectOpen(false)}
        onSaved={loadData}
        users={users}
        clients={[
          { id: client.id, company: client.company, name: client.name },
        ]}
        defaultClientId={client.id}
      />

      <Modal
        open={contactModalOpen}
        onClose={() => setContactModalOpen(false)}
        title="Novo Contato"
        description={`Adicionar pessoa de contato para ${client.company}.`}
        size="md"
      >
        <form onSubmit={handleAddContact} className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Nome *
            </label>
            <input
              required
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">
              Cargo / Papel
            </label>
            <input
              value={contactRole}
              onChange={(e) => setContactRole(e.target.value)}
              placeholder="Ex.: Sócio, Financeiro, Marketing"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                E-mail
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Telefone
              </label>
              <input
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-700">
            <input
              type="checkbox"
              checked={contactIsPrimary}
              onChange={(e) => setContactIsPrimary(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600"
            />
            Definir como contato principal
          </label>
          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setContactModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={savingContact}
              className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-500 disabled:opacity-60"
            >
              {savingContact ? "Salvando..." : "Adicionar contato"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

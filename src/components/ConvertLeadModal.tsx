"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Building2, FolderKanban } from "lucide-react";
import { Modal } from "@/components/Modal";
import { CLIENT_STATUSES, PROJECT_STATUSES } from "@/lib/constants";
import type { ClientStatus, ProjectStatus } from "@/db/schema";
import type { LeadRecord, SimpleUser } from "@/components/LeadFormModal";

interface ConvertLeadModalProps {
  open: boolean;
  onClose: () => void;
  onConverted: () => void;
  lead: LeadRecord | null;
  users: SimpleUser[];
}

export function ConvertLeadModal({
  open,
  onClose,
  onConverted,
  lead,
  users,
}: ConvertLeadModalProps) {
  const router = useRouter();
  const [clientName, setClientName] = useState("");
  const [clientCompany, setClientCompany] = useState("");
  const [clientStatus, setClientStatus] = useState<ClientStatus>("onboarding");
  const [ownerId, setOwnerId] = useState("");
  const [createProject, setCreateProject] = useState(true);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const [projectStatus, setProjectStatus] = useState<ProjectStatus>("planejamento");
  const [soldValue, setSoldValue] = useState("");
  const [monthlyFee, setMonthlyFee] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [nextDelivery, setNextDelivery] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !lead) return;
    setError(null);
    setClientName(lead.contactName);
    setClientCompany(lead.company);
    setClientStatus("onboarding");
    setOwnerId(lead.ownerId ?? users[0]?.id ?? "");
    setCreateProject(true);
    setProjectName(`Projeto ${lead.company}`);
    setProjectDescription(lead.notes ?? "");
    setProjectStatus("planejamento");
    setSoldValue(lead.potentialValue ?? "");
    setMonthlyFee("");
    setStartDate(new Date().toISOString().slice(0, 10));
    setDueDate("");
    setNextDelivery("");
  }, [open, lead, users]);

  if (!lead) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch(`/api/leads/${lead!.id}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName,
          clientCompany,
          clientStatus,
          ownerId: ownerId || null,
          createProject,
          projectName: createProject ? projectName : null,
          projectDescription: createProject ? projectDescription : null,
          projectStatus,
          soldValue: createProject ? soldValue || null : null,
          monthlyFee: createProject ? monthlyFee || null : null,
          startDate: createProject ? startDate || null : null,
          dueDate: createProject ? dueDate || null : null,
          nextDelivery: createProject ? nextDelivery || null : null,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Erro ao converter lead");
        return;
      }

      onConverted();
      onClose();

      if (data.project?.id) {
        router.push(`/projetos/${data.project.id}`);
      } else if (data.client?.id) {
        router.push(`/clientes/${data.client.id}`);
      }
    } catch {
      setError("Erro de conexão ao converter lead.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Converter Lead em Cliente + Projeto"
      description={`Os dados de contato de "${lead.company}" serão aproveitados automaticamente sem retrabalho.`}
      size="xl"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-indigo-600" />
            <span>Dados do Cliente</span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Empresa *
              </label>
              <input
                required
                value={clientCompany}
                onChange={(e) => setClientCompany(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Contato principal *
              </label>
              <input
                required
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
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
                <option value="">Selecionar responsável</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Status do cliente
              </label>
              <select
                value={clientStatus}
                onChange={(e) => setClientStatus(e.target.value as ClientStatus)}
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
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <FolderKanban className="h-4 w-4 text-emerald-600" />
              <span>Projeto Inicial</span>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
              <input
                type="checkbox"
                checked={createProject}
                onChange={(e) => setCreateProject(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Criar projeto agora
            </label>
          </div>

          {createProject ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Nome do projeto *
                </label>
                <input
                  required={createProject}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="Ex.: E-commerce Real Mercado"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Status inicial
                </label>
                <select
                  value={projectStatus}
                  onChange={(e) =>
                    setProjectStatus(e.target.value as ProjectStatus)
                  }
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
                  Próxima entrega
                </label>
                <input
                  value={nextDelivery}
                  onChange={(e) => setNextDelivery(e.target.value)}
                  placeholder="Ex.: Kickoff e arquitetura"
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
                  placeholder="5000.00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Mensalidade / Recorrência (R$)
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={monthlyFee}
                  onChange={(e) => setMonthlyFee(e.target.value)}
                  placeholder="800.00"
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
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
                  Prazo previsto
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs font-medium text-slate-700">
                  Descrição do projeto
                </label>
                <textarea
                  rows={2}
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  placeholder="Resumo do escopo contratado..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
                />
              </div>
            </div>
          ) : null}
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
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 disabled:opacity-60"
          >
            <ArrowRightLeft className="h-4 w-4" />
            <span>
              {saving
                ? "Convertendo..."
                : createProject
                  ? "Converter em Cliente + Projeto"
                  : "Converter em Cliente"}
            </span>
          </button>
        </div>
      </form>
    </Modal>
  );
}

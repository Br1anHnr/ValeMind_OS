import type {
  ClientStatus,
  CredentialType,
  FinancialEntryType,
  FinancialStatus,
  LeadStage,
  MeetingType,
  ProjectStatus,
  ProposalStatus,
  TaskPriority,
  TaskStatus,
} from "@/db/schema";

export const LEAD_STAGES: {
  value: LeadStage;
  label: string;
  color: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    value: "identificado",
    label: "Identificado",
    color: "#64748b",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  {
    value: "contatado",
    label: "Contatado",
    color: "#0284c7",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
    dotClass: "bg-sky-500",
  },
  {
    value: "respondeu",
    label: "Respondeu",
    color: "#2563eb",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  {
    value: "reuniao",
    label: "Reunião",
    color: "#7c3aed",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  {
    value: "proposta",
    label: "Proposta",
    color: "#d97706",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
    dotClass: "bg-amber-500",
  },
  {
    value: "negociacao",
    label: "Negociação",
    color: "#ea580c",
    badgeClass: "bg-orange-50 text-orange-700 border-orange-200",
    dotClass: "bg-orange-500",
  },
  {
    value: "fechado",
    label: "Fechado",
    color: "#059669",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
  {
    value: "perdido",
    label: "Perdido",
    color: "#dc2626",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
    dotClass: "bg-rose-500",
  },
];

export const LEAD_STAGE_ORDER: Record<LeadStage, number> = {
  identificado: 0,
  contatado: 1,
  respondeu: 2,
  reuniao: 3,
  proposta: 4,
  negociacao: 5,
  fechado: 6,
  perdido: -1,
};

export const LEAD_STAGE_MAP = Object.fromEntries(
  LEAD_STAGES.map((s) => [s.value, s])
) as Record<LeadStage, (typeof LEAD_STAGES)[number]>;

export const LEAD_SOURCES = [
  "Prospecção Ativa",
  "Instagram",
  "WhatsApp",
  "Indicação",
  "Google / Site",
  "LinkedIn",
  "Evento / Networking",
  "Outro",
];

export const CLIENT_STATUSES: {
  value: ClientStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "ativo",
    label: "Ativo",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "onboarding",
    label: "Onboarding",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "pausado",
    label: "Pausado",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "encerrado",
    label: "Encerrado",
    badgeClass: "bg-slate-100 text-slate-600 border-slate-200",
  },
];

export const CLIENT_STATUS_MAP = Object.fromEntries(
  CLIENT_STATUSES.map((s) => [s.value, s])
) as Record<ClientStatus, (typeof CLIENT_STATUSES)[number]>;

export const PROJECT_STATUSES: {
  value: ProjectStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "planejamento",
    label: "Planejamento",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "desenvolvimento",
    label: "Desenvolvimento",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "homologacao",
    label: "Homologação",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    value: "producao",
    label: "Produção",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "manutencao",
    label: "Manutenção",
    badgeClass: "bg-teal-50 text-teal-700 border-teal-200",
  },
  {
    value: "encerrado",
    label: "Encerrado",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
];

export const PROJECT_STATUS_MAP = Object.fromEntries(
  PROJECT_STATUSES.map((s) => [s.value, s])
) as Record<ProjectStatus, (typeof PROJECT_STATUSES)[number]>;

export const PROPOSAL_STATUSES: {
  value: ProposalStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "rascunho",
    label: "Rascunho",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "enviada",
    label: "Enviada",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  {
    value: "em_negociacao",
    label: "Em negociação",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "aprovada",
    label: "Aprovada",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "recusada",
    label: "Recusada",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    value: "expirada",
    label: "Expirada",
    badgeClass: "bg-zinc-100 text-zinc-600 border-zinc-200",
  },
];

export const PROPOSAL_STATUS_MAP = Object.fromEntries(
  PROPOSAL_STATUSES.map((s) => [s.value, s])
) as Record<ProposalStatus, (typeof PROPOSAL_STATUSES)[number]>;

export const TASK_STATUSES: {
  value: TaskStatus;
  label: string;
  badgeClass: string;
  dotClass: string;
}[] = [
  {
    value: "a_fazer",
    label: "A fazer",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-400",
  },
  {
    value: "em_andamento",
    label: "Em andamento",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
    dotClass: "bg-blue-500",
  },
  {
    value: "revisao",
    label: "Revisão",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
    dotClass: "bg-violet-500",
  },
  {
    value: "concluido",
    label: "Concluído",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dotClass: "bg-emerald-500",
  },
];

export const TASK_STATUS_MAP = Object.fromEntries(
  TASK_STATUSES.map((s) => [s.value, s])
) as Record<TaskStatus, (typeof TASK_STATUSES)[number]>;

export const TASK_PRIORITIES: {
  value: TaskPriority;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "baixa",
    label: "Baixa",
    badgeClass: "bg-slate-50 text-slate-600 border-slate-200",
  },
  {
    value: "media",
    label: "Média",
    badgeClass: "bg-sky-50 text-sky-700 border-sky-200",
  },
  {
    value: "alta",
    label: "Alta",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "urgente",
    label: "Urgente",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
];

export const TASK_PRIORITY_MAP = Object.fromEntries(
  TASK_PRIORITIES.map((p) => [p.value, p])
) as Record<TaskPriority, (typeof TASK_PRIORITIES)[number]>;

export const FINANCIAL_STATUSES: {
  value: FinancialStatus;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "previsto",
    label: "Previsto",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "pendente",
    label: "Pendente",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "pago",
    label: "Pago",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "atrasado",
    label: "Atrasado",
    badgeClass: "bg-rose-50 text-rose-700 border-rose-200",
  },
  {
    value: "cancelado",
    label: "Cancelado",
    badgeClass: "bg-zinc-100 text-zinc-500 border-zinc-200",
  },
];

export const FINANCIAL_STATUS_MAP = Object.fromEntries(
  FINANCIAL_STATUSES.map((s) => [s.value, s])
) as Record<FinancialStatus, (typeof FINANCIAL_STATUSES)[number]>;

export const FINANCIAL_ENTRY_TYPES: {
  value: FinancialEntryType;
  label: string;
}[] = [
  { value: "pontual", label: "Pontual" },
  { value: "recorrente", label: "Recorrente (Mensalidade)" },
];

export const PAYMENT_METHODS = [
  "PIX",
  "Boleto",
  "Cartão de Crédito",
  "Transferência / TED",
  "Stripe / Asaas",
  "Outro",
];

export const MEETING_TYPES: { value: MeetingType; label: string }[] = [
  { value: "cliente", label: "Com cliente" },
  { value: "interna", label: "Interna ValeMind" },
];

export const VAULT_SERVICES = [
  "Neon Postgres",
  "Supabase",
  "Vercel",
  "GitHub",
  "ClickUp",
  "Servidor / VPS",
  "API Externa",
  "Domínio / DNS",
  "E-mail",
  "Stripe / Pagamentos",
  "OpenAI / IA",
  "Outro",
];

export const CREDENTIAL_TYPES: {
  value: CredentialType;
  label: string;
  badgeClass: string;
}[] = [
  {
    value: "senha",
    label: "Login e Senha",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
  },
  {
    value: "api_key",
    label: "API Key",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  {
    value: "token",
    label: "Token",
    badgeClass: "bg-violet-50 text-violet-700 border-violet-200",
  },
  {
    value: "ssh",
    label: "Chave SSH",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  {
    value: "env",
    label: "Variável / Connection String",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  {
    value: "outro",
    label: "Outro",
    badgeClass: "bg-zinc-100 text-zinc-700 border-zinc-200",
  },
];

export const CREDENTIAL_TYPE_MAP = Object.fromEntries(
  CREDENTIAL_TYPES.map((t) => [t.value, t])
) as Record<CredentialType, (typeof CREDENTIAL_TYPES)[number]>;

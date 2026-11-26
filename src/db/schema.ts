import {
  pgTable,
  pgEnum,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  numeric,
  date,
  jsonb,
  primaryKey,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export type ImportantLink = {
  label: string;
  url: string;
};

export const userRoleEnum = pgEnum("user_role", ["founder", "member"]);

export const leadStageEnum = pgEnum("lead_stage", [
  "identificado",
  "contatado",
  "respondeu",
  "reuniao",
  "proposta",
  "negociacao",
  "fechado",
  "perdido",
]);

export const clientStatusEnum = pgEnum("client_status", [
  "ativo",
  "onboarding",
  "pausado",
  "encerrado",
]);

export const projectStatusEnum = pgEnum("project_status", [
  "planejamento",
  "desenvolvimento",
  "homologacao",
  "producao",
  "manutencao",
  "encerrado",
]);

export const activityEntityEnum = pgEnum("activity_entity", [
  "lead",
  "client",
  "project",
  "proposal",
  "task",
  "financial",
  "meeting",
  "secret",
  "contract",
  "user",
  "system",
]);

export const contractDocStatusEnum = pgEnum("contract_doc_status", [
  "rascunho",
  "enviado",
  "assinado",
  "cancelado",
]);

export const contractTemplateTypeEnum = pgEnum("contract_template_type", [
  "desenvolvimento",
  "manutencao",
  "desenvolvimento_manutencao",
]);

export const contractIpModeEnum = pgEnum("contract_ip_mode", [
  "cessao_apos_quitacao",
  "licenca_mensal",
]);

export const financialStatusEnum = pgEnum("financial_status", [
  "previsto",
  "pendente",
  "pago",
  "atrasado",
  "cancelado",
]);

export const financialEntryTypeEnum = pgEnum("financial_entry_type", [
  "pontual",
  "recorrente",
]);

export const meetingTypeEnum = pgEnum("meeting_type", ["interna", "cliente"]);

export const credentialTypeEnum = pgEnum("credential_type", [
  "senha",
  "api_key",
  "token",
  "ssh",
  "env",
  "outro",
]);

export const proposalStatusEnum = pgEnum("proposal_status", [
  "rascunho",
  "enviada",
  "em_negociacao",
  "aprovada",
  "recusada",
  "expirada",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "a_fazer",
  "em_andamento",
  "revisao",
  "concluido",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "baixa",
  "media",
  "alta",
  "urgente",
]);

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: userRoleEnum("role").notNull().default("founder"),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("sessions_user_id_idx").on(table.userId)]
);

export const clients = pgTable(
  "clients",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    company: text("company").notNull(),
    email: text("email"),
    phone: text("phone"),
    website: text("website"),
    instagram: text("instagram"),
    legalName: text("legal_name"),
    document: text("document"),
    address: text("address"),
    representativeName: text("representative_name"),
    representativeCpf: text("representative_cpf"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    status: clientStatusEnum("status").notNull().default("ativo"),
    importantLinks: jsonb("important_links")
      .$type<ImportantLink[]>()
      .notNull()
      .default([]),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("clients_owner_id_idx").on(table.ownerId),
    index("clients_status_idx").on(table.status),
  ]
);

export const leads = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    company: text("company").notNull(),
    contactName: text("contact_name").notNull(),
    phone: text("phone"),
    email: text("email"),
    website: text("website"),
    instagram: text("instagram"),
    source: text("source"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    stage: leadStageEnum("stage").notNull().default("identificado"),
    lastContactAt: timestamp("last_contact_at", { withTimezone: true }),
    nextAction: text("next_action"),
    nextFollowUpAt: timestamp("next_follow_up_at", { withTimezone: true }),
    potentialValue: numeric("potential_value", { precision: 12, scale: 2 }),
    notes: text("notes"),
    convertedClientId: uuid("converted_client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    convertedAt: timestamp("converted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("leads_stage_idx").on(table.stage),
    index("leads_owner_id_idx").on(table.ownerId),
    index("leads_converted_client_id_idx").on(table.convertedClientId),
  ]
);

export const contacts = pgTable(
  "contacts",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    role: text("role"),
    email: text("email"),
    phone: text("phone"),
    isPrimary: boolean("is_primary").notNull().default(false),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("contacts_client_id_idx").on(table.clientId)]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    description: text("description"),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    status: projectStatusEnum("status").notNull().default("planejamento"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    nextDelivery: text("next_delivery"),
    soldValue: numeric("sold_value", { precision: 12, scale: 2 }),
    monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }),
    githubUrl: text("github_url"),
    productionUrl: text("production_url"),
    importantLinks: jsonb("important_links")
      .$type<ImportantLink[]>()
      .notNull()
      .default([]),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("projects_client_id_idx").on(table.clientId),
    index("projects_owner_id_idx").on(table.ownerId),
    index("projects_status_idx").on(table.status),
  ]
);

export const projectParticipants = pgTable(
  "project_participants",
  {
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [primaryKey({ columns: [table.projectId, table.userId] })]
);

export const activities = pgTable(
  "activities",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    entityType: activityEntityEnum("entity_type").notNull(),
    entityId: uuid("entity_id").notNull(),
    action: text("action").notNull(),
    description: text("description").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("activities_entity_idx").on(table.entityType, table.entityId),
    index("activities_created_at_idx").on(table.createdAt),
  ]
);

export const proposals = pgTable(
  "proposals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    leadId: uuid("lead_id").references(() => leads.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    status: proposalStatusEnum("status").notNull().default("rascunho"),
    totalValue: numeric("total_value", { precision: 12, scale: 2 }),
    setupValue: numeric("setup_value", { precision: 12, scale: 2 }),
    monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    validUntil: date("valid_until"),
    documentUrl: text("document_url"),
    scope: text("scope"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("proposals_lead_id_idx").on(table.leadId),
    index("proposals_client_id_idx").on(table.clientId),
    index("proposals_status_idx").on(table.status),
  ]
);

export const tasks = pgTable(
  "tasks",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    assigneeId: uuid("assignee_id").references(() => users.id, {
      onDelete: "set null",
    }),
    priority: taskPriorityEnum("priority").notNull().default("media"),
    dueDate: date("due_date"),
    status: taskStatusEnum("status").notNull().default("a_fazer"),
    description: text("description"),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("tasks_project_id_idx").on(table.projectId),
    index("tasks_client_id_idx").on(table.clientId),
    index("tasks_assignee_id_idx").on(table.assigneeId),
    index("tasks_status_idx").on(table.status),
    index("tasks_due_date_idx").on(table.dueDate),
  ]
);

export const recurringPayments = pgTable(
  "recurring_payments",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    totalSoldValue: numeric("total_sold_value", { precision: 12, scale: 2 }),
    setupValue: numeric("setup_value", { precision: 12, scale: 2 }),
    monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }),
    billingStartDate: date("billing_start_date"),
    dueDay: integer("due_day").notNull().default(10),
    paymentMethod: text("payment_method"),
    installmentsCount: integer("installments_count").notNull().default(1),
    active: boolean("active").notNull().default(true),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex("recurring_payments_project_id_uidx").on(table.projectId),
    index("recurring_payments_client_id_idx").on(table.clientId),
  ]
);

export const financialEntries = pgTable(
  "financial_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    recurringPaymentId: uuid("recurring_payment_id").references(
      () => recurringPayments.id,
      { onDelete: "set null" }
    ),
    description: text("description").notNull(),
    entryType: financialEntryTypeEnum("entry_type").notNull().default("pontual"),
    referenceMonth: text("reference_month"),
    amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
    dueDate: date("due_date").notNull(),
    paidAt: date("paid_at"),
    status: financialStatusEnum("status").notNull().default("pendente"),
    paymentMethod: text("payment_method"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("financial_entries_client_id_idx").on(table.clientId),
    index("financial_entries_project_id_idx").on(table.projectId),
    index("financial_entries_status_idx").on(table.status),
    index("financial_entries_due_date_idx").on(table.dueDate),
    uniqueIndex("financial_entries_recurring_month_uidx").on(
      table.recurringPaymentId,
      table.referenceMonth
    ),
  ]
);

export const meetings = pgTable(
  "meetings",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    meetingDate: timestamp("meeting_date", { withTimezone: true }).notNull(),
    meetingType: meetingTypeEnum("meeting_type").notNull().default("cliente"),
    clientId: uuid("client_id").references(() => clients.id, {
      onDelete: "set null",
    }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    participants: text("participants"),
    topicsDiscussed: text("topics_discussed"),
    decisions: text("decisions"),
    nextActions: text("next_actions"),
    responsibles: text("responsibles"),
    dueDate: date("due_date"),
    notes: text("notes"),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("meetings_client_id_idx").on(table.clientId),
    index("meetings_project_id_idx").on(table.projectId),
    index("meetings_date_idx").on(table.meetingDate),
  ]
);

export const weeklyGoals = pgTable(
  "weekly_goals",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    title: text("title").notNull(),
    weekStart: date("week_start").notNull(),
    ownerId: uuid("owner_id").references(() => users.id, { onDelete: "set null" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    completed: boolean("completed").notNull().default(false),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [index("weekly_goals_week_start_idx").on(table.weekStart)]
);

export const secrets = pgTable(
  "secrets",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    service: text("service").notNull(),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    url: text("url"),
    login: text("login"),
    encryptedSecret: text("encrypted_secret").notNull(),
    credentialType: credentialTypeEnum("credential_type")
      .notNull()
      .default("senha"),
    notes: text("notes"),
    updatedById: uuid("updated_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("secrets_project_id_idx").on(table.projectId),
    index("secrets_service_idx").on(table.service),
  ]
);

export const companySettings = pgTable("company_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  legalName: text("legal_name").notNull().default("ValeMind"),
  tradeName: text("trade_name").notNull().default("ValeMind"),
  cnpj: text("cnpj"),
  address: text("address"),
  city: text("city"),
  state: text("state"),
  representativeName: text("representative_name"),
  representativeCpf: text("representative_cpf"),
  email: text("email"),
  phone: text("phone"),
  pixKey: text("pix_key"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const contractDocuments = pgTable(
  "contract_documents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    contractNumber: text("contract_number").notNull().unique(),
    title: text("title").notNull(),
    templateType: contractTemplateTypeEnum("template_type")
      .notNull()
      .default("desenvolvimento_manutencao"),
    clientId: uuid("client_id")
      .notNull()
      .references(() => clients.id, { onDelete: "cascade" }),
    projectId: uuid("project_id").references(() => projects.id, {
      onDelete: "set null",
    }),
    status: contractDocStatusEnum("status").notNull().default("rascunho"),
    totalValue: numeric("total_value", { precision: 12, scale: 2 }),
    setupValue: numeric("setup_value", { precision: 12, scale: 2 }),
    monthlyFee: numeric("monthly_fee", { precision: 12, scale: 2 }),
    dueDay: integer("due_day").notNull().default(10),
    paymentMethod: text("payment_method"),
    startDate: date("start_date"),
    dueDate: date("due_date"),
    ipMode: contractIpModeEnum("ip_mode")
      .notNull()
      .default("cessao_apos_quitacao"),
    content: text("content").notNull(),
    signedUrl: text("signed_url"),
    signedAt: timestamp("signed_at", { withTimezone: true }),
    createdById: uuid("created_by_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("contract_documents_client_id_idx").on(table.clientId),
    index("contract_documents_project_id_idx").on(table.projectId),
    index("contract_documents_status_idx").on(table.status),
  ]
);

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  ownedLeads: many(leads),
  ownedClients: many(clients),
  ownedProjects: many(projects),
  participatingProjects: many(projectParticipants),
  activities: many(activities),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const clientsRelations = relations(clients, ({ one, many }) => ({
  owner: one(users, {
    fields: [clients.ownerId],
    references: [users.id],
  }),
  contacts: many(contacts),
  projects: many(projects),
  originLeads: many(leads),
}));

export const leadsRelations = relations(leads, ({ one }) => ({
  owner: one(users, {
    fields: [leads.ownerId],
    references: [users.id],
  }),
  convertedClient: one(clients, {
    fields: [leads.convertedClientId],
    references: [clients.id],
  }),
}));

export const contactsRelations = relations(contacts, ({ one }) => ({
  client: one(clients, {
    fields: [contacts.clientId],
    references: [clients.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
  owner: one(users, {
    fields: [projects.ownerId],
    references: [users.id],
  }),
  participants: many(projectParticipants),
}));

export const projectParticipantsRelations = relations(
  projectParticipants,
  ({ one }) => ({
    project: one(projects, {
      fields: [projectParticipants.projectId],
      references: [projects.id],
    }),
    user: one(users, {
      fields: [projectParticipants.userId],
      references: [users.id],
    }),
  })
);

export const activitiesRelations = relations(activities, ({ one }) => ({
  user: one(users, {
    fields: [activities.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type Lead = typeof leads.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Proposal = typeof proposals.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type RecurringPayment = typeof recurringPayments.$inferSelect;
export type FinancialEntry = typeof financialEntries.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type WeeklyGoal = typeof weeklyGoals.$inferSelect;
export type Secret = typeof secrets.$inferSelect;
export type CompanySettings = typeof companySettings.$inferSelect;
export type ContractDocument = typeof contractDocuments.$inferSelect;
export type Activity = typeof activities.$inferSelect;
export type LeadStage = (typeof leadStageEnum.enumValues)[number];
export type ClientStatus = (typeof clientStatusEnum.enumValues)[number];
export type ProjectStatus = (typeof projectStatusEnum.enumValues)[number];
export type ProposalStatus = (typeof proposalStatusEnum.enumValues)[number];
export type TaskStatus = (typeof taskStatusEnum.enumValues)[number];
export type TaskPriority = (typeof taskPriorityEnum.enumValues)[number];
export type FinancialStatus = (typeof financialStatusEnum.enumValues)[number];
export type FinancialEntryType = (typeof financialEntryTypeEnum.enumValues)[number];
export type MeetingType = (typeof meetingTypeEnum.enumValues)[number];
export type CredentialType = (typeof credentialTypeEnum.enumValues)[number];
export type ContractDocStatus = (typeof contractDocStatusEnum.enumValues)[number];
export type ContractTemplateType = (typeof contractTemplateTypeEnum.enumValues)[number];
export type ContractIpMode = (typeof contractIpModeEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];

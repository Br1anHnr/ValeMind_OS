import { z } from "zod";
import {
  clientStatusEnum,
  credentialTypeEnum,
  financialEntryTypeEnum,
  financialStatusEnum,
  leadStageEnum,
  meetingTypeEnum,
  projectStatusEnum,
  proposalStatusEnum,
  taskPriorityEnum,
  taskStatusEnum,
} from "@/db/schema";

const optionalString = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null));

const optionalUuid = z
  .string()
  .trim()
  .optional()
  .nullable()
  .transform((val) => (val && val.length > 0 ? val : null))
  .refine(
    (val) =>
      val === null ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val),
    "ID inválido"
  );

export const importantLinkSchema = z.object({
  label: z.string().trim().min(1, "Informe o rótulo do link"),
  url: z.string().trim().min(1, "Informe a URL"),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Informe um e-mail válido"),
  password: z.string().min(1, "Informe a senha"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "Informe a senha atual"),
  newPassword: z.string().min(6, "A nova senha deve ter pelo menos 6 caracteres"),
});

export const leadInputSchema = z.object({
  company: z.string().trim().min(1, "Empresa é obrigatória"),
  contactName: z.string().trim().min(1, "Nome do contato é obrigatório"),
  phone: optionalString,
  email: optionalString,
  website: optionalString,
  instagram: optionalString,
  source: optionalString,
  ownerId: optionalUuid,
  stage: z.enum(leadStageEnum.enumValues).default("identificado"),
  lastContactAt: optionalString,
  nextAction: optionalString,
  nextFollowUpAt: optionalString,
  potentialValue: z.union([z.string(), z.number()]).optional().nullable(),
  notes: optionalString,
});

export const leadPatchSchema = leadInputSchema.partial();

export const convertLeadSchema = z.object({
  clientName: z.string().trim().min(1, "Nome do cliente é obrigatório"),
  clientCompany: z.string().trim().min(1, "Empresa do cliente é obrigatória"),
  clientStatus: z.enum(clientStatusEnum.enumValues).default("onboarding"),
  ownerId: optionalUuid,
  createProject: z.boolean().default(true),
  projectName: optionalString,
  projectDescription: optionalString,
  projectStatus: z.enum(projectStatusEnum.enumValues).default("planejamento"),
  soldValue: z.union([z.string(), z.number()]).optional().nullable(),
  monthlyFee: z.union([z.string(), z.number()]).optional().nullable(),
  startDate: optionalString,
  dueDate: optionalString,
  nextDelivery: optionalString,
});

export const clientInputSchema = z.object({
  name: z.string().trim().min(1, "Nome do cliente é obrigatório"),
  company: z.string().trim().min(1, "Empresa é obrigatória"),
  email: optionalString,
  phone: optionalString,
  website: optionalString,
  instagram: optionalString,
  ownerId: optionalUuid,
  status: z.enum(clientStatusEnum.enumValues).default("ativo"),
  importantLinks: z.array(importantLinkSchema).optional().default([]),
  notes: optionalString,
});

export const clientPatchSchema = clientInputSchema.partial();

export const contactInputSchema = z.object({
  name: z.string().trim().min(1, "Nome do contato é obrigatório"),
  role: optionalString,
  email: optionalString,
  phone: optionalString,
  isPrimary: z.boolean().optional().default(false),
  notes: optionalString,
});

export const inlineClientSchema = z.object({
  company: z.string().trim().min(1, "Informe a empresa do cliente"),
  name: optionalString,
  email: optionalString,
  phone: optionalString,
});

export const projectInputSchema = z
  .object({
    name: z.string().trim().min(1, "Nome do projeto é obrigatório"),
    clientId: optionalUuid,
    newClient: inlineClientSchema.optional().nullable(),
    description: optionalString,
    ownerId: optionalUuid,
    participantIds: z.array(z.string().uuid()).optional().default([]),
    status: z.enum(projectStatusEnum.enumValues).default("planejamento"),
    startDate: optionalString,
    dueDate: optionalString,
    nextDelivery: optionalString,
    soldValue: z.union([z.string(), z.number()]).optional().nullable(),
    monthlyFee: z.union([z.string(), z.number()]).optional().nullable(),
    githubUrl: optionalString,
    productionUrl: optionalString,
    importantLinks: z.array(importantLinkSchema).optional().default([]),
    notes: optionalString,
  })
  .refine((data) => Boolean(data.clientId || data.newClient?.company), {
    message: "Selecione um cliente existente ou informe o nome do novo cliente",
    path: ["clientId"],
  });

export const projectPatchSchema = z.object({
  name: z.string().trim().min(1, "Nome do projeto é obrigatório").optional(),
  clientId: z.string().uuid("Selecione um cliente válido").optional(),
  description: optionalString,
  ownerId: optionalUuid,
  participantIds: z.array(z.string().uuid()).optional(),
  status: z.enum(projectStatusEnum.enumValues).optional(),
  startDate: optionalString,
  dueDate: optionalString,
  nextDelivery: optionalString,
  soldValue: z.union([z.string(), z.number()]).optional().nullable(),
  monthlyFee: z.union([z.string(), z.number()]).optional().nullable(),
  githubUrl: optionalString,
  productionUrl: optionalString,
  importantLinks: z.array(importantLinkSchema).optional(),
  notes: optionalString,
});

export const proposalInputSchema = z.object({
  title: z.string().trim().min(1, "Título da proposta é obrigatório"),
  leadId: optionalUuid,
  clientId: optionalUuid,
  ownerId: optionalUuid,
  status: z.enum(proposalStatusEnum.enumValues).default("rascunho"),
  totalValue: z.union([z.string(), z.number()]).optional().nullable(),
  setupValue: z.union([z.string(), z.number()]).optional().nullable(),
  monthlyFee: z.union([z.string(), z.number()]).optional().nullable(),
  sentAt: optionalString,
  validUntil: optionalString,
  documentUrl: optionalString,
  scope: optionalString,
  notes: optionalString,
});

export const proposalPatchSchema = proposalInputSchema.partial();

export const taskInputSchema = z.object({
  title: z.string().trim().min(1, "Título da tarefa é obrigatório"),
  projectId: optionalUuid,
  clientId: optionalUuid,
  assigneeId: optionalUuid,
  priority: z.enum(taskPriorityEnum.enumValues).default("media"),
  dueDate: optionalString,
  status: z.enum(taskStatusEnum.enumValues).default("a_fazer"),
  description: optionalString,
});

export const taskPatchSchema = taskInputSchema.partial();

export const projectContractSchema = z
  .object({
    projectId: optionalUuid,
    newProject: z
      .object({
        name: z.string().trim().min(1, "Informe o nome do projeto"),
        clientId: optionalUuid,
        clientCompany: optionalString,
      })
      .optional()
      .nullable(),
    totalSoldValue: z.union([z.string(), z.number()]).optional().nullable(),
    setupValue: z.union([z.string(), z.number()]).optional().nullable(),
    monthlyFee: z.union([z.string(), z.number()]).optional().nullable(),
    billingStartDate: optionalString,
    dueDay: z.coerce.number().int().min(1).max(31).default(10),
    paymentMethod: optionalString,
    installmentsCount: z.coerce.number().int().min(1).max(48).default(1),
    active: z.boolean().default(true),
    generateInstallments: z.boolean().optional().default(false),
    notes: optionalString,
  })
  .refine(
    (d) =>
      Boolean(
        d.projectId ||
          (d.newProject?.name &&
            (d.newProject.clientId || d.newProject.clientCompany))
      ),
    {
      message:
        "Selecione um projeto existente ou informe o projeto e o cliente",
      path: ["projectId"],
    }
  );

export const financialEntrySchema = z
  .object({
    clientId: optionalUuid,
    newClient: inlineClientSchema.optional().nullable(),
    projectId: optionalUuid,
    description: z.string().trim().min(1, "Descrição é obrigatória"),
    entryType: z.enum(financialEntryTypeEnum.enumValues).default("pontual"),
    amount: z.union([z.string(), z.number()]),
    dueDate: z.string().trim().min(8, "Data de vencimento é obrigatória"),
    paidAt: optionalString,
    status: z.enum(financialStatusEnum.enumValues).default("pendente"),
    paymentMethod: optionalString,
    notes: optionalString,
  })
  .refine((d) => Boolean(d.clientId || d.newClient?.company), {
    message: "Selecione um cliente existente ou informe o nome do cliente",
    path: ["clientId"],
  });

export const financialEntryPatchSchema = z.object({
  clientId: z.string().uuid("Selecione um cliente válido").optional(),
  projectId: optionalUuid,
  description: z.string().trim().min(1, "Descrição é obrigatória").optional(),
  entryType: z.enum(financialEntryTypeEnum.enumValues).optional(),
  amount: z.union([z.string(), z.number()]).optional(),
  dueDate: z.string().trim().min(8, "Data de vencimento é obrigatória").optional(),
  paidAt: optionalString,
  status: z.enum(financialStatusEnum.enumValues).optional(),
  paymentMethod: optionalString,
  notes: optionalString,
});

export const meetingInputSchema = z.object({
  title: z.string().trim().min(1, "Título da reunião é obrigatório"),
  meetingDate: z.string().trim().min(8, "Data da reunião é obrigatória"),
  meetingType: z.enum(meetingTypeEnum.enumValues).default("cliente"),
  clientId: optionalUuid,
  projectId: optionalUuid,
  participants: optionalString,
  topicsDiscussed: optionalString,
  decisions: optionalString,
  nextActions: optionalString,
  responsibles: optionalString,
  dueDate: optionalString,
  notes: optionalString,
});

export const meetingPatchSchema = meetingInputSchema.partial();

export const weeklyGoalSchema = z.object({
  title: z.string().trim().min(1, "Título da meta é obrigatório"),
  weekStart: optionalString,
  ownerId: optionalUuid,
  projectId: optionalUuid,
  completed: z.boolean().optional().default(false),
  notes: optionalString,
});

export const weeklyGoalPatchSchema = weeklyGoalSchema.partial();

export const secretInputSchema = z.object({
  name: z.string().trim().min(1, "Nome da credencial é obrigatório"),
  service: z.string().trim().min(1, "Serviço é obrigatório"),
  projectId: optionalUuid,
  url: optionalString,
  login: optionalString,
  secretValue: z.string().min(1, "Senha, token ou chave é obrigatória"),
  credentialType: z.enum(credentialTypeEnum.enumValues).default("senha"),
  notes: optionalString,
});

export const secretPatchSchema = secretInputSchema.partial().extend({
  secretValue: z.string().optional(),
});

import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contractDocStatusEnum,
  contractDocuments,
  projects,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { contractDocumentSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

async function generateContractNumber(): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = `VM-${year}-`;
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(contractDocuments)
    .where(ilike(contractDocuments.contractNumber, `${prefix}%`));
  const nextNum = (row?.count ?? 0) + 1;
  return `${prefix}${String(nextNum).padStart(3, "0")}`;
}

export async function GET(request: Request) {
  const authUser = await requireApiUser("financial:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const clientId = (searchParams.get("clientId") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(contractDocuments.title, pattern),
        ilike(contractDocuments.contractNumber, pattern),
        ilike(clients.company, pattern),
        ilike(projects.name, pattern)
      )
    );
  }
  const statusCheck = validateEnumFilter(
    status,
    contractDocStatusEnum.enumValues,
    "status"
  );
  if (!statusCheck.ok) return statusCheck.response;
  if (statusCheck.value) {
    conditions.push(eq(contractDocuments.status, statusCheck.value));
  }

  const clientCheck = validateUuidFilter(clientId, "clientId");
  if (!clientCheck.ok) return clientCheck.response;
  if (clientCheck.value) {
    conditions.push(eq(contractDocuments.clientId, clientCheck.value));
  }

  const rows = await db
    .select({
      id: contractDocuments.id,
      contractNumber: contractDocuments.contractNumber,
      title: contractDocuments.title,
      templateType: contractDocuments.templateType,
      clientId: contractDocuments.clientId,
      clientCompany: clients.company,
      clientName: clients.name,
      projectId: contractDocuments.projectId,
      projectName: projects.name,
      status: contractDocuments.status,
      totalValue: contractDocuments.totalValue,
      setupValue: contractDocuments.setupValue,
      monthlyFee: contractDocuments.monthlyFee,
      dueDay: contractDocuments.dueDay,
      paymentMethod: contractDocuments.paymentMethod,
      startDate: contractDocuments.startDate,
      dueDate: contractDocuments.dueDate,
      ipMode: contractDocuments.ipMode,
      signedUrl: contractDocuments.signedUrl,
      signedAt: contractDocuments.signedAt,
      createdByName: users.name,
      createdAt: contractDocuments.createdAt,
      updatedAt: contractDocuments.updatedAt,
    })
    .from(contractDocuments)
    .innerJoin(clients, eq(contractDocuments.clientId, clients.id))
    .leftJoin(projects, eq(contractDocuments.projectId, projects.id))
    .leftJoin(users, eq(contractDocuments.createdById, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(contractDocuments.updatedAt));

  return NextResponse.json({ contracts: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("financial:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = contractDocumentSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const d = parsed.data;
    const contractNumber = await generateContractNumber();

    const [created] = await db
      .insert(contractDocuments)
      .values({
        contractNumber,
        title: d.title,
        templateType: d.templateType,
        clientId: d.clientId,
        projectId: d.projectId ?? null,
        status: d.status,
        totalValue: parseNumericInput(d.totalValue),
        setupValue: parseNumericInput(d.setupValue),
        monthlyFee: parseNumericInput(d.monthlyFee),
        dueDay: d.dueDay,
        paymentMethod: d.paymentMethod,
        startDate: d.startDate || null,
        dueDate: d.dueDate || null,
        ipMode: d.ipMode,
        content: d.content,
        signedUrl: d.signedUrl,
        signedAt: d.status === "assinado" ? new Date() : null,
        createdById: authUser.id,
      })
      .returning();

    await logActivity({
      userId: authUser.id,
      entityType: created.projectId ? "project" : "contract",
      entityId: created.projectId ?? created.id,
      action: "contract_document_created",
      description: `Contrato ${created.contractNumber} ("${created.title}") emitido.`,
    });

    return NextResponse.json({ contract: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar contrato jurídico:", err);
    return NextResponse.json(
      { error: "Erro ao salvar contrato" },
      { status: 500 }
    );
  }
}

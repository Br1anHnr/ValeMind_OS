import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  companySettings,
  contractDocuments,
  projects,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { contractDocumentPatchSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";
import { CONTRACT_DOC_STATUS_MAP } from "@/lib/constants";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("financial:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do contrato inválido");

  const [[contract], [company]] = await Promise.all([
    db
      .select({
        id: contractDocuments.id,
        contractNumber: contractDocuments.contractNumber,
        title: contractDocuments.title,
        templateType: contractDocuments.templateType,
        clientId: contractDocuments.clientId,
        clientCompany: clients.company,
        clientLegalName: clients.legalName,
        clientDocument: clients.document,
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
        content: contractDocuments.content,
        signedUrl: contractDocuments.signedUrl,
        signedAt: contractDocuments.signedAt,
        createdAt: contractDocuments.createdAt,
        updatedAt: contractDocuments.updatedAt,
      })
      .from(contractDocuments)
      .innerJoin(clients, eq(contractDocuments.clientId, clients.id))
      .leftJoin(projects, eq(contractDocuments.projectId, projects.id))
      .where(eq(contractDocuments.id, id))
      .limit(1),
    db.select().from(companySettings).limit(1),
  ]);

  if (!contract) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ contract, company: company ?? null });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("financial:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do contrato inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = contractDocumentPatchSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const [existing] = await db
      .select()
      .from(contractDocuments)
      .where(eq(contractDocuments.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Contrato não encontrado" },
        { status: 404 }
      );
    }

    const d = parsed.data;
    let signedAt = existing.signedAt;
    if (d.status === "assinado" && !existing.signedAt) {
      signedAt = new Date();
    } else if (d.status && d.status !== "assinado") {
      signedAt = null;
    }

    const [updated] = await db
      .update(contractDocuments)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.templateType !== undefined ? { templateType: d.templateType } : {}),
        ...(d.clientId !== undefined ? { clientId: d.clientId } : {}),
        ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.totalValue !== undefined
          ? { totalValue: parseNumericInput(d.totalValue) }
          : {}),
        ...(d.setupValue !== undefined
          ? { setupValue: parseNumericInput(d.setupValue) }
          : {}),
        ...(d.monthlyFee !== undefined
          ? { monthlyFee: parseNumericInput(d.monthlyFee) }
          : {}),
        ...(d.dueDay !== undefined ? { dueDay: d.dueDay } : {}),
        ...(d.paymentMethod !== undefined
          ? { paymentMethod: d.paymentMethod }
          : {}),
        ...(d.startDate !== undefined ? { startDate: d.startDate || null } : {}),
        ...(d.dueDate !== undefined ? { dueDate: d.dueDate || null } : {}),
        ...(d.ipMode !== undefined ? { ipMode: d.ipMode } : {}),
        ...(d.content !== undefined ? { content: d.content } : {}),
        ...(d.signedUrl !== undefined ? { signedUrl: d.signedUrl } : {}),
        signedAt,
        updatedAt: new Date(),
      })
      .where(eq(contractDocuments.id, id))
      .returning();

    if (d.status && d.status !== existing.status) {
      await logActivity({
        userId: authUser.id,
        entityType: updated.projectId ? "project" : "contract",
        entityId: updated.projectId ?? updated.id,
        action: "contract_status_changed",
        description: `Contrato ${updated.contractNumber} alterado para ${CONTRACT_DOC_STATUS_MAP[updated.status].label}.`,
      });
    }

    return NextResponse.json({ contract: updated });
  } catch (err) {
    console.error("Erro ao atualizar contrato:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar contrato" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("financial:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do contrato inválido");

  const [deleted] = await db
    .delete(contractDocuments)
    .where(eq(contractDocuments.id, id))
    .returning({ id: contractDocuments.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Contrato não encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

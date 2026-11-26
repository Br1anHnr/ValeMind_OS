import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  leads,
  proposals,
  proposalStatusEnum,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { proposalInputSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { LEAD_STAGE_ORDER, PROPOSAL_STATUS_MAP } from "@/lib/constants";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

function parseDateOrNull(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val.length === 10 ? `${val}T12:00:00` : val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  const authUser = await requireApiUser("proposals:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const ownerId = (searchParams.get("ownerId") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(proposals.title, pattern),
        ilike(proposals.scope, pattern),
        ilike(leads.company, pattern),
        ilike(clients.company, pattern)
      )
    );
  }
  const statusCheck = validateEnumFilter(
    status,
    proposalStatusEnum.enumValues,
    "status"
  );
  if (!statusCheck.ok) return statusCheck.response;
  if (statusCheck.value) {
    conditions.push(eq(proposals.status, statusCheck.value));
  }
  const ownerCheck = validateUuidFilter(ownerId, "ownerId");
  if (!ownerCheck.ok) return ownerCheck.response;
  if (ownerCheck.value) {
    conditions.push(eq(proposals.ownerId, ownerCheck.value));
  }

  const rows = await db
    .select({
      id: proposals.id,
      title: proposals.title,
      leadId: proposals.leadId,
      leadCompany: leads.company,
      leadStage: leads.stage,
      clientId: proposals.clientId,
      clientCompany: clients.company,
      ownerId: proposals.ownerId,
      ownerName: users.name,
      status: proposals.status,
      totalValue: proposals.totalValue,
      setupValue: proposals.setupValue,
      monthlyFee: proposals.monthlyFee,
      sentAt: proposals.sentAt,
      validUntil: proposals.validUntil,
      documentUrl: proposals.documentUrl,
      scope: proposals.scope,
      notes: proposals.notes,
      createdAt: proposals.createdAt,
      updatedAt: proposals.updatedAt,
    })
    .from(proposals)
    .leftJoin(leads, eq(proposals.leadId, leads.id))
    .leftJoin(clients, eq(proposals.clientId, clients.id))
    .leftJoin(users, eq(proposals.ownerId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(proposals.updatedAt));

  return NextResponse.json({ proposals: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("proposals:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = proposalInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const sentAt =
      parseDateOrNull(d.sentAt) ??
      (d.status === "enviada" || d.status === "em_negociacao" || d.status === "aprovada"
        ? new Date()
        : null);

    const [created] = await db
      .insert(proposals)
      .values({
        title: d.title,
        leadId: d.leadId,
        clientId: d.clientId,
        ownerId: d.ownerId ?? authUser.id,
        status: d.status,
        totalValue: parseNumericInput(d.totalValue),
        setupValue: parseNumericInput(d.setupValue),
        monthlyFee: parseNumericInput(d.monthlyFee),
        sentAt,
        validUntil: d.validUntil || null,
        documentUrl: d.documentUrl,
        scope: d.scope,
        notes: d.notes,
      })
      .returning();

    // Sincroniza etapa do lead quando uma proposta e enviada ou aprovada
    if (created.leadId) {
      const [lead] = await db
        .select({ id: leads.id, stage: leads.stage, potentialValue: leads.potentialValue })
        .from(leads)
        .where(eq(leads.id, created.leadId))
        .limit(1);

      if (lead) {
        const nextLeadStage =
          created.status === "aprovada"
            ? "fechado"
            : created.status === "em_negociacao" &&
                LEAD_STAGE_ORDER[lead.stage] < LEAD_STAGE_ORDER.negociacao
              ? "negociacao"
              : created.status === "enviada" &&
                  LEAD_STAGE_ORDER[lead.stage] < LEAD_STAGE_ORDER.proposta
                ? "proposta"
                : null;

        if (nextLeadStage || (!lead.potentialValue && created.totalValue)) {
          await db
            .update(leads)
            .set({
              ...(nextLeadStage ? { stage: nextLeadStage } : {}),
              ...(!lead.potentialValue && created.totalValue
                ? { potentialValue: created.totalValue }
                : {}),
              updatedAt: new Date(),
            })
            .where(eq(leads.id, lead.id));
        }
      }
    }

    await logActivity({
      userId: authUser.id,
      entityType: "proposal",
      entityId: created.id,
      action: "proposal_created",
      description: `Proposta "${created.title}" criada (${PROPOSAL_STATUS_MAP[created.status].label}).`,
    });

    return NextResponse.json({ proposal: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar proposta:", err);
    return NextResponse.json(
      { error: "Erro ao criar proposta" },
      { status: 500 }
    );
  }
}

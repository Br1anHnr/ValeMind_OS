import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads, proposals } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { proposalPatchSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { LEAD_STAGE_ORDER, PROPOSAL_STATUS_MAP } from "@/lib/constants";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

function parseDateOrNull(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val.length === 10 ? `${val}T12:00:00` : val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("proposals:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da proposta inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const [existing] = await db
      .select()
      .from(proposals)
      .where(eq(proposals.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Proposta não encontrada" },
        { status: 404 }
      );
    }

    const parsed = proposalPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const nextStatus = d.status ?? existing.status;
    let sentAt = existing.sentAt;
    if (d.sentAt !== undefined) {
      sentAt = parseDateOrNull(d.sentAt);
    } else if (
      !existing.sentAt &&
      (nextStatus === "enviada" ||
        nextStatus === "em_negociacao" ||
        nextStatus === "aprovada")
    ) {
      sentAt = new Date();
    }

    const [updated] = await db
      .update(proposals)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.leadId !== undefined ? { leadId: d.leadId } : {}),
        ...(d.clientId !== undefined ? { clientId: d.clientId } : {}),
        ...(d.ownerId !== undefined ? { ownerId: d.ownerId } : {}),
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
        sentAt,
        ...(d.validUntil !== undefined ? { validUntil: d.validUntil || null } : {}),
        ...(d.documentUrl !== undefined ? { documentUrl: d.documentUrl } : {}),
        ...(d.scope !== undefined ? { scope: d.scope } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(proposals.id, id))
      .returning();

    if (updated.leadId && d.status && d.status !== existing.status) {
      const [lead] = await db
        .select({ id: leads.id, stage: leads.stage })
        .from(leads)
        .where(eq(leads.id, updated.leadId))
        .limit(1);

      if (lead) {
        const nextLeadStage =
          d.status === "aprovada"
            ? "fechado"
            : d.status === "em_negociacao" &&
                LEAD_STAGE_ORDER[lead.stage] < LEAD_STAGE_ORDER.negociacao
              ? "negociacao"
              : d.status === "enviada" &&
                  LEAD_STAGE_ORDER[lead.stage] < LEAD_STAGE_ORDER.proposta
                ? "proposta"
                : null;

        if (nextLeadStage) {
          await db
            .update(leads)
            .set({ stage: nextLeadStage, updatedAt: new Date() })
            .where(eq(leads.id, lead.id));
        }
      }
    }

    await logActivity({
      userId: authUser.id,
      entityType: "proposal",
      entityId: updated.id,
      action:
        d.status && d.status !== existing.status
          ? "proposal_status_changed"
          : "proposal_updated",
      description:
        d.status && d.status !== existing.status
          ? `Proposta "${updated.title}" alterada para ${PROPOSAL_STATUS_MAP[updated.status].label}.`
          : `Proposta "${updated.title}" atualizada.`,
    });

    return NextResponse.json({ proposal: updated });
  } catch (err) {
    console.error("Erro ao atualizar proposta:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar proposta" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("proposals:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da proposta inválido");
  const [deleted] = await db
    .delete(proposals)
    .where(eq(proposals.id, id))
    .returning({ id: proposals.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Proposta não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

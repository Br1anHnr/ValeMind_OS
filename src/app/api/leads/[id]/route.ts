import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { leads } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { leadPatchSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { LEAD_STAGE_MAP } from "@/lib/constants";
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

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("leads:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do lead inválido");
  const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ lead });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("leads:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do lead inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const [existing] = await db
      .select()
      .from(leads)
      .where(eq(leads.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    const parsed = leadPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const updatePayload: Partial<typeof leads.$inferInsert> = {
      updatedAt: new Date(),
    };

    if (d.company !== undefined) updatePayload.company = d.company;
    if (d.contactName !== undefined) updatePayload.contactName = d.contactName;
    if (d.phone !== undefined) updatePayload.phone = d.phone;
    if (d.email !== undefined) updatePayload.email = d.email;
    if (d.website !== undefined) updatePayload.website = d.website;
    if (d.instagram !== undefined) updatePayload.instagram = d.instagram;
    if (d.source !== undefined) updatePayload.source = d.source;
    if (d.ownerId !== undefined) updatePayload.ownerId = d.ownerId;
    if (d.stage !== undefined) updatePayload.stage = d.stage;
    if (d.lastContactAt !== undefined) {
      updatePayload.lastContactAt = parseDateOrNull(d.lastContactAt);
    }
    if (d.nextAction !== undefined) updatePayload.nextAction = d.nextAction;
    if (d.nextFollowUpAt !== undefined) {
      updatePayload.nextFollowUpAt = parseDateOrNull(d.nextFollowUpAt);
    }
    if (d.potentialValue !== undefined) {
      updatePayload.potentialValue = parseNumericInput(d.potentialValue);
    }
    if (d.notes !== undefined) updatePayload.notes = d.notes;

    // Atualiza ultimo contato automaticamente ao mover de identificado para contatado+
    if (
      d.stage &&
      d.stage !== existing.stage &&
      d.stage !== "identificado" &&
      d.lastContactAt === undefined &&
      !existing.lastContactAt
    ) {
      updatePayload.lastContactAt = new Date();
    }

    const [updated] = await db
      .update(leads)
      .set(updatePayload)
      .where(eq(leads.id, id))
      .returning();

    if (d.stage && d.stage !== existing.stage) {
      await logActivity({
        userId: authUser.id,
        entityType: "lead",
        entityId: updated.id,
        action: "lead_stage_changed",
        description: `Lead "${updated.company}" movido de ${LEAD_STAGE_MAP[existing.stage].label} para ${LEAD_STAGE_MAP[updated.stage].label}.`,
      });
    } else {
      await logActivity({
        userId: authUser.id,
        entityType: "lead",
        entityId: updated.id,
        action: "lead_updated",
        description: `Lead "${updated.company}" atualizado.`,
      });
    }

    return NextResponse.json({ lead: updated });
  } catch (err) {
    console.error("Erro ao atualizar lead:", err);
    return NextResponse.json({ error: "Erro ao atualizar lead" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("leads:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do lead inválido");
  const [deleted] = await db
    .delete(leads)
    .where(eq(leads.id, id))
    .returning({ id: leads.id, company: leads.company });

  if (!deleted) {
    return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

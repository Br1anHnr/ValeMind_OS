import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { financialEntries } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { financialEntryPatchSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { getTodayYmd } from "@/lib/finance";
import { logActivity } from "@/lib/activity";
import { FINANCIAL_STATUS_MAP } from "@/lib/constants";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("financial:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do lançamento inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const [existing] = await db
      .select()
      .from(financialEntries)
      .where(eq(financialEntries.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Lançamento não encontrado" },
        { status: 404 }
      );
    }

    const parsed = financialEntryPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const nextStatus = d.status ?? existing.status;
    let paidAt = existing.paidAt;
    if (d.paidAt !== undefined) {
      paidAt = d.paidAt || null;
    } else if (nextStatus === "pago" && !existing.paidAt) {
      paidAt = getTodayYmd();
    } else if (d.status && d.status !== "pago") {
      paidAt = null;
    }

    const [updated] = await db
      .update(financialEntries)
      .set({
        ...(d.clientId !== undefined ? { clientId: d.clientId } : {}),
        ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.entryType !== undefined ? { entryType: d.entryType } : {}),
        ...(d.amount !== undefined
          ? { amount: parseNumericInput(d.amount) ?? existing.amount }
          : {}),
        ...(d.dueDate !== undefined ? { dueDate: d.dueDate } : {}),
        paidAt,
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.paymentMethod !== undefined
          ? { paymentMethod: d.paymentMethod }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(financialEntries.id, id))
      .returning();

    if (d.status && d.status !== existing.status) {
      await logActivity({
        userId: authUser.id,
        entityType: updated.projectId ? "project" : "financial",
        entityId: updated.projectId ?? updated.id,
        action: "financial_status_changed",
        description: `Recebimento "${updated.description}" marcado como ${FINANCIAL_STATUS_MAP[updated.status].label}.`,
      });
    }

    return NextResponse.json({ entry: updated });
  } catch (err) {
    console.error("Erro ao atualizar lançamento:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar lançamento" },
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
  if (!isValidUuid(id)) return invalidIdResponse("ID do lançamento inválido");
  const [deleted] = await db
    .delete(financialEntries)
    .where(eq(financialEntries.id, id))
    .returning({ id: financialEntries.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Lançamento não encontrado" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

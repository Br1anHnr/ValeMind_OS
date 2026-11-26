import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { weeklyGoals } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { weeklyGoalPatchSchema } from "@/lib/validators";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("tasks:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da meta inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = weeklyGoalPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [updated] = await db
      .update(weeklyGoals)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.ownerId !== undefined ? { ownerId: d.ownerId } : {}),
        ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
        ...(d.completed !== undefined
          ? { completed: d.completed, completedAt: d.completed ? new Date() : null }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(weeklyGoals.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
    }

    return NextResponse.json({ goal: updated });
  } catch (err) {
    console.error("Erro ao atualizar meta semanal:", err);
    return NextResponse.json({ error: "Erro ao atualizar meta" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("tasks:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da meta inválido");
  const [deleted] = await db
    .delete(weeklyGoals)
    .where(eq(weeklyGoals.id, id))
    .returning({ id: weeklyGoals.id });

  if (!deleted) {
    return NextResponse.json({ error: "Meta não encontrada" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

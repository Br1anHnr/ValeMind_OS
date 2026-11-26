import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, tasks } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { taskPatchSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { TASK_STATUS_MAP } from "@/lib/constants";
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
  if (!isValidUuid(id)) return invalidIdResponse("ID da tarefa inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const [existing] = await db
      .select()
      .from(tasks)
      .where(eq(tasks.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Tarefa não encontrada" },
        { status: 404 }
      );
    }

    const parsed = taskPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    let resolvedClientId = d.clientId;
    if (d.projectId && resolvedClientId === undefined) {
      const [proj] = await db
        .select({ clientId: projects.clientId })
        .from(projects)
        .where(eq(projects.id, d.projectId))
        .limit(1);
      if (proj) resolvedClientId = proj.clientId;
    }

    let completedAt = existing.completedAt;
    if (d.status !== undefined) {
      if (d.status === "concluido" && existing.status !== "concluido") {
        completedAt = new Date();
      } else if (d.status !== "concluido") {
        completedAt = null;
      }
    }

    const [updated] = await db
      .update(tasks)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
        ...(resolvedClientId !== undefined ? { clientId: resolvedClientId } : {}),
        ...(d.assigneeId !== undefined ? { assigneeId: d.assigneeId } : {}),
        ...(d.priority !== undefined ? { priority: d.priority } : {}),
        ...(d.dueDate !== undefined ? { dueDate: d.dueDate || null } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        completedAt,
        updatedAt: new Date(),
      })
      .where(eq(tasks.id, id))
      .returning();

    if (d.status && d.status !== existing.status) {
      await logActivity({
        userId: authUser.id,
        entityType: updated.projectId ? "project" : "task",
        entityId: updated.projectId ?? updated.id,
        action: "task_status_changed",
        description: `Tarefa "${updated.title}" movida para ${TASK_STATUS_MAP[updated.status].label}.`,
      });
    }

    return NextResponse.json({ task: updated });
  } catch (err) {
    console.error("Erro ao atualizar tarefa:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar tarefa" },
      { status: 500 }
    );
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
  if (!isValidUuid(id)) return invalidIdResponse("ID da tarefa inválido");
  const [deleted] = await db
    .delete(tasks)
    .where(eq(tasks.id, id))
    .returning({ id: tasks.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Tarefa não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

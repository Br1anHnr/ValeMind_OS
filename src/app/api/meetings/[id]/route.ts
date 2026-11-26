import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { meetings, projects } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { meetingPatchSchema } from "@/lib/validators";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("meetings:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da reunião inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = meetingPatchSchema.safeParse(parsedBody.data);
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

    const [updated] = await db
      .update(meetings)
      .set({
        ...(d.title !== undefined ? { title: d.title } : {}),
        ...(d.meetingDate !== undefined
          ? {
              meetingDate: new Date(
                d.meetingDate.length === 10
                  ? `${d.meetingDate}T12:00:00`
                  : d.meetingDate
              ),
            }
          : {}),
        ...(d.meetingType !== undefined ? { meetingType: d.meetingType } : {}),
        ...(resolvedClientId !== undefined
          ? { clientId: resolvedClientId }
          : {}),
        ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
        ...(d.participants !== undefined
          ? { participants: d.participants }
          : {}),
        ...(d.topicsDiscussed !== undefined
          ? { topicsDiscussed: d.topicsDiscussed }
          : {}),
        ...(d.decisions !== undefined ? { decisions: d.decisions } : {}),
        ...(d.nextActions !== undefined ? { nextActions: d.nextActions } : {}),
        ...(d.responsibles !== undefined
          ? { responsibles: d.responsibles }
          : {}),
        ...(d.dueDate !== undefined ? { dueDate: d.dueDate || null } : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(meetings.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Reunião não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json({ meeting: updated });
  } catch (err) {
    console.error("Erro ao atualizar reunião:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar reunião" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("meetings:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da reunião inválido");
  const [deleted] = await db
    .delete(meetings)
    .where(eq(meetings.id, id))
    .returning({ id: meetings.id });

  if (!deleted) {
    return NextResponse.json(
      { error: "Reunião não encontrada" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  clients,
  financialEntries,
  meetings,
  projectParticipants,
  projects,
  recurringPayments,
  secrets,
  tasks,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { projectPatchSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { PROJECT_STATUS_MAP } from "@/lib/constants";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("projects:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do projeto inválido");
  const [project] = await db
    .select({
      id: projects.id,
      name: projects.name,
      clientId: projects.clientId,
      clientCompany: clients.company,
      clientName: clients.name,
      description: projects.description,
      ownerId: projects.ownerId,
      ownerName: users.name,
      status: projects.status,
      startDate: projects.startDate,
      dueDate: projects.dueDate,
      nextDelivery: projects.nextDelivery,
      soldValue: projects.soldValue,
      monthlyFee: projects.monthlyFee,
      githubUrl: projects.githubUrl,
      productionUrl: projects.productionUrl,
      importantLinks: projects.importantLinks,
      notes: projects.notes,
      createdAt: projects.createdAt,
      updatedAt: projects.updatedAt,
    })
    .from(projects)
    .innerJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(users, eq(projects.ownerId, users.id))
    .where(eq(projects.id, id))
    .limit(1);

  if (!project) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }

  const [
    participants,
    projectTasks,
    projectContract,
    projectFinancial,
    projectMeetings,
    projectSecrets,
    projectActivities,
  ] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
      })
      .from(projectParticipants)
      .innerJoin(users, eq(projectParticipants.userId, users.id))
      .where(eq(projectParticipants.projectId, id)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        projectId: tasks.projectId,
        clientId: tasks.clientId,
        assigneeId: tasks.assigneeId,
        assigneeName: users.name,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        status: tasks.status,
        description: tasks.description,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .where(eq(tasks.projectId, id))
      .orderBy(asc(tasks.dueDate), desc(tasks.updatedAt)),
    db
      .select()
      .from(recurringPayments)
      .where(eq(recurringPayments.projectId, id))
      .limit(1),
    db
      .select({
        id: financialEntries.id,
        description: financialEntries.description,
        entryType: financialEntries.entryType,
        amount: financialEntries.amount,
        dueDate: financialEntries.dueDate,
        paidAt: financialEntries.paidAt,
        status: financialEntries.status,
      })
      .from(financialEntries)
      .where(eq(financialEntries.projectId, id))
      .orderBy(asc(financialEntries.dueDate)),
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        meetingDate: meetings.meetingDate,
        decisions: meetings.decisions,
        nextActions: meetings.nextActions,
      })
      .from(meetings)
      .where(eq(meetings.projectId, id))
      .orderBy(desc(meetings.meetingDate))
      .limit(10),
    db
      .select({
        id: secrets.id,
        name: secrets.name,
        service: secrets.service,
        url: secrets.url,
        login: secrets.login,
        credentialType: secrets.credentialType,
        updatedAt: secrets.updatedAt,
      })
      .from(secrets)
      .where(eq(secrets.projectId, id))
      .orderBy(desc(secrets.updatedAt)),
    db
      .select({
        id: activities.id,
        action: activities.action,
        description: activities.description,
        createdAt: activities.createdAt,
        userName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .where(
        and(eq(activities.entityType, "project"), eq(activities.entityId, id))
      )
      .orderBy(desc(activities.createdAt))
      .limit(20),
  ]);

  return NextResponse.json({
    project: {
      ...project,
      participants,
    },
    tasks: projectTasks,
    contract: projectContract[0] ?? null,
    financialEntries: projectFinancial,
    meetings: projectMeetings,
    secrets: projectSecrets,
    activities: projectActivities,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("projects:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do projeto inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const [existing] = await db
      .select()
      .from(projects)
      .where(eq(projects.id, id))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Projeto não encontrado" },
        { status: 404 }
      );
    }

    const parsed = projectPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const updated = await db.transaction(async (tx) => {
      const [proj] = await tx
        .update(projects)
        .set({
          ...(d.name !== undefined ? { name: d.name } : {}),
          ...(d.clientId !== undefined ? { clientId: d.clientId } : {}),
          ...(d.description !== undefined ? { description: d.description } : {}),
          ...(d.ownerId !== undefined ? { ownerId: d.ownerId } : {}),
          ...(d.status !== undefined ? { status: d.status } : {}),
          ...(d.startDate !== undefined ? { startDate: d.startDate || null } : {}),
          ...(d.dueDate !== undefined ? { dueDate: d.dueDate || null } : {}),
          ...(d.nextDelivery !== undefined ? { nextDelivery: d.nextDelivery } : {}),
          ...(d.soldValue !== undefined
            ? { soldValue: parseNumericInput(d.soldValue) }
            : {}),
          ...(d.monthlyFee !== undefined
            ? { monthlyFee: parseNumericInput(d.monthlyFee) }
            : {}),
          ...(d.githubUrl !== undefined ? { githubUrl: d.githubUrl } : {}),
          ...(d.productionUrl !== undefined
            ? { productionUrl: d.productionUrl }
            : {}),
          ...(d.importantLinks !== undefined
            ? { importantLinks: d.importantLinks }
            : {}),
          ...(d.notes !== undefined ? { notes: d.notes } : {}),
          updatedAt: new Date(),
        })
        .where(eq(projects.id, id))
        .returning();

      if (d.participantIds !== undefined) {
        await tx
          .delete(projectParticipants)
          .where(eq(projectParticipants.projectId, id));

        const uniqueIds = Array.from(new Set(d.participantIds));
        if (uniqueIds.length > 0) {
          await tx
            .insert(projectParticipants)
            .values(uniqueIds.map((userId) => ({ projectId: id, userId })))
            .onConflictDoNothing();
        }
      }

      return proj;
    });

    if (d.status && d.status !== existing.status) {
      await logActivity({
        userId: authUser.id,
        entityType: "project",
        entityId: updated.id,
        action: "project_status_changed",
        description: `Status do projeto "${updated.name}" alterado de ${PROJECT_STATUS_MAP[existing.status].label} para ${PROJECT_STATUS_MAP[updated.status].label}.`,
      });
    } else {
      await logActivity({
        userId: authUser.id,
        entityType: "project",
        entityId: updated.id,
        action: "project_updated",
        description: `Projeto "${updated.name}" atualizado.`,
      });
    }

    return NextResponse.json({ project: updated });
  } catch (err) {
    console.error("Erro ao atualizar projeto:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar projeto" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("projects:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do projeto inválido");
  const [deleted] = await db
    .delete(projects)
    .where(eq(projects.id, id))
    .returning({ id: projects.id });

  if (!deleted) {
    return NextResponse.json({ error: "Projeto não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

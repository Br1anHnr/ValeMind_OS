import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  meetings,
  meetingTypeEnum,
  projects,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { meetingInputSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

export async function GET(request: Request) {
  const authUser = await requireApiUser("meetings:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const meetingType = (searchParams.get("meetingType") ?? "").trim();
  const clientId = (searchParams.get("clientId") ?? "").trim();
  const projectId = (searchParams.get("projectId") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(meetings.title, pattern),
        ilike(meetings.topicsDiscussed, pattern),
        ilike(meetings.decisions, pattern),
        ilike(meetings.nextActions, pattern),
        ilike(clients.company, pattern),
        ilike(projects.name, pattern)
      )
    );
  }
  const typeCheck = validateEnumFilter(
    meetingType,
    meetingTypeEnum.enumValues,
    "meetingType"
  );
  if (!typeCheck.ok) return typeCheck.response;
  if (typeCheck.value) {
    conditions.push(eq(meetings.meetingType, typeCheck.value));
  }
  const clientCheck = validateUuidFilter(clientId, "clientId");
  if (!clientCheck.ok) return clientCheck.response;
  if (clientCheck.value) {
    conditions.push(eq(meetings.clientId, clientCheck.value));
  }
  const projectCheck = validateUuidFilter(projectId, "projectId");
  if (!projectCheck.ok) return projectCheck.response;
  if (projectCheck.value) {
    conditions.push(eq(meetings.projectId, projectCheck.value));
  }

  const rows = await db
    .select({
      id: meetings.id,
      title: meetings.title,
      meetingDate: meetings.meetingDate,
      meetingType: meetings.meetingType,
      clientId: meetings.clientId,
      clientCompany: clients.company,
      projectId: meetings.projectId,
      projectName: projects.name,
      participants: meetings.participants,
      topicsDiscussed: meetings.topicsDiscussed,
      decisions: meetings.decisions,
      nextActions: meetings.nextActions,
      responsibles: meetings.responsibles,
      dueDate: meetings.dueDate,
      notes: meetings.notes,
      createdByName: users.name,
      createdAt: meetings.createdAt,
    })
    .from(meetings)
    .leftJoin(clients, eq(meetings.clientId, clients.id))
    .leftJoin(projects, eq(meetings.projectId, projects.id))
    .leftJoin(users, eq(meetings.createdById, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(meetings.meetingDate));

  return NextResponse.json({ meetings: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("meetings:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = meetingInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    let resolvedClientId = d.clientId ?? null;
    if (d.projectId && !resolvedClientId) {
      const [proj] = await db
        .select({ clientId: projects.clientId })
        .from(projects)
        .where(eq(projects.id, d.projectId))
        .limit(1);
      if (proj) resolvedClientId = proj.clientId;
    }

    const meetingDate = new Date(
      d.meetingDate.length === 10 ? `${d.meetingDate}T12:00:00` : d.meetingDate
    );

    const [created] = await db
      .insert(meetings)
      .values({
        title: d.title,
        meetingDate,
        meetingType: d.meetingType,
        clientId: resolvedClientId,
        projectId: d.projectId ?? null,
        participants: d.participants,
        topicsDiscussed: d.topicsDiscussed,
        decisions: d.decisions,
        nextActions: d.nextActions,
        responsibles: d.responsibles,
        dueDate: d.dueDate || null,
        notes: d.notes,
        createdById: authUser.id,
      })
      .returning();

    await logActivity({
      userId: authUser.id,
      entityType: created.projectId
        ? "project"
        : created.clientId
          ? "client"
          : "meeting",
      entityId: created.projectId ?? created.clientId ?? created.id,
      action: "meeting_created",
      description: `Reunião "${created.title}" registrada${created.decisions ? " com decisões documentadas" : ""}.`,
    });

    return NextResponse.json({ meeting: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar reunião:", err);
    return NextResponse.json(
      { error: "Erro ao registrar reunião" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { and, asc, desc, eq, gte, ilike, lt, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  projects,
  taskPriorityEnum,
  tasks,
  taskStatusEnum,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { taskInputSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import { TASK_STATUS_MAP } from "@/lib/constants";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

function formatLocalDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function GET(request: Request) {
  const authUser = await requireApiUser("tasks:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = (searchParams.get("view") ?? "all").trim();
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const priority = (searchParams.get("priority") ?? "").trim();
  const projectId = (searchParams.get("projectId") ?? "").trim();
  const clientId = (searchParams.get("clientId") ?? "").trim();
  const assigneeId = (searchParams.get("assigneeId") ?? "").trim();

  const conditions = [];

  if (view === "mine") {
    conditions.push(eq(tasks.assigneeId, authUser.id));
  } else if (view === "overdue") {
    const todayStr = formatLocalDate(new Date());
    conditions.push(ne(tasks.status, "concluido"));
    conditions.push(lt(tasks.dueDate, todayStr));
  } else if (view === "week") {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0=Sun
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + diffToMonday);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    conditions.push(gte(tasks.dueDate, formatLocalDate(weekStart)));
    conditions.push(lte(tasks.dueDate, formatLocalDate(weekEnd)));
  }

  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(tasks.title, pattern),
        ilike(tasks.description, pattern),
        ilike(projects.name, pattern),
        ilike(clients.company, pattern)
      )
    );
  }
  const statusCheck = validateEnumFilter(
    status,
    taskStatusEnum.enumValues,
    "status"
  );
  if (!statusCheck.ok) return statusCheck.response;
  if (statusCheck.value) {
    conditions.push(eq(tasks.status, statusCheck.value));
  }

  const priorityCheck = validateEnumFilter(
    priority,
    taskPriorityEnum.enumValues,
    "priority"
  );
  if (!priorityCheck.ok) return priorityCheck.response;
  if (priorityCheck.value) {
    conditions.push(eq(tasks.priority, priorityCheck.value));
  }

  const projectCheck = validateUuidFilter(projectId, "projectId");
  if (!projectCheck.ok) return projectCheck.response;
  if (projectCheck.value) {
    conditions.push(eq(tasks.projectId, projectCheck.value));
  }

  const clientCheck = validateUuidFilter(clientId, "clientId");
  if (!clientCheck.ok) return clientCheck.response;
  if (clientCheck.value) {
    conditions.push(eq(tasks.clientId, clientCheck.value));
  }

  const assigneeCheck = validateUuidFilter(assigneeId, "assigneeId");
  if (!assigneeCheck.ok) return assigneeCheck.response;
  if (assigneeCheck.value) {
    conditions.push(eq(tasks.assigneeId, assigneeCheck.value));
  }

  const rows = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      projectId: tasks.projectId,
      projectName: projects.name,
      clientId: tasks.clientId,
      clientCompany: clients.company,
      assigneeId: tasks.assigneeId,
      assigneeName: users.name,
      priority: tasks.priority,
      dueDate: tasks.dueDate,
      status: tasks.status,
      description: tasks.description,
      completedAt: tasks.completedAt,
      createdAt: tasks.createdAt,
      updatedAt: tasks.updatedAt,
    })
    .from(tasks)
    .leftJoin(projects, eq(tasks.projectId, projects.id))
    .leftJoin(clients, eq(tasks.clientId, clients.id))
    .leftJoin(users, eq(tasks.assigneeId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(asc(tasks.dueDate), desc(tasks.updatedAt));

  return NextResponse.json({ tasks: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("tasks:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = taskInputSchema.safeParse(parsedBody.data);
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
      if (proj) {
        resolvedClientId = proj.clientId;
      }
    }

    const [created] = await db
      .insert(tasks)
      .values({
        title: d.title,
        projectId: d.projectId ?? null,
        clientId: resolvedClientId,
        assigneeId: d.assigneeId ?? authUser.id,
        priority: d.priority,
        dueDate: d.dueDate || null,
        status: d.status,
        description: d.description,
        completedAt: d.status === "concluido" ? new Date() : null,
      })
      .returning();

    await logActivity({
      userId: authUser.id,
      entityType: created.projectId ? "project" : "task",
      entityId: created.projectId ?? created.id,
      action: "task_created",
      description: `Tarefa "${created.title}" criada (${TASK_STATUS_MAP[created.status].label}).`,
    });

    return NextResponse.json({ task: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar tarefa:", err);
    return NextResponse.json({ error: "Erro ao criar tarefa" }, { status: 500 });
  }
}

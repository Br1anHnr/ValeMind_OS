import { NextResponse } from "next/server";
import { asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { projects, users, weeklyGoals } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { weeklyGoalSchema } from "@/lib/validators";
import { getCurrentWeekStartYmd } from "@/lib/finance";
import { parseJsonBody } from "@/lib/api-utils";

export async function GET(request: Request) {
  const authUser = await requireApiUser("tasks:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const weekStart = searchParams.get("weekStart") || getCurrentWeekStartYmd();

  const rows = await db
    .select({
      id: weeklyGoals.id,
      title: weeklyGoals.title,
      weekStart: weeklyGoals.weekStart,
      ownerId: weeklyGoals.ownerId,
      ownerName: users.name,
      projectId: weeklyGoals.projectId,
      projectName: projects.name,
      completed: weeklyGoals.completed,
      completedAt: weeklyGoals.completedAt,
      notes: weeklyGoals.notes,
      createdAt: weeklyGoals.createdAt,
    })
    .from(weeklyGoals)
    .leftJoin(users, eq(weeklyGoals.ownerId, users.id))
    .leftJoin(projects, eq(weeklyGoals.projectId, projects.id))
    .where(eq(weeklyGoals.weekStart, weekStart))
    .orderBy(asc(weeklyGoals.completed), desc(weeklyGoals.createdAt));

  return NextResponse.json({ weekStart, goals: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("tasks:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = weeklyGoalSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [created] = await db
      .insert(weeklyGoals)
      .values({
        title: d.title,
        weekStart: d.weekStart || getCurrentWeekStartYmd(),
        ownerId: d.ownerId ?? authUser.id,
        projectId: d.projectId ?? null,
        completed: d.completed ?? false,
        completedAt: d.completed ? new Date() : null,
        notes: d.notes,
      })
      .returning();

    return NextResponse.json({ goal: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar meta semanal:", err);
    return NextResponse.json(
      { error: "Erro ao criar meta semanal" },
      { status: 500 }
    );
  }
}

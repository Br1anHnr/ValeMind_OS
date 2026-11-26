import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  clientStatusEnum,
  contacts,
  projects,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { clientInputSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

export async function GET(request: Request) {
  const authUser = await requireApiUser("clients:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const ownerId = (searchParams.get("ownerId") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(clients.name, pattern),
        ilike(clients.company, pattern),
        ilike(clients.email, pattern),
        ilike(clients.phone, pattern)
      )
    );
  }
  const statusCheck = validateEnumFilter(
    status,
    clientStatusEnum.enumValues,
    "status"
  );
  if (!statusCheck.ok) return statusCheck.response;
  if (statusCheck.value) {
    conditions.push(eq(clients.status, statusCheck.value));
  }
  const ownerCheck = validateUuidFilter(ownerId, "ownerId");
  if (!ownerCheck.ok) return ownerCheck.response;
  if (ownerCheck.value) {
    conditions.push(eq(clients.ownerId, ownerCheck.value));
  }

  const clientRows = await db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      email: clients.email,
      phone: clients.phone,
      website: clients.website,
      instagram: clients.instagram,
      ownerId: clients.ownerId,
      ownerName: users.name,
      status: clients.status,
      importantLinks: clients.importantLinks,
      notes: clients.notes,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
    })
    .from(clients)
    .leftJoin(users, eq(clients.ownerId, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(clients.updatedAt));

  const projectAggs = await db
    .select({
      clientId: projects.clientId,
      projectCount: sql<number>`count(*)::int`,
      activeProjectCount: sql<number>`count(*) filter (where ${projects.status} != 'encerrado')::int`,
      totalSoldValue: sql<string>`coalesce(sum(${projects.soldValue}), 0)::text`,
      totalMonthlyFee: sql<string>`coalesce(sum(case when ${projects.status} != 'encerrado' then ${projects.monthlyFee} else 0 end), 0)::text`,
    })
    .from(projects)
    .groupBy(projects.clientId);

  const aggMap = new Map(projectAggs.map((a) => [a.clientId, a]));

  const enriched = clientRows.map((c) => {
    const agg = aggMap.get(c.id);
    return {
      ...c,
      projectCount: agg?.projectCount ?? 0,
      activeProjectCount: agg?.activeProjectCount ?? 0,
      totalSoldValue: agg?.totalSoldValue ?? "0",
      totalMonthlyFee: agg?.totalMonthlyFee ?? "0",
    };
  });

  return NextResponse.json({ clients: enriched });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("clients:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = clientInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [created] = await db
      .insert(clients)
      .values({
        name: d.name,
        company: d.company,
        email: d.email,
        phone: d.phone,
        website: d.website,
        instagram: d.instagram,
        ownerId: d.ownerId ?? authUser.id,
        status: d.status,
        importantLinks: d.importantLinks ?? [],
        notes: d.notes,
      })
      .returning();

    if (d.name) {
      await db.insert(contacts).values({
        clientId: created.id,
        name: d.name,
        role: "Contato Principal",
        email: d.email,
        phone: d.phone,
        isPrimary: true,
      });
    }

    await logActivity({
      userId: authUser.id,
      entityType: "client",
      entityId: created.id,
      action: "client_created",
      description: `Cliente "${created.company}" (${created.name}) cadastrado.`,
    });

    return NextResponse.json({ client: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar cliente:", err);
    return NextResponse.json({ error: "Erro ao criar cliente" }, { status: 500 });
  }
}

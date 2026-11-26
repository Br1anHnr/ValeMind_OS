import { NextResponse } from "next/server";
import { and, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contacts,
  projectParticipants,
  projects,
  projectStatusEnum,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { projectInputSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { PROJECT_STATUS_MAP } from "@/lib/constants";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

export async function GET(request: Request) {
  const authUser = await requireApiUser("projects:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const clientId = (searchParams.get("clientId") ?? "").trim();
  const ownerId = (searchParams.get("ownerId") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(projects.name, pattern),
        ilike(projects.description, pattern),
        ilike(projects.nextDelivery, pattern),
        ilike(clients.company, pattern)
      )
    );
  }
  const statusCheck = validateEnumFilter(
    status,
    projectStatusEnum.enumValues,
    "status"
  );
  if (!statusCheck.ok) return statusCheck.response;
  if (statusCheck.value) {
    conditions.push(eq(projects.status, statusCheck.value));
  }
  const clientCheck = validateUuidFilter(clientId, "clientId");
  if (!clientCheck.ok) return clientCheck.response;
  if (clientCheck.value) {
    conditions.push(eq(projects.clientId, clientCheck.value));
  }
  const ownerCheck = validateUuidFilter(ownerId, "ownerId");
  if (!ownerCheck.ok) return ownerCheck.response;
  if (ownerCheck.value) {
    conditions.push(eq(projects.ownerId, ownerCheck.value));
  }

  const rows = await db
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
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(projects.updatedAt));

  const projectIds = rows.map((r) => r.id);
  const participantRows =
    projectIds.length > 0
      ? await db
          .select({
            projectId: projectParticipants.projectId,
            userId: users.id,
            userName: users.name,
          })
          .from(projectParticipants)
          .innerJoin(users, eq(projectParticipants.userId, users.id))
          .where(inArray(projectParticipants.projectId, projectIds))
      : [];

  const partMap = new Map<string, { id: string; name: string }[]>();
  for (const p of participantRows) {
    const list = partMap.get(p.projectId) ?? [];
    list.push({ id: p.userId, name: p.userName });
    partMap.set(p.projectId, list);
  }

  const enriched = rows.map((r) => ({
    ...r,
    participants: partMap.get(r.id) ?? [],
  }));

  return NextResponse.json({ projects: enriched });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("projects:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = projectInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const ownerId = d.ownerId ?? authUser.id;
    const participantIds = Array.from(
      new Set([...(d.participantIds ?? []), ownerId])
    );

    let existingClient: { id: string; company: string } | null = null;
    if (d.clientId && !d.newClient) {
      const [found] = await db
        .select({ id: clients.id, company: clients.company })
        .from(clients)
        .where(eq(clients.id, d.clientId))
        .limit(1);

      if (!found) {
        return NextResponse.json(
          { error: "Cliente selecionado não existe" },
          { status: 400 }
        );
      }
      existingClient = found;
    }

    const { project: created, client } = await db.transaction(async (tx) => {
      let resolvedClient = existingClient;

      if (!resolvedClient && d.newClient) {
        const contactName = d.newClient.name || d.newClient.company;
        const [newClientRow] = await tx
          .insert(clients)
          .values({
            company: d.newClient.company,
            name: contactName,
            email: d.newClient.email,
            phone: d.newClient.phone,
            ownerId,
            status: "ativo",
          })
          .returning({ id: clients.id, company: clients.company });

        await tx.insert(contacts).values({
          clientId: newClientRow.id,
          name: contactName,
          role: "Contato Principal",
          email: d.newClient.email,
          phone: d.newClient.phone,
          isPrimary: true,
        });

        resolvedClient = newClientRow;
      }

      if (!resolvedClient) {
        throw new Error("Cliente obrigatório");
      }

      const [proj] = await tx
        .insert(projects)
        .values({
          name: d.name,
          clientId: resolvedClient.id,
          description: d.description,
          ownerId,
          status: d.status,
          startDate: d.startDate || null,
          dueDate: d.dueDate || null,
          nextDelivery: d.nextDelivery,
          soldValue: parseNumericInput(d.soldValue),
          monthlyFee: parseNumericInput(d.monthlyFee),
          githubUrl: d.githubUrl,
          productionUrl: d.productionUrl,
          importantLinks: d.importantLinks ?? [],
          notes: d.notes,
        })
        .returning();

      if (participantIds.length > 0) {
        await tx
          .insert(projectParticipants)
          .values(
            participantIds.map((userId) => ({
              projectId: proj.id,
              userId,
            }))
          )
          .onConflictDoNothing();
      }

      return { project: proj, client: resolvedClient };
    });

    await Promise.all([
      logActivity({
        userId: authUser.id,
        entityType: "project",
        entityId: created.id,
        action: "project_created",
        description: `Projeto "${created.name}" criado para "${client.company}" (${PROJECT_STATUS_MAP[created.status].label}).`,
      }),
      logActivity({
        userId: authUser.id,
        entityType: "client",
        entityId: client.id,
        action: "project_linked",
        description: `Projeto "${created.name}" vinculado ao cliente "${client.company}".`,
      }),
    ]);

    return NextResponse.json({ project: created, client }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar projeto:", err);
    return NextResponse.json({ error: "Erro ao criar projeto" }, { status: 500 });
  }
}

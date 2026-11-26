import { NextResponse } from "next/server";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  clients,
  contacts,
  financialEntries,
  leads,
  meetings,
  projects,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { clientPatchSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("clients:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do cliente inválido");
  const [client] = await db
    .select({
      id: clients.id,
      name: clients.name,
      company: clients.company,
      email: clients.email,
      phone: clients.phone,
      website: clients.website,
      instagram: clients.instagram,
      legalName: clients.legalName,
      document: clients.document,
      address: clients.address,
      representativeName: clients.representativeName,
      representativeCpf: clients.representativeCpf,
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
    .where(eq(clients.id, id))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const [
    clientContacts,
    clientProjects,
    clientMeetings,
    clientFinancial,
    originLeads,
    clientActivities,
  ] = await Promise.all([
    db
      .select()
      .from(contacts)
      .where(eq(contacts.clientId, id))
      .orderBy(desc(contacts.isPrimary), desc(contacts.createdAt)),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        ownerId: projects.ownerId,
        ownerName: users.name,
        startDate: projects.startDate,
        dueDate: projects.dueDate,
        nextDelivery: projects.nextDelivery,
        soldValue: projects.soldValue,
        monthlyFee: projects.monthlyFee,
        githubUrl: projects.githubUrl,
        productionUrl: projects.productionUrl,
        updatedAt: projects.updatedAt,
      })
      .from(projects)
      .leftJoin(users, eq(projects.ownerId, users.id))
      .where(eq(projects.clientId, id))
      .orderBy(desc(projects.updatedAt)),
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        meetingDate: meetings.meetingDate,
        decisions: meetings.decisions,
        nextActions: meetings.nextActions,
      })
      .from(meetings)
      .where(eq(meetings.clientId, id))
      .orderBy(desc(meetings.meetingDate))
      .limit(10),
    db
      .select({
        id: financialEntries.id,
        description: financialEntries.description,
        amount: financialEntries.amount,
        dueDate: financialEntries.dueDate,
        status: financialEntries.status,
        entryType: financialEntries.entryType,
      })
      .from(financialEntries)
      .where(eq(financialEntries.clientId, id))
      .orderBy(asc(financialEntries.dueDate))
      .limit(15),
    db
      .select({
        id: leads.id,
        company: leads.company,
        source: leads.source,
        convertedAt: leads.convertedAt,
      })
      .from(leads)
      .where(eq(leads.convertedClientId, id)),
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
        and(eq(activities.entityType, "client"), eq(activities.entityId, id))
      )
      .orderBy(desc(activities.createdAt))
      .limit(20),
  ]);

  return NextResponse.json({
    client,
    contacts: clientContacts,
    projects: clientProjects,
    meetings: clientMeetings,
    financialEntries: clientFinancial,
    originLeads,
    activities: clientActivities,
  });
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("clients:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do cliente inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = clientPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [updated] = await db
      .update(clients)
      .set({
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.company !== undefined ? { company: d.company } : {}),
        ...(d.email !== undefined ? { email: d.email } : {}),
        ...(d.phone !== undefined ? { phone: d.phone } : {}),
        ...(d.website !== undefined ? { website: d.website } : {}),
        ...(d.instagram !== undefined ? { instagram: d.instagram } : {}),
        ...(d.legalName !== undefined ? { legalName: d.legalName } : {}),
        ...(d.document !== undefined ? { document: d.document } : {}),
        ...(d.address !== undefined ? { address: d.address } : {}),
        ...(d.representativeName !== undefined
          ? { representativeName: d.representativeName }
          : {}),
        ...(d.representativeCpf !== undefined
          ? { representativeCpf: d.representativeCpf }
          : {}),
        ...(d.ownerId !== undefined ? { ownerId: d.ownerId } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.importantLinks !== undefined
          ? { importantLinks: d.importantLinks }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedAt: new Date(),
      })
      .where(eq(clients.id, id))
      .returning();

    if (!updated) {
      return NextResponse.json(
        { error: "Cliente não encontrado" },
        { status: 404 }
      );
    }

    await logActivity({
      userId: authUser.id,
      entityType: "client",
      entityId: updated.id,
      action: "client_updated",
      description: `Dados do cliente "${updated.company}" atualizados.`,
    });

    return NextResponse.json({ client: updated });
  } catch (err) {
    console.error("Erro ao atualizar cliente:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar cliente" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("clients:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do cliente inválido");
  const [deleted] = await db
    .delete(clients)
    .where(eq(clients.id, id))
    .returning({ id: clients.id });

  if (!deleted) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

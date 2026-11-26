import { NextResponse } from "next/server";
import { ilike, or, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contacts,
  leads,
  meetings,
  projects,
  proposals,
  secrets,
  tasks,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";

export async function GET(request: Request) {
  const authUser = await requireApiUser();
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  if (q.length < 2) {
    return NextResponse.json({
      leads: [],
      proposals: [],
      clients: [],
      projects: [],
      tasks: [],
      meetings: [],
      secrets: [],
      contacts: [],
    });
  }

  const pattern = `%${q}%`;

  const [
    leadRows,
    proposalRows,
    clientRows,
    projectRows,
    taskRows,
    meetingRows,
    secretRows,
    contactRows,
  ] = await Promise.all([
    db
      .select({
        id: leads.id,
        company: leads.company,
        contactName: leads.contactName,
        stage: leads.stage,
      })
      .from(leads)
      .where(
        or(
          ilike(leads.company, pattern),
          ilike(leads.contactName, pattern),
          ilike(leads.email, pattern),
          ilike(leads.source, pattern)
        )
      )
      .orderBy(desc(leads.updatedAt))
      .limit(5),
    db
      .select({
        id: proposals.id,
        title: proposals.title,
        status: proposals.status,
      })
      .from(proposals)
      .where(or(ilike(proposals.title, pattern), ilike(proposals.scope, pattern)))
      .orderBy(desc(proposals.updatedAt))
      .limit(5),
    db
      .select({
        id: clients.id,
        name: clients.name,
        company: clients.company,
        status: clients.status,
      })
      .from(clients)
      .where(
        or(
          ilike(clients.name, pattern),
          ilike(clients.company, pattern),
          ilike(clients.email, pattern)
        )
      )
      .orderBy(desc(clients.updatedAt))
      .limit(5),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        clientId: projects.clientId,
        clientCompany: clients.company,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .where(
        or(
          ilike(projects.name, pattern),
          ilike(projects.description, pattern),
          ilike(clients.company, pattern)
        )
      )
      .orderBy(desc(projects.updatedAt))
      .limit(5),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        projectId: tasks.projectId,
        projectName: projects.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(clients, eq(tasks.clientId, clients.id))
      .where(
        or(
          ilike(tasks.title, pattern),
          ilike(tasks.description, pattern),
          ilike(projects.name, pattern),
          ilike(clients.company, pattern)
        )
      )
      .orderBy(desc(tasks.updatedAt))
      .limit(5),
    db
      .select({
        id: meetings.id,
        title: meetings.title,
        meetingDate: meetings.meetingDate,
        clientCompany: clients.company,
      })
      .from(meetings)
      .leftJoin(clients, eq(meetings.clientId, clients.id))
      .where(
        or(
          ilike(meetings.title, pattern),
          ilike(meetings.decisions, pattern),
          ilike(clients.company, pattern)
        )
      )
      .orderBy(desc(meetings.meetingDate))
      .limit(5),
    // PRD seção 11 & 12: busca credenciais SOMENTE pelo nome, serviço, projeto ou empresa do cliente (NUNCA pelo segredo)
    db
      .select({
        id: secrets.id,
        name: secrets.name,
        service: secrets.service,
        projectId: secrets.projectId,
        projectName: projects.name,
      })
      .from(secrets)
      .leftJoin(projects, eq(secrets.projectId, projects.id))
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .where(
        or(
          ilike(secrets.name, pattern),
          ilike(secrets.service, pattern),
          ilike(projects.name, pattern),
          ilike(clients.company, pattern)
        )
      )
      .orderBy(desc(secrets.updatedAt))
      .limit(5),
    db
      .select({
        id: contacts.id,
        name: contacts.name,
        role: contacts.role,
        clientId: contacts.clientId,
        clientCompany: clients.company,
      })
      .from(contacts)
      .innerJoin(clients, eq(contacts.clientId, clients.id))
      .where(
        or(
          ilike(contacts.name, pattern),
          ilike(contacts.email, pattern),
          ilike(contacts.phone, pattern)
        )
      )
      .limit(5),
  ]);

  return NextResponse.json({
    leads: leadRows,
    proposals: proposalRows,
    clients: clientRows,
    projects: projectRows,
    tasks: taskRows,
    meetings: meetingRows,
    secrets: secretRows,
    contacts: contactRows,
  });
}

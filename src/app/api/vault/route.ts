import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  credentialTypeEnum,
  projects,
  secrets,
  users,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { secretInputSchema } from "@/lib/validators";
import { encryptSecret } from "@/lib/vault";
import { logActivity } from "@/lib/activity";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

export async function GET(request: Request) {
  const authUser = await requireApiUser("vault:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const service = (searchParams.get("service") ?? "").trim();
  const projectId = (searchParams.get("projectId") ?? "").trim();
  const credentialType = (searchParams.get("credentialType") ?? "").trim();

  const conditions = [];
  // Busca NUNCA utiliza o conteúdo criptografado/secreto (PRD seção 11)
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(secrets.name, pattern),
        ilike(secrets.service, pattern),
        ilike(projects.name, pattern),
        ilike(clients.company, pattern)
      )
    );
  }
  if (service && service !== "all") {
    conditions.push(eq(secrets.service, service));
  }
  const projectCheck = validateUuidFilter(projectId, "projectId");
  if (!projectCheck.ok) return projectCheck.response;
  if (projectCheck.value) {
    conditions.push(eq(secrets.projectId, projectCheck.value));
  }
  const typeCheck = validateEnumFilter(
    credentialType,
    credentialTypeEnum.enumValues,
    "credentialType"
  );
  if (!typeCheck.ok) return typeCheck.response;
  if (typeCheck.value) {
    conditions.push(eq(secrets.credentialType, typeCheck.value));
  }

  const rows = await db
    .select({
      id: secrets.id,
      name: secrets.name,
      service: secrets.service,
      projectId: secrets.projectId,
      projectName: projects.name,
      clientCompany: clients.company,
      url: secrets.url,
      login: secrets.login,
      credentialType: secrets.credentialType,
      notes: secrets.notes,
      updatedByName: users.name,
      updatedAt: secrets.updatedAt,
      createdAt: secrets.createdAt,
    })
    .from(secrets)
    .leftJoin(projects, eq(secrets.projectId, projects.id))
    .leftJoin(clients, eq(projects.clientId, clients.id))
    .leftJoin(users, eq(secrets.updatedById, users.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(secrets.updatedAt));

  return NextResponse.json({ secrets: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("vault:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = secretInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const encryptedSecret = encryptSecret(d.secretValue);

    const [created] = await db
      .insert(secrets)
      .values({
        name: d.name,
        service: d.service,
        projectId: d.projectId ?? null,
        url: d.url,
        login: d.login,
        encryptedSecret,
        credentialType: d.credentialType,
        notes: d.notes,
        updatedById: authUser.id,
      })
      .returning({
        id: secrets.id,
        name: secrets.name,
        service: secrets.service,
        projectId: secrets.projectId,
        credentialType: secrets.credentialType,
        updatedAt: secrets.updatedAt,
      });

    await logActivity({
      userId: authUser.id,
      entityType: created.projectId ? "project" : "secret",
      entityId: created.projectId ?? created.id,
      action: "secret_created",
      description: `Credencial "${created.name}" (${created.service}) armazenada no Cofre.`,
    });

    return NextResponse.json({ secret: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao salvar credencial:", err);
    return NextResponse.json(
      { error: "Erro ao armazenar credencial no Cofre" },
      { status: 500 }
    );
  }
}

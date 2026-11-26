import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  clients,
  contacts,
  leads,
  projectParticipants,
  projects,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { convertLeadSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("leads:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID do lead inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id)).limit(1);
    if (!lead) {
      return NextResponse.json({ error: "Lead não encontrado" }, { status: 404 });
    }

    if (lead.convertedClientId) {
      return NextResponse.json(
        {
          error: "Este lead já foi convertido em cliente.",
          clientId: lead.convertedClientId,
        },
        { status: 409 }
      );
    }

    const parsed = convertLeadSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (d.createProject && !d.projectName) {
      return NextResponse.json(
        { error: "Informe o nome do projeto inicial" },
        { status: 400 }
      );
    }

    const ownerId = d.ownerId ?? lead.ownerId ?? authUser.id;
    const now = new Date();

    const result = await db.transaction(async (tx) => {
      const [createdClient] = await tx
        .insert(clients)
        .values({
          name: d.clientName,
          company: d.clientCompany,
          email: lead.email,
          phone: lead.phone,
          website: lead.website,
          instagram: lead.instagram,
          ownerId,
          status: d.clientStatus,
          notes: lead.notes,
        })
        .returning();

      await tx.insert(contacts).values({
        clientId: createdClient.id,
        name: lead.contactName,
        role: "Contato Principal",
        email: lead.email,
        phone: lead.phone,
        isPrimary: true,
      });

      let createdProject = null;
      if (d.createProject && d.projectName) {
        const [proj] = await tx
          .insert(projects)
          .values({
            name: d.projectName,
            clientId: createdClient.id,
            description: d.projectDescription,
            ownerId,
            status: d.projectStatus,
            startDate: d.startDate || null,
            dueDate: d.dueDate || null,
            nextDelivery: d.nextDelivery,
            soldValue:
              parseNumericInput(d.soldValue) ?? lead.potentialValue ?? null,
            monthlyFee: parseNumericInput(d.monthlyFee),
          })
          .returning();

        createdProject = proj;

        await tx
          .insert(projectParticipants)
          .values({
            projectId: proj.id,
            userId: ownerId,
          })
          .onConflictDoNothing();
      }

      const [updatedLead] = await tx
        .update(leads)
        .set({
          stage: "fechado",
          convertedClientId: createdClient.id,
          convertedAt: now,
          updatedAt: now,
        })
        .where(eq(leads.id, lead.id))
        .returning();

      await tx.insert(activities).values([
        {
          userId: authUser.id,
          entityType: "lead",
          entityId: lead.id,
          action: "lead_converted",
          description: `Lead "${lead.company}" convertido no cliente "${createdClient.company}"${createdProject ? ` e projeto "${createdProject.name}"` : ""}.`,
        },
        {
          userId: authUser.id,
          entityType: "client",
          entityId: createdClient.id,
          action: "client_created_from_lead",
          description: `Cliente "${createdClient.company}" criado a partir da conversão do lead "${lead.company}".`,
        },
        ...(createdProject
          ? [
              {
                userId: authUser.id,
                entityType: "project" as const,
                entityId: createdProject.id,
                action: "project_created_from_lead",
                description: `Projeto "${createdProject.name}" iniciado para o cliente "${createdClient.company}".`,
              },
            ]
          : []),
      ]);

      return {
        lead: updatedLead,
        client: createdClient,
        project: createdProject,
      };
    });

    return NextResponse.json(result, { status: 201 });
  } catch (err) {
    console.error("Erro ao converter lead:", err);
    return NextResponse.json(
      { error: "Erro ao converter lead em cliente e projeto" },
      { status: 500 }
    );
  }
}

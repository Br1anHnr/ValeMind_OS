import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clients, contacts } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { contactInputSchema } from "@/lib/validators";
import { logActivity } from "@/lib/activity";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("clients:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: clientId } = await context.params;
  if (!isValidUuid(clientId)) return invalidIdResponse("ID do cliente inválido");
  const [client] = await db
    .select({ id: clients.id, company: clients.company })
    .from(clients)
    .where(eq(clients.id, clientId))
    .limit(1);

  if (!client) {
    return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = contactInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    if (d.isPrimary) {
      await db
        .update(contacts)
        .set({ isPrimary: false })
        .where(eq(contacts.clientId, clientId));
    }

    const [created] = await db
      .insert(contacts)
      .values({
        clientId,
        name: d.name,
        role: d.role,
        email: d.email,
        phone: d.phone,
        isPrimary: d.isPrimary,
        notes: d.notes,
      })
      .returning();

    await logActivity({
      userId: authUser.id,
      entityType: "client",
      entityId: clientId,
      action: "contact_added",
      description: `Contato "${created.name}" adicionado ao cliente "${client.company}".`,
    });

    return NextResponse.json({ contact: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao adicionar contato:", err);
    return NextResponse.json(
      { error: "Erro ao adicionar contato" },
      { status: 500 }
    );
  }
}

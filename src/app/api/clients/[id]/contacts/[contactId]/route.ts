import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { invalidIdResponse, isValidUuid } from "@/lib/api-utils";

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; contactId: string }> }
) {
  const authUser = await requireApiUser("clients:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id: clientId, contactId } = await context.params;
  if (!isValidUuid(clientId) || !isValidUuid(contactId)) {
    return invalidIdResponse("ID inválido");
  }
  const [deleted] = await db
    .delete(contacts)
    .where(and(eq(contacts.id, contactId), eq(contacts.clientId, clientId)))
    .returning({ id: contacts.id });

  if (!deleted) {
    return NextResponse.json({ error: "Contato não encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}

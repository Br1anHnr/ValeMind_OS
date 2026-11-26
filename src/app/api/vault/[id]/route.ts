import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { secrets } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { secretPatchSchema } from "@/lib/validators";
import { encryptSecret } from "@/lib/vault";
import {
  invalidIdResponse,
  isValidUuid,
  parseJsonBody,
} from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("vault:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da credencial inválido");

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = secretPatchSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [updated] = await db
      .update(secrets)
      .set({
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.service !== undefined ? { service: d.service } : {}),
        ...(d.projectId !== undefined ? { projectId: d.projectId } : {}),
        ...(d.url !== undefined ? { url: d.url } : {}),
        ...(d.login !== undefined ? { login: d.login } : {}),
        ...(d.secretValue && d.secretValue.length > 0
          ? { encryptedSecret: encryptSecret(d.secretValue) }
          : {}),
        ...(d.credentialType !== undefined
          ? { credentialType: d.credentialType }
          : {}),
        ...(d.notes !== undefined ? { notes: d.notes } : {}),
        updatedById: authUser.id,
        updatedAt: new Date(),
      })
      .where(eq(secrets.id, id))
      .returning({
        id: secrets.id,
        name: secrets.name,
        service: secrets.service,
        updatedAt: secrets.updatedAt,
      });

    if (!updated) {
      return NextResponse.json(
        { error: "Credencial não encontrada" },
        { status: 404 }
      );
    }

    await logActivity({
      userId: authUser.id,
      entityType: "secret",
      entityId: updated.id,
      action: "secret_updated",
      description: `Credencial "${updated.name}" (${updated.service}) atualizada no Cofre.`,
    });

    return NextResponse.json({ secret: updated });
  } catch (err) {
    console.error("Erro ao atualizar credencial:", err);
    return NextResponse.json(
      { error: "Erro ao atualizar credencial" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("vault:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) return invalidIdResponse("ID da credencial inválido");
  const [deleted] = await db
    .delete(secrets)
    .where(eq(secrets.id, id))
    .returning({ id: secrets.id, name: secrets.name, service: secrets.service });

  if (!deleted) {
    return NextResponse.json(
      { error: "Credencial não encontrada" },
      { status: 404 }
    );
  }

  await logActivity({
    userId: authUser.id,
    entityType: "secret",
    entityId: deleted.id,
    action: "secret_deleted",
    description: `Credencial "${deleted.name}" (${deleted.service}) removida do Cofre.`,
  });

  return NextResponse.json({ ok: true });
}

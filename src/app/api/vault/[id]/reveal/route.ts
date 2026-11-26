import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { secrets } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { decryptSecret } from "@/lib/vault";
import { invalidIdResponse, isValidUuid } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const authUser = await requireApiUser("vault:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!isValidUuid(id)) {
    return invalidIdResponse("ID da credencial inválido");
  }

  const [row] = await db
    .select({
      id: secrets.id,
      name: secrets.name,
      service: secrets.service,
      projectId: secrets.projectId,
      encryptedSecret: secrets.encryptedSecret,
    })
    .from(secrets)
    .where(eq(secrets.id, id))
    .limit(1);

  if (!row) {
    return NextResponse.json(
      { error: "Credencial não encontrada" },
      { status: 404 }
    );
  }

  try {
    const secretValue = decryptSecret(row.encryptedSecret);

    await logActivity({
      userId: authUser.id,
      entityType: row.projectId ? "project" : "secret",
      entityId: row.projectId ?? row.id,
      action: "secret_revealed",
      description: `Credencial "${row.name}" (${row.service}) visualizada no Cofre.`,
    });

    return NextResponse.json(
      { secretValue },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, private",
          Pragma: "no-cache",
        },
      }
    );
  } catch (err) {
    console.error("Erro ao descriptografar credencial:", err);
    return NextResponse.json(
      { error: "Falha ao descriptografar credencial" },
      { status: 500 }
    );
  }
}

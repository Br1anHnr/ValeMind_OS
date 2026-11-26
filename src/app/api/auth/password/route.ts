import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { createSession, requireApiUser } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { changePasswordSchema } from "@/lib/validators";
import { parseJsonBody } from "@/lib/api-utils";
import { logActivity } from "@/lib/activity";

export async function PATCH(request: Request) {
  const authUser = await requireApiUser("settings:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = changePasswordSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const [dbUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, authUser.id))
      .limit(1);

    if (
      !dbUser ||
      !verifyPassword(parsed.data.currentPassword, dbUser.passwordHash)
    ) {
      return NextResponse.json(
        { error: "Senha atual incorreta" },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          passwordHash: hashPassword(parsed.data.newPassword),
          updatedAt: new Date(),
        })
        .where(eq(users.id, authUser.id));

      // Revoga todas as sessões anteriores deste usuário
      await tx.delete(sessions).where(eq(sessions.userId, authUser.id));
    });

    // Emite nova sessão limpa para o dispositivo atual
    await createSession(authUser.id);

    await logActivity({
      userId: authUser.id,
      entityType: "user",
      entityId: authUser.id,
      action: "password_changed",
      description: `Senha da conta ${authUser.email} alterada e sessões anteriores revogadas.`,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Erro ao alterar senha:", err);
    return NextResponse.json(
      { error: "Erro ao alterar senha" },
      { status: 500 }
    );
  }
}

import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { companySettings } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { companySettingsSchema } from "@/lib/validators";
import { parseJsonBody } from "@/lib/api-utils";

export async function GET() {
  const authUser = await requireApiUser("settings:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [existing] = await db.select().from(companySettings).limit(1);
  return NextResponse.json({
    company: existing ?? {
      legalName: "ValeMind",
      tradeName: "ValeMind",
      cnpj: "",
      address: "",
      city: "",
      state: "",
      representativeName: "",
      representativeCpf: "",
      email: "",
      phone: "",
      pixKey: "",
    },
  });
}

export async function PUT(request: Request) {
  const authUser = await requireApiUser("settings:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  const parsed = companySettingsSchema.safeParse(parsedBody.data);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
      { status: 400 }
    );
  }

  try {
    const d = parsed.data;
    const [existing] = await db.select().from(companySettings).limit(1);

    let saved;
    if (existing) {
      const [updated] = await db
        .update(companySettings)
        .set({
          legalName: d.legalName,
          tradeName: d.tradeName,
          cnpj: d.cnpj,
          address: d.address,
          city: d.city,
          state: d.state,
          representativeName: d.representativeName,
          representativeCpf: d.representativeCpf,
          email: d.email,
          phone: d.phone,
          pixKey: d.pixKey,
          updatedAt: new Date(),
        })
        .where(eq(companySettings.id, existing.id))
        .returning();
      saved = updated;
    } else {
      const [inserted] = await db
        .insert(companySettings)
        .values({
          legalName: d.legalName,
          tradeName: d.tradeName,
          cnpj: d.cnpj,
          address: d.address,
          city: d.city,
          state: d.state,
          representativeName: d.representativeName,
          representativeCpf: d.representativeCpf,
          email: d.email,
          phone: d.phone,
          pixKey: d.pixKey,
        })
        .returning();
      saved = inserted;
    }

    return NextResponse.json({ company: saved });
  } catch (err) {
    console.error("Erro ao salvar dados da empresa:", err);
    return NextResponse.json(
      { error: "Erro ao salvar dados da empresa" },
      { status: 500 }
    );
  }
}

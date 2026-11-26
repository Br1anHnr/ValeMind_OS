import { NextResponse } from "next/server";
import { and, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import { clients, leads, leadStageEnum, users } from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { leadInputSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { logActivity } from "@/lib/activity";
import { LEAD_STAGE_MAP } from "@/lib/constants";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

function parseDateOrNull(val: string | null | undefined): Date | null {
  if (!val) return null;
  const d = new Date(val.length === 10 ? `${val}T12:00:00` : val);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function GET(request: Request) {
  const authUser = await requireApiUser("leads:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const stage = (searchParams.get("stage") ?? "").trim();
  const ownerId = (searchParams.get("ownerId") ?? "").trim();
  const source = (searchParams.get("source") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(leads.company, pattern),
        ilike(leads.contactName, pattern),
        ilike(leads.email, pattern),
        ilike(leads.phone, pattern),
        ilike(leads.nextAction, pattern)
      )
    );
  }
  const stageCheck = validateEnumFilter(
    stage,
    leadStageEnum.enumValues,
    "stage"
  );
  if (!stageCheck.ok) return stageCheck.response;
  if (stageCheck.value) {
    conditions.push(eq(leads.stage, stageCheck.value));
  }

  const ownerCheck = validateUuidFilter(ownerId, "ownerId");
  if (!ownerCheck.ok) return ownerCheck.response;
  if (ownerCheck.value) {
    conditions.push(eq(leads.ownerId, ownerCheck.value));
  }
  if (source && source !== "all") {
    conditions.push(eq(leads.source, source));
  }

  const rows = await db
    .select({
      id: leads.id,
      company: leads.company,
      contactName: leads.contactName,
      phone: leads.phone,
      email: leads.email,
      website: leads.website,
      instagram: leads.instagram,
      source: leads.source,
      ownerId: leads.ownerId,
      ownerName: users.name,
      stage: leads.stage,
      lastContactAt: leads.lastContactAt,
      nextAction: leads.nextAction,
      nextFollowUpAt: leads.nextFollowUpAt,
      potentialValue: leads.potentialValue,
      notes: leads.notes,
      convertedClientId: leads.convertedClientId,
      convertedClientCompany: clients.company,
      convertedAt: leads.convertedAt,
      createdAt: leads.createdAt,
      updatedAt: leads.updatedAt,
    })
    .from(leads)
    .leftJoin(users, eq(leads.ownerId, users.id))
    .leftJoin(clients, eq(leads.convertedClientId, clients.id))
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(leads.updatedAt));

  return NextResponse.json({ leads: rows });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("leads:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = leadInputSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const [created] = await db
      .insert(leads)
      .values({
        company: d.company,
        contactName: d.contactName,
        phone: d.phone,
        email: d.email,
        website: d.website,
        instagram: d.instagram,
        source: d.source,
        ownerId: d.ownerId ?? authUser.id,
        stage: d.stage,
        lastContactAt: parseDateOrNull(d.lastContactAt),
        nextAction: d.nextAction,
        nextFollowUpAt: parseDateOrNull(d.nextFollowUpAt),
        potentialValue: parseNumericInput(d.potentialValue),
        notes: d.notes,
      })
      .returning();

    await logActivity({
      userId: authUser.id,
      entityType: "lead",
      entityId: created.id,
      action: "lead_created",
      description: `Lead "${created.company}" (${created.contactName}) criado na etapa ${LEAD_STAGE_MAP[created.stage].label}.`,
    });

    return NextResponse.json({ lead: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar lead:", err);
    return NextResponse.json({ error: "Erro ao criar lead" }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { and, asc, desc, eq, ilike, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contacts,
  financialEntries,
  financialEntryTypeEnum,
  financialStatusEnum,
  projects,
  recurringPayments,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { financialEntrySchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { getTodayYmd, syncRecurringFinancialEntries } from "@/lib/finance";
import { logActivity } from "@/lib/activity";
import {
  parseJsonBody,
  validateEnumFilter,
  validateUuidFilter,
} from "@/lib/api-utils";

export async function GET(request: Request) {
  const authUser = await requireApiUser("financial:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await syncRecurringFinancialEntries();

  const { searchParams } = new URL(request.url);
  const search = (searchParams.get("search") ?? "").trim();
  const status = (searchParams.get("status") ?? "").trim();
  const entryType = (searchParams.get("entryType") ?? "").trim();
  const clientId = (searchParams.get("clientId") ?? "").trim();
  const projectId = (searchParams.get("projectId") ?? "").trim();

  const conditions = [];
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      or(
        ilike(financialEntries.description, pattern),
        ilike(clients.company, pattern),
        ilike(projects.name, pattern)
      )
    );
  }
  const statusCheck = validateEnumFilter(
    status,
    financialStatusEnum.enumValues,
    "status"
  );
  if (!statusCheck.ok) return statusCheck.response;
  if (statusCheck.value) {
    conditions.push(eq(financialEntries.status, statusCheck.value));
  }

  const typeCheck = validateEnumFilter(
    entryType,
    financialEntryTypeEnum.enumValues,
    "entryType"
  );
  if (!typeCheck.ok) return typeCheck.response;
  if (typeCheck.value) {
    conditions.push(eq(financialEntries.entryType, typeCheck.value));
  }

  const clientCheck = validateUuidFilter(clientId, "clientId");
  if (!clientCheck.ok) return clientCheck.response;
  if (clientCheck.value) {
    conditions.push(eq(financialEntries.clientId, clientCheck.value));
  }

  const projectCheck = validateUuidFilter(projectId, "projectId");
  if (!projectCheck.ok) return projectCheck.response;
  if (projectCheck.value) {
    conditions.push(eq(financialEntries.projectId, projectCheck.value));
  }

  const [entries, allEntries, contracts] = await Promise.all([
    db
      .select({
        id: financialEntries.id,
        clientId: financialEntries.clientId,
        clientCompany: clients.company,
        projectId: financialEntries.projectId,
        projectName: projects.name,
        recurringPaymentId: financialEntries.recurringPaymentId,
        description: financialEntries.description,
        entryType: financialEntries.entryType,
        referenceMonth: financialEntries.referenceMonth,
        amount: financialEntries.amount,
        dueDate: financialEntries.dueDate,
        paidAt: financialEntries.paidAt,
        status: financialEntries.status,
        paymentMethod: financialEntries.paymentMethod,
        notes: financialEntries.notes,
        createdAt: financialEntries.createdAt,
      })
      .from(financialEntries)
      .innerJoin(clients, eq(financialEntries.clientId, clients.id))
      .leftJoin(projects, eq(financialEntries.projectId, projects.id))
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(financialEntries.dueDate), desc(financialEntries.createdAt)),
    db
      .select({
        id: financialEntries.id,
        projectId: financialEntries.projectId,
        projectName: projects.name,
        clientCompany: clients.company,
        entryType: financialEntries.entryType,
        amount: financialEntries.amount,
        dueDate: financialEntries.dueDate,
        paidAt: financialEntries.paidAt,
        status: financialEntries.status,
      })
      .from(financialEntries)
      .innerJoin(clients, eq(financialEntries.clientId, clients.id))
      .leftJoin(projects, eq(financialEntries.projectId, projects.id)),
    db
      .select({
        id: recurringPayments.id,
        projectId: recurringPayments.projectId,
        projectName: projects.name,
        projectStatus: projects.status,
        clientId: recurringPayments.clientId,
        clientCompany: clients.company,
        totalSoldValue: recurringPayments.totalSoldValue,
        setupValue: recurringPayments.setupValue,
        monthlyFee: recurringPayments.monthlyFee,
        billingStartDate: recurringPayments.billingStartDate,
        dueDay: recurringPayments.dueDay,
        paymentMethod: recurringPayments.paymentMethod,
        installmentsCount: recurringPayments.installmentsCount,
        active: recurringPayments.active,
        notes: recurringPayments.notes,
      })
      .from(recurringPayments)
      .innerJoin(projects, eq(recurringPayments.projectId, projects.id))
      .innerJoin(clients, eq(recurringPayments.clientId, clients.id))
      .orderBy(desc(recurringPayments.updatedAt)),
  ]);

  const today = getTodayYmd();
  const currentMonthPrefix = today.slice(0, 7);

  let receivedThisMonth = 0;
  let totalReceivedAllTime = 0;
  let forecastThisMonth = 0;
  let futureForecast = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;
  let oneTimeReceived = 0;
  let recurringReceived = 0;
  let oneTimeTotal = 0;
  let recurringTotal = 0;

  const byProjectMap = new Map<
    string,
    {
      projectId: string;
      projectName: string;
      clientCompany: string;
      received: number;
      receivable: number;
      monthlyFee: number;
    }
  >();

  for (const c of contracts) {
    byProjectMap.set(c.projectId, {
      projectId: c.projectId,
      projectName: c.projectName,
      clientCompany: c.clientCompany,
      received: 0,
      receivable: 0,
      monthlyFee:
        c.active && c.projectStatus !== "encerrado"
          ? Number(c.monthlyFee ?? 0)
          : 0,
    });
  }

  for (const e of allEntries) {
    if (e.status === "cancelado") continue;
    const amt = Number(e.amount ?? 0);

    if (e.entryType === "pontual") oneTimeTotal += amt;
    else recurringTotal += amt;

    if (e.status === "pago") {
      totalReceivedAllTime += amt;
      if (e.entryType === "pontual") oneTimeReceived += amt;
      else recurringReceived += amt;

      const refDate = e.paidAt || e.dueDate;
      if (refDate?.startsWith(currentMonthPrefix)) {
        receivedThisMonth += amt;
      }
    } else {
      if (e.status === "atrasado") {
        overdueAmount += amt;
      } else {
        pendingAmount += amt;
      }
      if (e.dueDate?.startsWith(currentMonthPrefix)) {
        forecastThisMonth += amt;
      }
      if (e.dueDate && e.dueDate >= today) {
        futureForecast += amt;
      }
    }

    if (e.projectId) {
      const existing = byProjectMap.get(e.projectId) ?? {
        projectId: e.projectId,
        projectName: e.projectName ?? "Projeto",
        clientCompany: e.clientCompany,
        received: 0,
        receivable: 0,
        monthlyFee: 0,
      };
      if (e.status === "pago") existing.received += amt;
      else existing.receivable += amt;
      byProjectMap.set(e.projectId, existing);
    }
  }

  const mrr = contracts
    .filter((c) => c.active && c.projectStatus !== "encerrado")
    .reduce((acc, c) => acc + Number(c.monthlyFee ?? 0), 0);

  return NextResponse.json({
    entries,
    contracts,
    summary: {
      receivedThisMonth,
      totalReceivedAllTime,
      forecastThisMonth: forecastThisMonth + receivedThisMonth,
      futureForecast,
      pendingAmount,
      overdueAmount,
      mrr,
      oneTimeReceived,
      recurringReceived,
      oneTimeTotal,
      recurringTotal,
      byProject: Array.from(byProjectMap.values()).sort(
        (a, b) => b.received + b.receivable - (a.received + a.receivable)
      ),
    },
  });
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("financial:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = financialEntrySchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const amount = parseNumericInput(d.amount);
    if (!amount || Number(amount) <= 0) {
      return NextResponse.json(
        { error: "Informe um valor maior que zero" },
        { status: 400 }
      );
    }

    const paidAt =
      d.status === "pago" ? d.paidAt || getTodayYmd() : d.paidAt || null;

    const created = await db.transaction(async (tx) => {
      let resolvedClientId = d.clientId ?? null;

      if (!resolvedClientId && d.newClient) {
        const contactName = d.newClient.name || d.newClient.company;
        const [newClientRow] = await tx
          .insert(clients)
          .values({
            company: d.newClient.company,
            name: contactName,
            email: d.newClient.email,
            phone: d.newClient.phone,
            ownerId: authUser.id,
            status: "ativo",
          })
          .returning({ id: clients.id });

        await tx.insert(contacts).values({
          clientId: newClientRow.id,
          name: contactName,
          role: "Contato Principal",
          email: d.newClient.email,
          phone: d.newClient.phone,
          isPrimary: true,
        });

        resolvedClientId = newClientRow.id;
      }

      if (!resolvedClientId) {
        throw new Error("Cliente obrigatório");
      }

      const [entry] = await tx
        .insert(financialEntries)
        .values({
          clientId: resolvedClientId,
          projectId: d.projectId ?? null,
          description: d.description,
          entryType: d.entryType,
          amount,
          dueDate: d.dueDate,
          paidAt,
          status: d.status,
          paymentMethod: d.paymentMethod,
          notes: d.notes,
        })
        .returning();

      return entry;
    });

    await logActivity({
      userId: authUser.id,
      entityType: created.projectId ? "project" : "financial",
      entityId: created.projectId ?? created.id,
      action: "financial_entry_created",
      description: `Lançamento financeiro "${created.description}" (R$ ${created.amount}) registrado.`,
    });

    return NextResponse.json({ entry: created }, { status: 201 });
  } catch (err) {
    console.error("Erro ao criar lançamento financeiro:", err);
    return NextResponse.json(
      { error: "Erro ao criar lançamento financeiro" },
      { status: 500 }
    );
  }
}

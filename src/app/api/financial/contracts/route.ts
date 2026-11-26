import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  clients,
  contacts,
  financialEntries,
  projectParticipants,
  projects,
  recurringPayments,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { projectContractSchema } from "@/lib/validators";
import { parseNumericInput } from "@/lib/format";
import { getTodayYmd, syncRecurringFinancialEntries } from "@/lib/finance";
import { logActivity } from "@/lib/activity";
import { parseJsonBody } from "@/lib/api-utils";

function addMonthsDate(startYmd: string, monthOffset: number, dueDay: number): string {
  const [y, m] = startYmd.split("-").map(Number);
  const totalMonths = y * 12 + (m - 1) + monthOffset;
  const ny = Math.floor(totalMonths / 12);
  const nm = totalMonths % 12;
  const maxDay = new Date(ny, nm + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, dueDay), maxDay);
  return `${ny}-${String(nm + 1).padStart(2, "0")}-${String(safeDay).padStart(2, "0")}`;
}

export async function POST(request: Request) {
  const authUser = await requireApiUser("financial:write");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const parsedBody = await parseJsonBody(request);
  if (!parsedBody.ok) return parsedBody.response;

  try {
    const parsed = projectContractSchema.safeParse(parsedBody.data);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? "Dados inválidos" },
        { status: 400 }
      );
    }

    const d = parsed.data;
    const totalSoldValue = parseNumericInput(d.totalSoldValue);
    const setupValue = parseNumericInput(d.setupValue);
    const monthlyFee = parseNumericInput(d.monthlyFee);
    const billingStartDate = d.billingStartDate || getTodayYmd();

    let project: { id: string; name: string; clientId: string } | null = null;

    if (d.projectId && !d.newProject) {
      const [found] = await db
        .select({ id: projects.id, name: projects.name, clientId: projects.clientId })
        .from(projects)
        .where(eq(projects.id, d.projectId))
        .limit(1);

      if (!found) {
        return NextResponse.json(
          { error: "Projeto não encontrado" },
          { status: 404 }
        );
      }
      project = found;
    } else if (d.newProject) {
      project = await db.transaction(async (tx) => {
        let resolvedClientId = d.newProject!.clientId ?? null;
        if (!resolvedClientId && d.newProject!.clientCompany) {
          const [newClientRow] = await tx
            .insert(clients)
            .values({
              company: d.newProject!.clientCompany,
              name: d.newProject!.clientCompany,
              ownerId: authUser.id,
              status: "ativo",
            })
            .returning({ id: clients.id });

          await tx.insert(contacts).values({
            clientId: newClientRow.id,
            name: d.newProject!.clientCompany,
            role: "Contato Principal",
            isPrimary: true,
          });
          resolvedClientId = newClientRow.id;
        }

        if (!resolvedClientId) {
          throw new Error("Cliente obrigatório para criar o projeto");
        }

        const [newProj] = await tx
          .insert(projects)
          .values({
            name: d.newProject!.name,
            clientId: resolvedClientId,
            ownerId: authUser.id,
            status: "producao",
            startDate: billingStartDate,
            soldValue: totalSoldValue,
            monthlyFee,
          })
          .returning({ id: projects.id, name: projects.name, clientId: projects.clientId });

        await tx
          .insert(projectParticipants)
          .values({ projectId: newProj.id, userId: authUser.id })
          .onConflictDoNothing();

        return newProj;
      });
    }

    if (!project) {
      return NextResponse.json(
        { error: "Selecione um projeto ou informe os dados para criar um novo" },
        { status: 400 }
      );
    }

    const [existing] = await db
      .select({ id: recurringPayments.id })
      .from(recurringPayments)
      .where(eq(recurringPayments.projectId, project.id))
      .limit(1);

    let contract;
    if (existing) {
      const [updated] = await db
        .update(recurringPayments)
        .set({
          clientId: project.clientId,
          totalSoldValue,
          setupValue,
          monthlyFee,
          billingStartDate,
          dueDay: d.dueDay,
          paymentMethod: d.paymentMethod,
          installmentsCount: d.installmentsCount,
          active: d.active,
          notes: d.notes,
          updatedAt: new Date(),
        })
        .where(eq(recurringPayments.id, existing.id))
        .returning();
      contract = updated;
    } else {
      const [inserted] = await db
        .insert(recurringPayments)
        .values({
          projectId: project.id,
          clientId: project.clientId,
          totalSoldValue,
          setupValue,
          monthlyFee,
          billingStartDate,
          dueDay: d.dueDay,
          paymentMethod: d.paymentMethod,
          installmentsCount: d.installmentsCount,
          active: d.active,
          notes: d.notes,
        })
        .returning();
      contract = inserted;
    }

    // Mantem valor vendido e mensalidade sincronizados no Projeto
    await db
      .update(projects)
      .set({
        ...(totalSoldValue !== null ? { soldValue: totalSoldValue } : {}),
        ...(monthlyFee !== null ? { monthlyFee } : {}),
        updatedAt: new Date(),
      })
      .where(eq(projects.id, project.id));

    // Opcionalmente gera parcelas pontuais (evita duplicação se já existirem lançamentos pontuais para o projeto)
    if (d.generateInstallments) {
      const existingPontual = await db
        .select({ id: financialEntries.id })
        .from(financialEntries)
        .where(
          and(
            eq(financialEntries.projectId, project.id),
            eq(financialEntries.entryType, "pontual")
          )
        )
        .limit(1);

      const baseValue = Number(setupValue ?? totalSoldValue ?? 0);
      const count = Math.max(1, d.installmentsCount || 1);
      if (existingPontual.length === 0 && baseValue > 0) {
        const installmentValue = (baseValue / count).toFixed(2);
        const today = getTodayYmd();
        const entries = Array.from({ length: count }, (_, idx) => {
          const dueDate = addMonthsDate(billingStartDate, idx, d.dueDay);
          return {
            clientId: project.clientId,
            projectId: project.id,
            description:
              count === 1
                ? `Implantação / Projeto — ${project.name}`
                : `Parcela ${idx + 1}/${count} — ${project.name}`,
            entryType: "pontual" as const,
            amount: installmentValue,
            dueDate,
            status: (dueDate < today
              ? "atrasado"
              : idx === 0
                ? "pendente"
                : "previsto") as "atrasado" | "pendente" | "previsto",
            paymentMethod: d.paymentMethod,
          };
        });
        await db.insert(financialEntries).values(entries);
      }
    }

    // Gera mensalidades recorrentes automaticamente
    await syncRecurringFinancialEntries();

    await logActivity({
      userId: authUser.id,
      entityType: "project",
      entityId: project.id,
      action: "contract_saved",
      description: `Contrato financeiro do projeto "${project.name}" salvo (Mensalidade: R$ ${monthlyFee ?? "0.00"}).`,
    });

    return NextResponse.json({ contract }, { status: existing ? 200 : 201 });
  } catch (err) {
    console.error("Erro ao salvar contrato:", err);
    return NextResponse.json(
      { error: "Erro ao salvar contrato financeiro" },
      { status: 500 }
    );
  }
}

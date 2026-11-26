import { and, eq, inArray, lt, ne } from "drizzle-orm";
import { db } from "@/db";
import { financialEntries, projects, recurringPayments } from "@/db/schema";

function formatDateYmd(year: number, monthIndex: number, day: number): string {
  const maxDay = new Date(year, monthIndex + 1, 0).getDate();
  const safeDay = Math.min(Math.max(1, day), maxDay);
  const mm = String(monthIndex + 1).padStart(2, "0");
  const dd = String(safeDay).padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

export function getTodayYmd(): string {
  const now = new Date();
  return formatDateYmd(now.getFullYear(), now.getMonth(), now.getDate());
}

export function getCurrentWeekStartYmd(): string {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return formatDateYmd(monday.getFullYear(), monday.getMonth(), monday.getDate());
}

/**
 * Gera automaticamente os lançamentos de mensalidades recorrentes
 * (mês atual + próximos 3 meses) de forma idempotente e marca
 * lançamentos vencidos não pagos como atrasados.
 */
export async function syncRecurringFinancialEntries(): Promise<void> {
  const todayYmd = getTodayYmd();
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-11

  const activeContracts = await db
    .select({
      id: recurringPayments.id,
      projectId: recurringPayments.projectId,
      clientId: recurringPayments.clientId,
      monthlyFee: recurringPayments.monthlyFee,
      billingStartDate: recurringPayments.billingStartDate,
      dueDay: recurringPayments.dueDay,
      paymentMethod: recurringPayments.paymentMethod,
      projectName: projects.name,
      projectStatus: projects.status,
    })
    .from(recurringPayments)
    .innerJoin(projects, eq(recurringPayments.projectId, projects.id))
    .where(
      and(
        eq(recurringPayments.active, true),
        ne(projects.status, "encerrado")
      )
    );

  const monthsHorizon = 3; // mês atual + 3 meses futuros

  for (const contract of activeContracts) {
    const fee = Number(contract.monthlyFee ?? 0);
    if (!Number.isFinite(fee) || fee <= 0) continue;

    let startYear = currentYear;
    let startMonth = currentMonth;

    if (contract.billingStartDate) {
      const [sy, sm] = contract.billingStartDate.split("-").map(Number);
      if (sy && sm) {
        startYear = sy;
        startMonth = sm - 1;
      }
    }

    const startMonthSerial = startYear * 12 + startMonth;
    const currentMonthSerial = currentYear * 12 + currentMonth;
    const endMonthSerial = Math.max(
      currentMonthSerial + monthsHorizon,
      startMonthSerial + monthsHorizon
    );

    // Garante geração a partir do menor entre inicio (limitado a 6 meses atrás) e mês atual
    const firstSerial = Math.max(startMonthSerial, currentMonthSerial - 6);

    const rowsToInsert: (typeof financialEntries.$inferInsert)[] = [];

    for (let serial = firstSerial; serial <= endMonthSerial; serial++) {
      const y = Math.floor(serial / 12);
      const m = serial % 12;
      const refMonth = `${y}-${String(m + 1).padStart(2, "0")}`;
      const dueDate = formatDateYmd(y, m, contract.dueDay || 10);

      let status: "previsto" | "pendente" | "atrasado" = "previsto";
      if (dueDate < todayYmd) {
        status = "atrasado";
      } else if (serial === currentMonthSerial) {
        status = "pendente";
      }

      rowsToInsert.push({
        clientId: contract.clientId,
        projectId: contract.projectId,
        recurringPaymentId: contract.id,
        description: `Mensalidade ${refMonth} — ${contract.projectName}`,
        entryType: "recorrente",
        referenceMonth: refMonth,
        amount: fee.toFixed(2),
        dueDate,
        status,
        paymentMethod: contract.paymentMethod,
      });
    }

    if (rowsToInsert.length > 0) {
      await db
        .insert(financialEntries)
        .values(rowsToInsert)
        .onConflictDoNothing({
          target: [
            financialEntries.recurringPaymentId,
            financialEntries.referenceMonth,
          ],
        });
    }
  }

  // Atualiza vencidos automaticamente
  await db
    .update(financialEntries)
    .set({ status: "atrasado", updatedAt: new Date() })
    .where(
      and(
        inArray(financialEntries.status, ["previsto", "pendente"]),
        lt(financialEntries.dueDate, todayYmd)
      )
    );
}

import { NextResponse } from "next/server";
import { asc, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import {
  activities,
  clients,
  financialEntries,
  leads,
  projects,
  proposals,
  recurringPayments,
  tasks,
  users,
  weeklyGoals,
} from "@/db/schema";
import { requireApiUser } from "@/lib/auth";
import { LEAD_STAGES, LEAD_STAGE_ORDER } from "@/lib/constants";
import { isProjectOverdue, isTaskOverdue } from "@/lib/format";
import {
  getCurrentWeekStartYmd,
  getTodayYmd,
  syncRecurringFinancialEntries,
} from "@/lib/finance";

function getPeriodStart(period: string): Date | null {
  const now = new Date();
  if (period === "7d") return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (period === "30d") return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  if (period === "90d") return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
  if (period === "month") return new Date(now.getFullYear(), now.getMonth(), 1);
  return null;
}

export async function GET(request: Request) {
  const authUser = await requireApiUser("dashboard:read");
  if (!authUser) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  await syncRecurringFinancialEntries();

  const { searchParams } = new URL(request.url);
  const period = searchParams.get("period") ?? "30d";
  const periodStart = getPeriodStart(period);
  const currentWeekStart = getCurrentWeekStartYmd();

  const [
    allLeads,
    periodLeads,
    periodProposals,
    allClients,
    allProjects,
    allTasks,
    allFinancialEntries,
    allContracts,
    currentWeekGoals,
    recentActivities,
  ] = await Promise.all([
    db
      .select({
        id: leads.id,
        company: leads.company,
        contactName: leads.contactName,
        stage: leads.stage,
        potentialValue: leads.potentialValue,
        nextAction: leads.nextAction,
        nextFollowUpAt: leads.nextFollowUpAt,
        ownerName: users.name,
        createdAt: leads.createdAt,
      })
      .from(leads)
      .leftJoin(users, eq(leads.ownerId, users.id)),
    periodStart
      ? db
          .select({
            id: leads.id,
            stage: leads.stage,
            potentialValue: leads.potentialValue,
          })
          .from(leads)
          .where(gte(leads.createdAt, periodStart))
      : db
          .select({
            id: leads.id,
            stage: leads.stage,
            potentialValue: leads.potentialValue,
          })
          .from(leads),
    periodStart
      ? db
          .select({
            id: proposals.id,
            status: proposals.status,
            totalValue: proposals.totalValue,
          })
          .from(proposals)
          .where(gte(proposals.createdAt, periodStart))
      : db
          .select({
            id: proposals.id,
            status: proposals.status,
            totalValue: proposals.totalValue,
          })
          .from(proposals),
    db
      .select({
        id: clients.id,
        company: clients.company,
        status: clients.status,
      })
      .from(clients),
    db
      .select({
        id: projects.id,
        name: projects.name,
        status: projects.status,
        dueDate: projects.dueDate,
        nextDelivery: projects.nextDelivery,
        soldValue: projects.soldValue,
        monthlyFee: projects.monthlyFee,
        clientId: projects.clientId,
        clientCompany: clients.company,
        ownerName: users.name,
      })
      .from(projects)
      .innerJoin(clients, eq(projects.clientId, clients.id))
      .leftJoin(users, eq(projects.ownerId, users.id)),
    db
      .select({
        id: tasks.id,
        title: tasks.title,
        status: tasks.status,
        priority: tasks.priority,
        dueDate: tasks.dueDate,
        projectId: tasks.projectId,
        projectName: projects.name,
        assigneeName: users.name,
      })
      .from(tasks)
      .leftJoin(projects, eq(tasks.projectId, projects.id))
      .leftJoin(users, eq(tasks.assigneeId, users.id))
      .orderBy(asc(tasks.dueDate)),
    db
      .select({
        id: financialEntries.id,
        projectId: financialEntries.projectId,
        projectName: projects.name,
        entryType: financialEntries.entryType,
        amount: financialEntries.amount,
        dueDate: financialEntries.dueDate,
        paidAt: financialEntries.paidAt,
        status: financialEntries.status,
      })
      .from(financialEntries)
      .leftJoin(projects, eq(financialEntries.projectId, projects.id)),
    db
      .select({
        projectId: recurringPayments.projectId,
        monthlyFee: recurringPayments.monthlyFee,
        active: recurringPayments.active,
        projectStatus: projects.status,
      })
      .from(recurringPayments)
      .innerJoin(projects, eq(recurringPayments.projectId, projects.id)),
    db
      .select({
        id: weeklyGoals.id,
        title: weeklyGoals.title,
        completed: weeklyGoals.completed,
        ownerName: users.name,
        projectId: weeklyGoals.projectId,
        projectName: projects.name,
      })
      .from(weeklyGoals)
      .leftJoin(users, eq(weeklyGoals.ownerId, users.id))
      .leftJoin(projects, eq(weeklyGoals.projectId, projects.id))
      .where(eq(weeklyGoals.weekStart, currentWeekStart))
      .orderBy(asc(weeklyGoals.completed), desc(weeklyGoals.createdAt)),
    db
      .select({
        id: activities.id,
        entityType: activities.entityType,
        entityId: activities.entityId,
        action: activities.action,
        description: activities.description,
        createdAt: activities.createdAt,
        userName: users.name,
      })
      .from(activities)
      .leftJoin(users, eq(activities.userId, users.id))
      .orderBy(desc(activities.createdAt))
      .limit(12),
  ]);

  // Comercial
  const newLeadsCount = periodLeads.length;
  const contactedCount = periodLeads.filter(
    (l) => LEAD_STAGE_ORDER[l.stage] >= LEAD_STAGE_ORDER.contatado
  ).length;
  const repliedCount = periodLeads.filter(
    (l) => LEAD_STAGE_ORDER[l.stage] >= LEAD_STAGE_ORDER.respondeu
  ).length;
  const meetingsCount = periodLeads.filter(
    (l) => LEAD_STAGE_ORDER[l.stage] >= LEAD_STAGE_ORDER.reuniao
  ).length;
  const sentProposalsCount = periodProposals.filter(
    (p) => p.status !== "rascunho"
  ).length;
  const proposalsCount = Math.max(
    sentProposalsCount,
    periodLeads.filter(
      (l) => LEAD_STAGE_ORDER[l.stage] >= LEAD_STAGE_ORDER.proposta
    ).length
  );
  const closedWonCount = periodLeads.filter((l) => l.stage === "fechado").length;
  const conversionRate =
    newLeadsCount > 0
      ? Number(((closedWonCount / newLeadsCount) * 100).toFixed(1))
      : 0;
  const openPipelineValue = allLeads
    .filter((l) => l.stage !== "fechado" && l.stage !== "perdido")
    .reduce((acc, l) => acc + Number(l.potentialValue ?? 0), 0);

  const funnelBreakdown = LEAD_STAGES.map((stage) => {
    const stageLeads = allLeads.filter((l) => l.stage === stage.value);
    return {
      stage: stage.value,
      label: stage.label,
      count: stageLeads.length,
      value: stageLeads.reduce(
        (acc, l) => acc + Number(l.potentialValue ?? 0),
        0
      ),
    };
  });

  const upcomingFollowUps = allLeads
    .filter(
      (l) => l.nextFollowUpAt && l.stage !== "fechado" && l.stage !== "perdido"
    )
    .sort(
      (a, b) =>
        new Date(a.nextFollowUpAt!).getTime() -
        new Date(b.nextFollowUpAt!).getTime()
    )
    .slice(0, 6);

  // Clientes & Projetos
  const activeClientsCount = allClients.filter(
    (c) => c.status === "ativo" || c.status === "onboarding"
  ).length;
  const activeProjects = allProjects.filter((p) => p.status !== "encerrado");
  const overdueProjects = allProjects.filter((p) =>
    isProjectOverdue(p.dueDate, p.status)
  );
  const upcomingDeliveries = activeProjects
    .filter((p) => p.dueDate || p.nextDelivery)
    .sort((a, b) => {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 6);

  const totalSoldRevenue = allProjects.reduce(
    (acc, p) => acc + Number(p.soldValue ?? 0),
    0
  );

  // Financeiro real
  const currentMonthPrefix = getTodayYmd().slice(0, 7);
  let receivedThisMonth = 0;
  let forecastThisMonth = 0;
  let pendingAmount = 0;
  let overdueAmount = 0;
  let oneTimeReceived = 0;
  let recurringReceived = 0;

  for (const e of allFinancialEntries) {
    if (e.status === "cancelado") continue;
    const amt = Number(e.amount ?? 0);
    if (e.status === "pago") {
      if (e.entryType === "pontual") oneTimeReceived += amt;
      else recurringReceived += amt;
      const ref = e.paidAt || e.dueDate;
      if (ref?.startsWith(currentMonthPrefix)) receivedThisMonth += amt;
    } else {
      if (e.status === "atrasado") overdueAmount += amt;
      else pendingAmount += amt;
      if (e.dueDate?.startsWith(currentMonthPrefix)) forecastThisMonth += amt;
    }
  }

  const contractMrr = allContracts
    .filter((c) => c.active && c.projectStatus !== "encerrado")
    .reduce((acc, c) => acc + Number(c.monthlyFee ?? 0), 0);
  const projectMrrFallback = activeProjects.reduce(
    (acc, p) => acc + Number(p.monthlyFee ?? 0),
    0
  );
  const activeMrr = contractMrr > 0 ? contractMrr : projectMrrFallback;

  // Tarefas & Metas Semanais
  const pendingTasks = allTasks.filter((t) => t.status !== "concluido");
  const overdueTasks = pendingTasks.filter((t) =>
    isTaskOverdue(t.dueDate, t.status)
  );
  const completedTasksCount = allTasks.length - pendingTasks.length;

  const completedGoalsCount = currentWeekGoals.filter((g) => g.completed).length;
  const weeklyGoalsCompletionPct =
    currentWeekGoals.length > 0
      ? Math.round((completedGoalsCount / currentWeekGoals.length) * 100)
      : 0;

  return NextResponse.json({
    period,
    commercial: {
      newLeadsCount,
      contactedCount,
      repliedCount,
      meetingsCount,
      proposalsCount,
      sentProposalsCount,
      closedWonCount,
      conversionRate,
      openPipelineValue,
      totalLeadsAllTime: allLeads.length,
      funnelBreakdown,
      upcomingFollowUps,
    },
    projects: {
      totalClients: allClients.length,
      activeClientsCount,
      totalProjects: allProjects.length,
      activeProjectsCount: activeProjects.length,
      overdueProjectsCount: overdueProjects.length,
      totalSoldRevenue,
      activeMrr,
      upcomingDeliveries,
    },
    financial: {
      receivedThisMonth,
      forecastThisMonth: forecastThisMonth + receivedThisMonth,
      pendingAmount,
      overdueAmount,
      mrr: activeMrr,
      oneTimeReceived,
      recurringReceived,
    },
    tasks: {
      totalTasksCount: allTasks.length,
      pendingTasksCount: pendingTasks.length,
      overdueTasksCount: overdueTasks.length,
      completedTasksCount,
      upcomingTasks: pendingTasks.slice(0, 6),
    },
    weeklyGoals: {
      weekStart: currentWeekStart,
      total: currentWeekGoals.length,
      completed: completedGoalsCount,
      completionPct: weeklyGoalsCompletionPct,
      items: currentWeekGoals,
    },
    recentActivities,
  });
}

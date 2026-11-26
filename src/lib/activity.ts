import { db } from "@/db";
import { activities } from "@/db/schema";

export async function logActivity(params: {
  userId?: string | null;
  entityType:
    | "lead"
    | "client"
    | "project"
    | "proposal"
    | "task"
    | "financial"
    | "meeting"
    | "secret"
    | "user"
    | "system";
  entityId: string;
  action: string;
  description: string;
}) {
  try {
    await db.insert(activities).values({
      userId: params.userId ?? null,
      entityType: params.entityType,
      entityId: params.entityId,
      action: params.action,
      description: params.description,
    });
  } catch (err) {
    console.error("Falha ao registrar atividade:", err);
  }
}

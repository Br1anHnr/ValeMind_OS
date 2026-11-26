import type { UserRole } from "@/db/schema";

/**
 * Estrutura enxuta de permissões preparada para evolução futura.
 * Conforme seção 13 do PRD, no MVP todos os usuários internos autenticados
 * possuem acesso operacional completo, sem telas extras de RBAC.
 */
export type Permission =
  | "dashboard:read"
  | "leads:read"
  | "leads:write"
  | "proposals:read"
  | "proposals:write"
  | "clients:read"
  | "clients:write"
  | "projects:read"
  | "projects:write"
  | "tasks:read"
  | "tasks:write"
  | "financial:read"
  | "financial:write"
  | "meetings:read"
  | "meetings:write"
  | "vault:read"
  | "vault:write"
  | "settings:read"
  | "settings:write";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  active: boolean;
}

const ALL_PERMISSIONS: Permission[] = [
  "dashboard:read",
  "leads:read",
  "leads:write",
  "proposals:read",
  "proposals:write",
  "clients:read",
  "clients:write",
  "projects:read",
  "projects:write",
  "tasks:read",
  "tasks:write",
  "financial:read",
  "financial:write",
  "meetings:read",
  "meetings:write",
  "vault:read",
  "vault:write",
  "settings:read",
  "settings:write",
];

const ROLE_PERMISSIONS: Record<UserRole, ReadonlySet<Permission>> = {
  founder: new Set<Permission>(ALL_PERMISSIONS),
  member: new Set<Permission>(
    ALL_PERMISSIONS.filter((p) => p !== "settings:write")
  ),
};

export function hasPermission(
  user: AuthUser | null | undefined,
  permission: Permission
): boolean {
  if (!user || !user.active) return false;
  return ROLE_PERMISSIONS[user.role]?.has(permission) ?? false;
}

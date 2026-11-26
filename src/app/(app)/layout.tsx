import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/AppShell";

export default async function ProtectedAppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await requireUser();
  return <AppShell user={user}>{children}</AppShell>;
}

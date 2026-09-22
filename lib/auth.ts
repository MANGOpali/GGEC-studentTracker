import { redirect } from "next/navigation";
import { getSession, SessionData } from "./session";

export async function getCurrentUser(): Promise<SessionData | null> {
  const session = await getSession();
  if (!session.userId) return null;
  return {
    userId: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    branchId: session.branchId,
  };
}

export async function requireAuth(): Promise<SessionData> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireRole(
  ...roles: Array<"ADMIN" | "COUNSELLOR" | "RECEPTIONIST">
): Promise<SessionData> {
  const user = await requireAuth();
  if (!roles.includes(user.role)) redirect("/unauthorized");
  return user;
}

export async function requireAdmin(): Promise<SessionData> {
  return requireRole("ADMIN");
}

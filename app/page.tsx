import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export default async function RootPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role === "ADMIN") redirect("/admin/dashboard");
  if (user.role === "COUNSELLOR") redirect("/counsellor/dashboard");
  if (user.role === "RECEPTIONIST") redirect("/reception/dashboard");
  redirect("/login");
}

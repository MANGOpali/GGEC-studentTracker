import { requireRole } from "@/lib/auth";
import ReceptionLayout from "@/components/layout/ReceptionLayout";

export default async function ReceptionRootLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("RECEPTIONIST", "ADMIN");
  return <ReceptionLayout user={user}>{children}</ReceptionLayout>;
}

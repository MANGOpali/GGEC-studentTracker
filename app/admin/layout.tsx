import { requireAdmin } from "@/lib/auth";
import AdminLayout from "@/components/layout/AdminLayout";

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdmin();
  return <AdminLayout user={user}>{children}</AdminLayout>;
}

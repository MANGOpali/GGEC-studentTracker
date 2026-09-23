import { requireAuth } from "@/lib/auth";
import AdminLayout from "@/components/layout/AdminLayout";
import CounsellorLayout from "@/components/layout/CounsellorLayout";
import ReceptionLayout from "@/components/layout/ReceptionLayout";
import TeacherLayout from "@/components/layout/TeacherLayout";

export default async function LeadsLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAuth();
  if (user.role === "ADMIN") return <AdminLayout user={user}>{children}</AdminLayout>;
  if (user.role === "COUNSELLOR") return <CounsellorLayout user={user}>{children}</CounsellorLayout>;
  if (user.role === "TEACHER") return <TeacherLayout user={user}>{children}</TeacherLayout>;
  return <ReceptionLayout user={user}>{children}</ReceptionLayout>;
}

import { requireTeacher } from "@/lib/auth";
import TeacherLayout from "@/components/layout/TeacherLayout";

export default async function TeacherRootLayout({ children }: { children: React.ReactNode }) {
  const user = await requireTeacher();
  return <TeacherLayout user={user}>{children}</TeacherLayout>;
}

import { requireTeacher } from "@/lib/auth";
import TeacherDashboardClient from "./DashboardClient";

export default async function TeacherDashboardPage() {
  const user = await requireTeacher();
  return <TeacherDashboardClient userName={user.name} />;
}

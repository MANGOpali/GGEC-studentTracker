import { requireRole } from "@/lib/auth";
import AdminLayout from "@/components/layout/AdminLayout";
import AttendanceClient from "@/components/attendance/AttendanceClient";

export default async function AttendancePage() {
  const session = await requireRole("ADMIN");
  return (
    <AdminLayout user={{ name: session.name ?? "", email: session.email ?? "", role: "ADMIN" }}>
      <AttendanceClient />
    </AdminLayout>
  );
}

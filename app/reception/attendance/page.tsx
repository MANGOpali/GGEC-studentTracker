import { requireRole } from "@/lib/auth";
import ReceptionLayout from "@/components/layout/ReceptionLayout";
import AttendanceClient from "@/components/attendance/AttendanceClient";

export default async function AttendancePage() {
  const session = await requireRole("RECEPTIONIST");
  return (
    <ReceptionLayout user={{ name: session.name ?? "", email: session.email ?? "" }}>
      <AttendanceClient />
    </ReceptionLayout>
  );
}

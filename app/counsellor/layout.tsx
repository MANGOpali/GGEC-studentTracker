import { requireRole } from "@/lib/auth";
import CounsellorLayout from "@/components/layout/CounsellorLayout";

export default async function CounsellorRootLayout({ children }: { children: React.ReactNode }) {
  const user = await requireRole("COUNSELLOR", "ADMIN");
  return <CounsellorLayout user={user}>{children}</CounsellorLayout>;
}

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/db";
import ResourcesClient from "@/components/resources/ResourcesClient";

export default async function AdminResourcesPage() {
  await requireAdmin();

  const counsellors = await prisma.user.findMany({
    where: { role: "COUNSELLOR", isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <ResourcesClient isAdmin counsellors={counsellors} />;
}

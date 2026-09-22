import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

const CONTACTED_STATUSES = ["CONTACTED", "FOLLOW_UP"];
const COUNSELLING_STATUSES = ["COUNSELLING_BOOKED", "COUNSELLING_COMPLETED"];
const APPLICATION_STATUSES = ["APPLICATION_STARTED", "APPLICATION_SUBMITTED", "OFFER_RECEIVED"];

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Single groupBy query instead of N×5 count queries
  const [groups, sources] = await Promise.all([
    prisma.lead.groupBy({
      by: ["sourceId", "status"],
      _count: { id: true },
      where: { isArchived: false },
    }),
    prisma.leadSource.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
  ]);

  const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

  // Aggregate by source
  const bySource = new Map<string, { total: number; contacted: number; counselling: number; applications: number; enrolled: number }>();
  for (const g of groups) {
    if (!bySource.has(g.sourceId)) {
      bySource.set(g.sourceId, { total: 0, contacted: 0, counselling: 0, applications: 0, enrolled: 0 });
    }
    const entry = bySource.get(g.sourceId)!;
    entry.total += g._count.id;
    if (CONTACTED_STATUSES.includes(g.status)) entry.contacted += g._count.id;
    if (COUNSELLING_STATUSES.includes(g.status)) entry.counselling += g._count.id;
    if (APPLICATION_STATUSES.includes(g.status)) entry.applications += g._count.id;
    if (g.status === "ENROLLED") entry.enrolled += g._count.id;
  }

  const stats = Array.from(bySource.entries())
    .map(([sourceId, counts]) => ({ sourceId, sourceName: sourceMap.get(sourceId) ?? "Unknown", ...counts }))
    .filter((s) => s.total > 0)
    .sort((a, b) => b.total - a.total);

  return NextResponse.json({ stats });
}

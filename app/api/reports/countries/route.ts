import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [groups, countries] = await Promise.all([
    prisma.lead.groupBy({
      by: ["countryId"],
      _count: { id: true },
      where: { isArchived: false },
      orderBy: { _count: { id: "desc" } },
    }),
    prisma.country.findMany({ select: { id: true, name: true } }),
  ]);
  const countryMap = new Map(countries.map((c) => [c.id, c.name]));

  const stats = groups.map((g) => ({
    countryId: g.countryId,
    countryName: countryMap.get(g.countryId) || "Unknown",
    total: g._count.id,
  }));

  return NextResponse.json({ stats });
}

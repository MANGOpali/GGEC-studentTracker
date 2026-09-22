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
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [sources, countries, intakes, branches, counsellors] = await Promise.all([
    prisma.leadSource.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.country.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.intake.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
    prisma.branch.findMany({ where: { isActive: true } }),
    prisma.user.findMany({
      where: { role: "COUNSELLOR", isActive: true },
      select: { id: true, name: true, branchId: true, branch: { select: { name: true } } },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ sources, countries, intakes, branches, counsellors });
}

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

  const { searchParams } = new URL(request.url);
  const branchId = searchParams.get("branchId") || undefined;
  const includeInactive = searchParams.get("all") === "1";

  const shifts = await prisma.shift.findMany({
    where: {
      ...(branchId ? { branchId } : {}),
      ...(!includeInactive ? { isActive: true } : {}),
    },
    include: { branch: { select: { id: true, name: true } }, _count: { select: { leads: true } } },
    orderBy: [{ startTime: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ shifts });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, startTime, endTime, days, branchId } = body;
  if (!name || !startTime || !endTime || !days?.length) {
    return NextResponse.json({ error: "name, startTime, endTime and days are required" }, { status: 400 });
  }

  const shift = await prisma.shift.create({
    data: { name, startTime, endTime, days, branchId: branchId || null },
    include: { branch: { select: { id: true, name: true } }, _count: { select: { leads: true } } },
  });

  return NextResponse.json({ shift }, { status: 201 });
}

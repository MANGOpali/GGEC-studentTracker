import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json();
  const { name, startTime, endTime, days, branchId, isActive } = body;

  const shift = await prisma.shift.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(startTime !== undefined ? { startTime } : {}),
      ...(endTime !== undefined ? { endTime } : {}),
      ...(days !== undefined ? { days } : {}),
      ...(branchId !== undefined ? { branchId: branchId || null } : {}),
      ...(isActive !== undefined ? { isActive } : {}),
    },
    include: { branch: { select: { id: true, name: true } }, _count: { select: { leads: true } } },
  });

  return NextResponse.json({ shift });
}

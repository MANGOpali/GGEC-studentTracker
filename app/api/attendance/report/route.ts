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
  const shiftId = searchParams.get("shiftId");
  const month = searchParams.get("month"); // YYYY-MM

  if (!shiftId || !month) return NextResponse.json({ error: "shiftId and month required" }, { status: 400 });

  const [year, monthNum] = month.split("-").map(Number);
  const firstDay = new Date(year, monthNum - 1, 1);
  const lastDay = new Date(year, monthNum, 0, 23, 59, 59, 999);

  const [students, records] = await Promise.all([
    prisma.lead.findMany({
      where: {
        shiftId,
        isArchived: false,
        teacherId: { not: null },
        leadType: { in: ["IELTS_CLASS", "PTE_CLASS"] },
      },
      select: { id: true, leadId: true, studentName: true, studentStatus: true, classType: true },
      orderBy: { studentName: "asc" },
    }),
    prisma.attendance.findMany({
      where: { shiftId, date: { gte: firstDay, lte: lastDay } },
      select: { leadId: true, date: true, status: true },
      orderBy: { date: "asc" },
    }),
  ]);

  // Collect unique days that have any record
  const daySet = new Set<string>();
  for (const r of records) {
    daySet.add(r.date.toISOString().slice(0, 10));
  }
  const days = Array.from(daySet).sort();

  const serializedRecords = records.map((r) => ({
    leadId: r.leadId,
    date: r.date.toISOString().slice(0, 10),
    status: r.status,
  }));

  return NextResponse.json({ students, records: serializedRecords, month, days });
}

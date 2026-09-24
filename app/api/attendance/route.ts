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
  const date = searchParams.get("date");

  if (!shiftId || !date) return NextResponse.json({ error: "shiftId and date required" }, { status: 400 });

  const dateObj = new Date(date);

  const [attendance, students] = await Promise.all([
    prisma.attendance.findMany({
      where: { shiftId, date: dateObj },
      select: { leadId: true, status: true, notes: true, id: true },
    }),
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
  ]);

  const attendanceMap = Object.fromEntries(attendance.map((a) => [a.leadId, a]));

  return NextResponse.json({ students, attendanceMap, date, shiftId });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "TEACHER" && session.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { records } = await request.json();
  if (!Array.isArray(records) || records.length === 0) {
    return NextResponse.json({ error: "records array required" }, { status: 400 });
  }

  const ops = records.map((r: { leadId: string; shiftId: string; date: string; status: string; notes?: string }) =>
    prisma.attendance.upsert({
      where: {
        leadId_shiftId_date: {
          leadId: r.leadId,
          shiftId: r.shiftId,
          date: new Date(r.date),
        },
      },
      update: { status: r.status as never, notes: r.notes ?? null, markedById: session.userId },
      create: {
        leadId: r.leadId,
        shiftId: r.shiftId,
        date: new Date(r.date),
        status: r.status as never,
        notes: r.notes ?? null,
        markedById: session.userId,
      },
    })
  );

  await prisma.$transaction(ops);
  return NextResponse.json({ ok: true, count: records.length });
}

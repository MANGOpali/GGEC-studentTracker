import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay, startOfMonth, endOfMonth } from "date-fns";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const roleFilter =
    session.role === "COUNSELLOR"
      ? { OR: [{ assignedCounsellorId: session.userId }, { createdById: session.userId }] }
      : session.role === "RECEPTIONIST"
      ? { createdById: session.userId }
      : session.role === "TEACHER"
      ? { OR: [{ teacherId: session.userId }, { createdById: session.userId }] }
      : {};

  const [
    totalLeads, todaysLeads, newLeads, followUpsDueToday, overdueFollowUps,
    counsellingCompleted, applications, visaProcess, visaGranted, enrolled,
    ieltsLeads, pteLeads, dateBookingLeads,
    ieltsInClass, pteInClass, bookingsConfirmed,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...roleFilter, isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, createdAt: { gte: todayStart, lte: todayEnd }, isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, status: "NEW", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, nextFollowUpAt: { gte: todayStart, lte: todayEnd }, isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, nextFollowUpAt: { lt: todayStart }, isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, status: "COUNSELLING_COMPLETED", createdAt: { gte: monthStart, lte: monthEnd }, isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, status: { in: ["APPLICATION_STARTED", "APPLICATION_SUBMITTED", "OFFER_RECEIVED"] }, isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, status: "VISA_PROCESS", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, status: "VISA_GRANTED", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, status: "ENROLLED", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, leadType: "IELTS_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, leadType: "PTE_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, leadType: "DATE_BOOKING", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, leadType: "IELTS_CLASS", status: "IN_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, leadType: "PTE_CLASS", status: "IN_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...roleFilter, leadType: "DATE_BOOKING", status: "CONFIRMED", isArchived: false } }),
  ]);

  return NextResponse.json({
    totalLeads, todaysLeads, newLeads, followUpsDueToday, overdueFollowUps,
    counsellingCompleted, applications, visaProcess, visaGranted, enrolled,
    ieltsLeads, pteLeads, dateBookingLeads,
    ieltsInClass, pteInClass, bookingsConfirmed,
  });
}

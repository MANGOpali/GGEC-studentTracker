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

  const counsellorFilter = session.role === "COUNSELLOR" ? { assignedCounsellorId: session.userId } : {};

  const [
    totalLeads, todaysLeads, newLeads, followUpsDueToday, overdueFollowUps,
    counsellingCompleted, applications, visaProcess, visaGranted, enrolled,
    ieltsLeads, pteLeads, dateBookingLeads,
    ieltsInClass, pteInClass, bookingsConfirmed,
  ] = await Promise.all([
    prisma.lead.count({ where: { ...counsellorFilter, isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, createdAt: { gte: todayStart, lte: todayEnd }, isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, status: "NEW", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, nextFollowUpAt: { gte: todayStart, lte: todayEnd }, isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, nextFollowUpAt: { lt: todayStart }, isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, status: "COUNSELLING_COMPLETED", createdAt: { gte: monthStart, lte: monthEnd }, isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, status: { in: ["APPLICATION_STARTED", "APPLICATION_SUBMITTED", "OFFER_RECEIVED"] }, isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, status: "VISA_PROCESS", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, status: "VISA_GRANTED", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, status: "ENROLLED", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, leadType: "IELTS_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, leadType: "PTE_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, leadType: "DATE_BOOKING", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, leadType: "IELTS_CLASS", status: "IN_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, leadType: "PTE_CLASS", status: "IN_CLASS", isArchived: false } }),
    prisma.lead.count({ where: { ...counsellorFilter, leadType: "DATE_BOOKING", status: "CONFIRMED", isArchived: false } }),
  ]);

  return NextResponse.json({
    totalLeads, todaysLeads, newLeads, followUpsDueToday, overdueFollowUps,
    counsellingCompleted, applications, visaProcess, visaGranted, enrolled,
    ieltsLeads, pteLeads, dateBookingLeads,
    ieltsInClass, pteInClass, bookingsConfirmed,
  });
}

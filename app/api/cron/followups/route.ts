import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request: NextRequest) {
  const secret = request.headers.get("authorization");
  if (secret !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);

  // Find all non-archived leads with follow-up due today or overdue
  const leads = await prisma.lead.findMany({
    where: {
      isArchived: false,
      nextFollowUpAt: { lte: todayEnd },
      status: { notIn: ["CLOSED", "NOT_INTERESTED", "NOT_ELIGIBLE", "ENROLLED", "VISA_GRANTED", "COMPLETED", "DROPPED", "NO_SHOW"] },
    },
    select: {
      id: true,
      leadId: true,
      studentName: true,
      nextFollowUpAt: true,
      assignedCounsellorId: true,
    },
  });

  if (leads.length === 0) return NextResponse.json({ notified: 0 });

  // Avoid duplicate notifications: skip leads already notified today
  const existingToday = await prisma.notification.findMany({
    where: {
      title: { in: ["Follow-up Due", "Follow-up Overdue"] },
      createdAt: { gte: todayStart, lte: todayEnd },
      leadId: { in: leads.map((l) => l.id) },
    },
    select: { leadId: true, userId: true },
  });
  const alreadyNotified = new Set(existingToday.map((n) => `${n.leadId}:${n.userId}`));

  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true },
    select: { id: true },
  });

  const rows: { userId: string; title: string; message: string; leadId: string }[] = [];

  for (const lead of leads) {
    const isOverdue = lead.nextFollowUpAt! < todayStart;
    const title = isOverdue ? "Follow-up Overdue" : "Follow-up Due";
    const message = `Follow-up due for ${lead.studentName} (${lead.leadId})${isOverdue ? " — overdue" : " today"}.`;

    // Notify assigned counsellor
    if (lead.assignedCounsellorId) {
      const key = `${lead.id}:${lead.assignedCounsellorId}`;
      if (!alreadyNotified.has(key)) {
        rows.push({ userId: lead.assignedCounsellorId, title, message, leadId: lead.id });
      }
    }

    // Notify all admins
    for (const admin of admins) {
      const key = `${lead.id}:${admin.id}`;
      if (!alreadyNotified.has(key)) {
        rows.push({ userId: admin.id, title, message, leadId: lead.id });
      }
    }
  }

  if (rows.length > 0) {
    await prisma.notification.createMany({ data: rows });
  }

  return NextResponse.json({ notified: rows.length, leads: leads.length });
}

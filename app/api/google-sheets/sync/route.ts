import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { appendLeadToSheet, ensureSheetHeaders } from "@/lib/google-sheets";
import { format } from "date-fns";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const failedLogs = await prisma.syncLog.findMany({
    where: { status: "FAILED" },
    include: {
      lead: {
        include: {
          country: true, source: true, intake: true, branch: true,
          assignedCounsellor: true, createdBy: true,
        },
      },
    },
    take: 50,
  });

  await ensureSheetHeaders();
  let synced = 0;
  let failed = 0;

  for (const log of failedLogs) {
    const { lead } = log;
    const result = await appendLeadToSheet({
      leadId: lead.leadId,
      studentName: lead.studentName,
      phone: lead.phone,
      email: lead.email || "",
      educationLevel: lead.educationLevel,
      country: lead.country?.name || "",
      course: lead.course || "",
      intake: lead.intake?.name || "",
      source: lead.source.name,
      status: lead.status,
      counsellor: lead.assignedCounsellor?.name || "",
      branch: lead.branch?.name || "",
      createdBy: lead.createdBy.name,
      createdAt: format(lead.createdAt, "dd MMM yyyy HH:mm"),
      nextFollowUp: lead.nextFollowUpAt ? format(lead.nextFollowUpAt, "dd MMM yyyy") : "",
      notes: lead.notes || "",
    });

    await prisma.syncLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? "SYNCED" : "FAILED",
        errorMsg: result.error || null,
        syncedAt: result.success ? new Date() : null,
      },
    });

    if (result.success) { synced++; } else { failed++; }
  }

  return NextResponse.json({ synced, failed, total: failedLogs.length });
}

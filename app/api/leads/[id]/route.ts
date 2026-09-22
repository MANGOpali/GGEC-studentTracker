import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { updateLeadSchema } from "@/lib/validations";
import { canEditLead } from "@/lib/permissions";
import { createNotification, notifyAdmins } from "@/services/notificationService";

const MILESTONE_STATUSES = new Set(["ENROLLED", "VISA_GRANTED", "APPLICATION_SUBMITTED", "OFFER_RECEIVED", "COMPLETED", "CONFIRMED"]);

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

const leadInclude = {
  country: { select: { id: true, name: true } },
  source: { select: { id: true, name: true } },
  intake: { select: { id: true, name: true } },
  branch: { select: { id: true, name: true } },
  assignedCounsellor: { select: { id: true, name: true, email: true } },
  createdBy: { select: { id: true, name: true } },
  activities: {
    include: { user: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: "desc" as const },
    take: 50,
  },
};

async function buildLeadResponse(rawLead: Awaited<ReturnType<typeof prisma.lead.findFirst>>) {
  if (!rawLead) return null;

  // Round 1 parallel: all direct relation + activities queries at once
  const [country, source, intake, branch, assignedCounsellor, createdBy, activities] = await Promise.all([
    rawLead.countryId ? prisma.country.findUnique({ where: { id: rawLead.countryId }, select: { id: true, name: true } }) : Promise.resolve(null),
    prisma.leadSource.findUnique({ where: { id: rawLead.sourceId }, select: { id: true, name: true } }),
    rawLead.intakeId ? prisma.intake.findUnique({ where: { id: rawLead.intakeId }, select: { id: true, name: true } }) : Promise.resolve(null),
    rawLead.branchId ? prisma.branch.findUnique({ where: { id: rawLead.branchId }, select: { id: true, name: true } }) : Promise.resolve(null),
    rawLead.assignedCounsellorId ? prisma.user.findUnique({ where: { id: rawLead.assignedCounsellorId }, select: { id: true, name: true, email: true } }) : Promise.resolve(null),
    prisma.user.findUnique({ where: { id: rawLead.createdById }, select: { id: true, name: true } }),
    prisma.leadActivity.findMany({
      where: { leadId: rawLead.id },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, action: true, metadata: true, createdAt: true, userId: true },
    }),
  ]);

  // Round 2: fetch activity users (single IN query)
  const activityUserIds = [...new Set(activities.map((a) => a.userId))];
  const activityUsers = activityUserIds.length
    ? await prisma.user.findMany({ where: { id: { in: activityUserIds } }, select: { id: true, name: true, role: true } })
    : [];
  const userMap = new Map(activityUsers.map((u) => [u.id, u]));

  return {
    ...rawLead,
    country: rawLead.countryId ? (country ?? { id: rawLead.countryId, name: "—" }) : null,
    source: source ?? { id: rawLead.sourceId, name: "—" },
    intake,
    branch,
    assignedCounsellor,
    createdBy: createdBy ?? { id: rawLead.createdById, name: "—" },
    activities: activities.map((a) => ({
      ...a,
      user: userMap.get(a.userId) ?? { id: a.userId, name: "—", role: "COUNSELLOR" },
    })),
  };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const rawLead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });

  if (!rawLead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!canEditLead(session, rawLead)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const lead = await buildLeadResponse(rawLead);
  return NextResponse.json({ lead });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });
  if (!canEditLead(session, existing)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const body = await request.json();
    const parsed = updateLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const { status: newStatus, nextFollowUpAt, followUpNotes, lastContactedAt, ...rest } = parsed.data;

    const updateData: Record<string, unknown> = { ...rest };
    if (newStatus) updateData.status = newStatus;
    if (nextFollowUpAt) updateData.nextFollowUpAt = new Date(nextFollowUpAt);
    if (followUpNotes !== undefined) updateData.followUpNotes = followUpNotes;
    if (lastContactedAt) updateData.lastContactedAt = new Date(lastContactedAt);
    if (rest.email === "") updateData.email = null;
    if (rest.intakeId === "") updateData.intakeId = null;
    if (rest.branchId === "") updateData.branchId = null;
    if (rest.assignedCounsellorId === "") updateData.assignedCounsellorId = null;

    const updated = await prisma.lead.update({ where: { id: existing.id }, data: updateData });

    // Log activity
    const statusChanged = !!newStatus && newStatus !== existing.status;
    const activityType = statusChanged ? "CHANGE_STATUS" : "UPDATE_LEAD";
    await prisma.leadActivity.create({
      data: {
        leadId: updated.id,
        userId: session.userId,
        action: activityType,
        metadata: newStatus ? { from: existing.status, to: newStatus } : { fields: Object.keys(rest) },
      },
    });

    // Notifications for status changes (fire-and-forget)
    if (statusChanged && newStatus) {
      const leadLabel = `${existing.leadId} (${existing.studentName})`;
      const notifyPromises: Promise<unknown>[] = [];

      // Notify admins on milestone statuses, or when a counsellor changes any status
      if (MILESTONE_STATUSES.has(newStatus)) {
        notifyPromises.push(
          notifyAdmins(
            `Lead ${newStatus.replace(/_/g, " ")}`,
            `${leadLabel} is now ${newStatus.replace(/_/g, " ").toLowerCase()}.`,
            existing.id,
            session.userId,
          )
        );
      } else if (session.role !== "ADMIN") {
        notifyPromises.push(
          notifyAdmins(
            "Lead Status Updated",
            `${session.name || "A user"} changed ${leadLabel} to ${newStatus.replace(/_/g, " ")}.`,
            existing.id,
            session.userId,
          )
        );
      }

      // Notify assigned counsellor when someone else changes status on their lead
      if (existing.assignedCounsellorId && existing.assignedCounsellorId !== session.userId) {
        notifyPromises.push(
          createNotification({
            userId: existing.assignedCounsellorId,
            title: "Lead Status Changed",
            message: `Status of ${leadLabel} was changed to ${newStatus.replace(/_/g, " ")}.`,
            leadId: existing.id,
          })
        );
      }

      Promise.all(notifyPromises).catch(() => {});
    }

    const lead = await buildLeadResponse(updated);
    return NextResponse.json({ lead });
  } catch (err) {
    console.error("Update lead error:", err);
    return NextResponse.json({ error: "Failed to update lead" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  // Soft delete (archive)
  await prisma.lead.update({ where: { id: existing.id }, data: { isArchived: true } });
  await prisma.leadActivity.create({
    data: { leadId: existing.id, userId: session.userId, action: "ARCHIVE_LEAD" },
  });

  return NextResponse.json({ success: true });
}

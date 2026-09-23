import { prisma } from "@/lib/db";
import { generateLeadId } from "@/lib/utils";
import { appendLeadToSheet, ensureSheetHeaders } from "@/lib/google-sheets";
import { CreateLeadInput } from "@/lib/validations";
import { LeadStatus, LeadType } from "@prisma/client";
import { format } from "date-fns";
import { notifyAdmins } from "@/services/notificationService";

export async function getNextLeadSequence(): Promise<number> {
  const year = new Date().getFullYear();
  const leads = await prisma.lead.findMany({
    where: { leadId: { startsWith: `GG-${year}-` } },
    select: { leadId: true },
  });
  let max = 0;
  for (const { leadId } of leads) {
    const match = leadId.match(/GG-\d{4}-(\d+)/);
    if (match) max = Math.max(max, parseInt(match[1]));
  }
  return max + 1;
}

export async function checkDuplicate(phone: string, excludeId?: string) {
  const normalized = phone.replace(/\s/g, "");
  const leads = await prisma.lead.findMany({
    where: {
      phone: { contains: normalized },
      isArchived: false,
      ...(excludeId ? { id: { not: excludeId } } : {}),
    },
    include: {
      country: { select: { name: true } },
      assignedCounsellor: { select: { name: true } },
      source: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  return leads;
}

export async function createLead(data: CreateLeadInput, createdById: string, teacherId?: string) {
  const seq = await getNextLeadSequence();
  const leadId = generateLeadId(seq);

  const lead = await prisma.lead.create({
    data: {
      leadId,
      leadType: (data.leadType as LeadType) || LeadType.STUDY_ABROAD,
      studentName: data.studentName,
      phone: data.phone,
      email: data.email || null,
      educationLevel: data.educationLevel,
      countryId: data.countryId || null,
      sourceId: data.sourceId,
      bookingDate: data.bookingDate ? new Date(data.bookingDate) : null,
      course: data.course || null,
      intakeId: data.intakeId || null,
      referredBy: data.referredBy || null,
      branchId: data.branchId || null,
      assignedCounsellorId: data.assignedCounsellorId || null,
      teacherId: teacherId || null,
      notes: data.notes || null,
      campaign: data.campaign || null,
      campaignId: data.campaignId || null,
      utmSource: data.utmSource || null,
      utmMedium: data.utmMedium || null,
      utmCampaign: data.utmCampaign || null,
      utmContent: data.utmContent || null,
      academicInfo: data.academicInfo || undefined,
      englishTest: data.englishTest || undefined,
      nextFollowUpAt: data.followUpDate ? new Date(data.followUpDate) : null,
      createdById,
      status: LeadStatus.NEW,
    },
    include: {
      country: { select: { name: true } },
      source: { select: { name: true } },
      intake: { select: { name: true } },
      branch: { select: { name: true } },
      assignedCounsellor: { select: { name: true, email: true } },
      createdBy: { select: { name: true } },
    },
  });

  // Log activity
  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: createdById,
      action: "CREATE_LEAD",
      metadata: { leadId: lead.leadId, studentName: lead.studentName },
    },
  });

  // Notify admins when a non-admin creates a lead (fire-and-forget)
  const creator = await prisma.user.findUnique({ where: { id: createdById }, select: { name: true, role: true } });
  if (creator && creator.role !== "ADMIN") {
    notifyAdmins(
      "New Lead Created",
      `${creator.name} added a new lead: ${lead.studentName} (${lead.leadId})`,
      lead.id,
      createdById,
    ).catch(() => {});
  }

  // Sync to Google Sheets (fire-and-forget)
  syncToSheets(lead).catch(() => {});

  return lead;
}

async function syncToSheets(lead: {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  email: string | null;
  educationLevel: string;
  country: { name: string } | null;
  course: string | null;
  intake: { name: string } | null;
  source: { name: string };
  status: string;
  assignedCounsellor: { name: string } | null;
  branch: { name: string } | null;
  createdBy: { name: string };
  createdAt: Date;
  nextFollowUpAt: Date | null;
  notes: string | null;
}) {
  await ensureSheetHeaders();
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

  await prisma.syncLog.create({
    data: {
      leadId: lead.id,
      status: result.success ? "SYNCED" : "FAILED",
      errorMsg: result.error || null,
      syncedAt: result.success ? new Date() : null,
    },
  });
}

export async function autoAssignCounsellor(branchId?: string): Promise<string | null> {
  const where = {
    role: "COUNSELLOR" as const,
    isActive: true,
    ...(branchId ? { branchId } : {}),
  };

  const counsellors = await prisma.user.findMany({ where });
  if (counsellors.length === 0) return null;

  // Round-robin: pick counsellor with fewest active leads
  const counts = await prisma.lead.groupBy({
    by: ["assignedCounsellorId"],
    where: { assignedCounsellorId: { in: counsellors.map((c) => c.id) }, isArchived: false },
    _count: { id: true },
  });

  const countMap = new Map(counts.map((c) => [c.assignedCounsellorId!, c._count.id]));
  let minCount = Infinity;
  let selected = counsellors[0].id;

  for (const c of counsellors) {
    const count = countMap.get(c.id) ?? 0;
    if (count < minCount) {
      minCount = count;
      selected = c.id;
    }
  }

  return selected;
}

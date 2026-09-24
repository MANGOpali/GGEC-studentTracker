import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createLeadSchema } from "@/lib/validations";
import { createLead, checkDuplicate } from "@/services/leadService";
import { buildLeadWhereClause } from "@/lib/permissions";
import { Prisma } from "@prisma/client";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const pageSize = parseInt(searchParams.get("pageSize") || "20");
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const countryId = searchParams.get("countryId") || "";
  const sourceId = searchParams.get("sourceId") || "";
  const counsellorId = searchParams.get("counsellorId") || "";
  const branchId = searchParams.get("branchId") || "";
  const intakeId = searchParams.get("intakeId") || "";
  const leadType = searchParams.get("leadType") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";
  const phone = searchParams.get("phone") || "";
  const hasFollowup = searchParams.get("hasFollowup") === "1";

  // Duplicate check shortcut
  if (phone) {
    const duplicates = await checkDuplicate(phone);
    return NextResponse.json({ duplicates, duplicate: duplicates[0] ?? null });
  }

  const classLeads = searchParams.get("classLeads");

  // For classLeads view, reception sees all class leads (not just ones they created)
  const baseWhere = (classLeads && session.role === "RECEPTIONIST")
    ? { isArchived: false }
    : buildLeadWhereClause(session);
  const where: Prisma.LeadWhereInput = { ...baseWhere };

  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { email: { contains: search, mode: "insensitive" } },
      { leadId: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as never;
  if (leadType) where.leadType = leadType as never;
  if (classLeads) {
    where.leadType = { in: ["IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"] } as never;
    where.teacherId = { not: null };
  }
  if (countryId) where.countryId = countryId;
  if (sourceId) where.sourceId = sourceId;
  if (counsellorId && session.role === "ADMIN") where.assignedCounsellorId = counsellorId;
  if (branchId) where.branchId = branchId;
  if (intakeId) where.intakeId = intakeId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59");
  }
  if (hasFollowup) where.nextFollowUpAt = { not: null };

  // Round 1: count + plain lead rows (no includes) in parallel
  const [total, rows] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      select: {
        id: true, leadId: true, studentName: true, phone: true,
        educationLevel: true, status: true, leadType: true, bookingDate: true,
        createdAt: true, nextFollowUpAt: true,
        countryId: true, sourceId: true, intakeId: true, branchId: true,
        assignedCounsellorId: true, createdById: true, teacherId: true,
        classType: true, studentStatus: true, shiftId: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  // Round 2: fetch all referenced entities in parallel (6 queries at once)
  const countryIds = [...new Set(rows.map((r) => r.countryId).filter(Boolean))] as string[];
  const sourceIds = [...new Set(rows.map((r) => r.sourceId))];
  const intakeIds = [...new Set(rows.map((r) => r.intakeId).filter(Boolean))] as string[];
  const branchIds = [...new Set(rows.map((r) => r.branchId).filter(Boolean))] as string[];
  const counsellorIds = [...new Set(rows.map((r) => r.assignedCounsellorId).filter(Boolean))] as string[];
  const createdByIds = [...new Set(rows.map((r) => r.createdById))];
  const teacherIds = [...new Set(rows.map((r) => r.teacherId).filter(Boolean))] as string[];
  const shiftIds = [...new Set(rows.map((r) => r.shiftId).filter(Boolean))] as string[];

  const [countries, sources, intakes, branches, counsellors, creators, teachers, shifts] = await Promise.all([
    countryIds.length ? prisma.country.findMany({ where: { id: { in: countryIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    prisma.leadSource.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true } }),
    intakeIds.length ? prisma.intake.findMany({ where: { id: { in: intakeIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    branchIds.length ? prisma.branch.findMany({ where: { id: { in: branchIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    counsellorIds.length ? prisma.user.findMany({ where: { id: { in: counsellorIds } }, select: { id: true, name: true, email: true } }) : Promise.resolve([]),
    prisma.user.findMany({ where: { id: { in: createdByIds } }, select: { id: true, name: true } }),
    teacherIds.length ? prisma.user.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } }) : Promise.resolve([]),
    shiftIds.length ? prisma.shift.findMany({ where: { id: { in: shiftIds } }, select: { id: true, name: true, startTime: true, endTime: true } }) : Promise.resolve([]),
  ]);

  // Build lookup maps
  const cMap = new Map(countries.map((c) => [c.id, c]));
  const sMap = new Map(sources.map((s) => [s.id, s]));
  const iMap = new Map(intakes.map((i) => [i.id, i]));
  const bMap = new Map(branches.map((b) => [b.id, b]));
  const coMap = new Map(counsellors.map((u) => [u.id, u]));
  const crMap = new Map(creators.map((u) => [u.id, u]));
  const tMap = new Map(teachers.map((u) => [u.id, u]));
  const shMap = new Map(shifts.map((s) => [s.id, s]));

  const leads = rows.map((r) => ({
    ...r,
    country: r.countryId ? (cMap.get(r.countryId) ?? { id: r.countryId, name: "—" }) : null,
    source: sMap.get(r.sourceId) ?? { id: r.sourceId, name: "—" },
    intake: r.intakeId ? (iMap.get(r.intakeId) ?? null) : null,
    branch: r.branchId ? (bMap.get(r.branchId) ?? null) : null,
    assignedCounsellor: r.assignedCounsellorId ? (coMap.get(r.assignedCounsellorId) ?? null) : null,
    teacher: r.teacherId ? (tMap.get(r.teacherId) ?? null) : null,
    shift: r.shiftId ? (shMap.get(r.shiftId) ?? null) : null,
    createdBy: crMap.get(r.createdById) ?? { id: r.createdById, name: "—" },
  }));

  return NextResponse.json({
    data: leads,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const parsed = createLeadSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
    }

    const lead = await createLead(parsed.data, session.userId, session.role === "TEACHER" ? session.userId : undefined);
    return NextResponse.json({ lead }, { status: 201 });
  } catch (err) {
    console.error("Create lead error:", err);
    return NextResponse.json({ error: "Failed to create lead" }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { buildLeadWhereClause } from "@/lib/permissions";
import { format } from "date-fns";
import { Prisma } from "@prisma/client";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const countryId = searchParams.get("countryId") || "";
  const sourceId = searchParams.get("sourceId") || "";
  const counsellorId = searchParams.get("counsellorId") || "";
  const branchId = searchParams.get("branchId") || "";
  const dateFrom = searchParams.get("dateFrom") || "";
  const dateTo = searchParams.get("dateTo") || "";

  const baseWhere = buildLeadWhereClause(session);
  const where: Prisma.LeadWhereInput = { ...baseWhere };

  if (search) {
    where.OR = [
      { studentName: { contains: search, mode: "insensitive" } },
      { phone: { contains: search } },
      { leadId: { contains: search, mode: "insensitive" } },
    ];
  }
  if (status) where.status = status as never;
  if (countryId) where.countryId = countryId;
  if (sourceId) where.sourceId = sourceId;
  if (counsellorId) where.assignedCounsellorId = counsellorId;
  if (branchId) where.branchId = branchId;
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Prisma.DateTimeFilter).gte = new Date(dateFrom);
    if (dateTo) (where.createdAt as Prisma.DateTimeFilter).lte = new Date(dateTo + "T23:59:59");
  }

  const leads = await prisma.lead.findMany({
    where,
    include: {
      country: true, source: true, intake: true, branch: true,
      assignedCounsellor: { select: { name: true } },
      createdBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const headers = ["Lead ID", "Name", "Phone", "Email", "Education Level", "Country", "Course", "Intake", "Source", "Status", "Counsellor", "Branch", "Created By", "Created At", "Next Follow-up", "Notes"];

  const rows = leads.map((l) => [
    l.leadId, l.studentName, l.phone, l.email || "",
    l.educationLevel, l.country?.name || "", l.course || "",
    l.intake?.name || "", l.source.name, l.status,
    l.assignedCounsellor?.name || "", l.branch?.name || "",
    l.createdBy.name, format(l.createdAt, "dd MMM yyyy HH:mm"),
    l.nextFollowUpAt ? format(l.nextFollowUpAt, "dd MMM yyyy") : "",
    (l.notes || "").replace(/\n/g, " "),
  ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));

  const csv = [headers.join(","), ...rows].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="leads-${format(new Date(), "yyyy-MM-dd")}.csv"`,
    },
  });
}

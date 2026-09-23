import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import Papa from "papaparse";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

const VALID_LEAD_TYPES = ["STUDY_ABROAD", "IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"];
const VALID_CLASS_TYPES = ["PHYSICAL", "ONLINE", "CRASH_COURSE"];
const VALID_STUDENT_STATUSES = ["TRIAL", "ACTIVE", "HOLD", "COMPLETE", "DROPPED"];
const VALID_STATUSES = [
  "NEW","CONTACTED","FOLLOW_UP","COUNSELLING_BOOKED","COUNSELLING_COMPLETED",
  "INTERESTED","DOCUMENT_COLLECTION","APPLICATION_STARTED","APPLICATION_SUBMITTED",
  "OFFER_RECEIVED","VISA_PROCESS","VISA_GRANTED","ENROLLED","NOT_INTERESTED",
  "NOT_ELIGIBLE","NO_RESPONSE","FUTURE_INTAKE","CLOSED",
  "DEMO_SCHEDULED","DEMO_ATTENDED","IN_CLASS","COMPLETED","DROPPED",
  "CONFIRMED","RESCHEDULED","NO_SHOW",
];

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file uploaded" }, { status: 400 });

  const text = await file.text();
  const { data: rows, errors: parseErrors } = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
    transform: (v) => v.trim(),
  });

  if (parseErrors.length && rows.length === 0) {
    return NextResponse.json({ error: "Failed to parse CSV", details: parseErrors }, { status: 400 });
  }

  // Pre-load all reference data for lookups
  const [sources, branches, shifts, users] = await Promise.all([
    prisma.leadSource.findMany({ select: { id: true, name: true } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.shift.findMany({ select: { id: true, name: true } }),
    prisma.user.findMany({ where: { role: { in: ["TEACHER", "COUNSELLOR"] } }, select: { id: true, name: true, role: true } }),
  ]);

  const sourceMap = new Map(sources.map((s) => [s.name.toLowerCase(), s.id]));
  const branchMap = new Map(branches.map((b) => [b.name.toLowerCase(), b.id]));
  const shiftMap = new Map(shifts.map((s) => [s.name.toLowerCase(), s.id]));
  const teacherMap = new Map(users.filter((u) => u.role === "TEACHER").map((u) => [u.name.toLowerCase().trim(), u.id]));

  // Get the last leadId number to continue sequence
  const lastLead = await prisma.lead.findFirst({ orderBy: { createdAt: "desc" }, select: { leadId: true } });
  let counter = 1;
  if (lastLead?.leadId) {
    const num = parseInt(lastLead.leadId.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(num)) counter = num + 1;
  }

  const results: { row: number; status: "success" | "error"; studentName: string; message?: string }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-based, +1 for header

    const studentName = row.studentName || row["studentName"] || "";
    const phone = row.phone || "";

    if (!studentName || !phone) {
      results.push({ row: rowNum, status: "error", studentName: studentName || "?", message: "studentName and phone are required" });
      continue;
    }

    const leadType = (row.leadType || "STUDY_ABROAD").toUpperCase();
    if (!VALID_LEAD_TYPES.includes(leadType)) {
      results.push({ row: rowNum, status: "error", studentName, message: `Invalid leadType: ${row.leadType}` });
      continue;
    }

    const sourceName = (row.source || "").toLowerCase();
    const sourceId = sourceMap.get(sourceName);
    if (!sourceId) {
      results.push({ row: rowNum, status: "error", studentName, message: `Source not found: "${row.source}". Valid: ${sources.map(s=>s.name).join(", ")}` });
      continue;
    }

    const classType = row.classType ? row.classType.toUpperCase() : null;
    if (classType && !VALID_CLASS_TYPES.includes(classType)) {
      results.push({ row: rowNum, status: "error", studentName, message: `Invalid classType: ${row.classType}` });
      continue;
    }

    const studentStatus = row.studentStatus ? row.studentStatus.toUpperCase() : null;
    if (studentStatus && !VALID_STUDENT_STATUSES.includes(studentStatus)) {
      results.push({ row: rowNum, status: "error", studentName, message: `Invalid studentStatus: ${row.studentStatus}` });
      continue;
    }

    const status = row.status ? row.status.toUpperCase() : "NEW";
    if (!VALID_STATUSES.includes(status)) {
      results.push({ row: rowNum, status: "error", studentName, message: `Invalid status: ${row.status}` });
      continue;
    }

    const branchId = row.branch ? branchMap.get(row.branch.toLowerCase()) ?? null : null;
    const shiftId = row.shift ? shiftMap.get(row.shift.toLowerCase()) ?? null : null;
    const teacherId = row.teacher ? teacherMap.get(row.teacher.toLowerCase().trim()) ?? null : null;

    const totalFee = row.totalFee ? parseFloat(row.totalFee) : null;
    const discount = row.discount ? parseFloat(row.discount) : 0;

    const leadId = `GG-${String(counter).padStart(4, "0")}`;
    counter++;

    try {
      const lead = await prisma.lead.create({
        data: {
          leadId,
          studentName,
          phone,
          email: row.email || null,
          educationLevel: row.educationLevel || "Not specified",
          leadType: leadType as never,
          classType: classType as never ?? null,
          studentStatus: studentStatus as never ?? null,
          status: status as never,
          sourceId,
          branchId,
          shiftId,
          teacherId,
          notes: row.notes || null,
          createdById: session.userId,
        },
      });

      if (totalFee !== null && !isNaN(totalFee)) {
        await prisma.feeRecord.create({
          data: {
            leadId: lead.id,
            totalFee,
            discount: isNaN(discount) ? 0 : discount,
            createdById: session.userId,
          },
        });
      }

      results.push({ row: rowNum, status: "success", studentName });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      results.push({ row: rowNum, status: "error", studentName, message: msg });
      counter--; // reclaim the ID
    }
  }

  const succeeded = results.filter((r) => r.status === "success").length;
  const failed = results.filter((r) => r.status === "error").length;

  return NextResponse.json({ succeeded, failed, results });
}

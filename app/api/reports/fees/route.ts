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
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const classTypeParam = searchParams.get("classType");
  const studentStatusParam = searchParams.get("studentStatus");
  const paymentStatusParam = searchParams.get("paymentStatus");

  const leads = await prisma.lead.findMany({
    where: {
      leadType: { in: ["IELTS_CLASS", "PTE_CLASS"] },
      teacherId: { not: null },
      isArchived: false,
      ...(classTypeParam ? { classType: classTypeParam as never } : {}),
      ...(studentStatusParam ? { studentStatus: studentStatusParam as never } : {}),
    },
    select: {
      id: true,
      leadId: true,
      studentName: true,
      classType: true,
      studentStatus: true,
      feeRecord: {
        select: {
          totalFee: true,
          discount: true,
          payments: { select: { amount: true } },
        },
      },
    },
    orderBy: { studentName: "asc" },
  });

  let totalRevenue = 0;
  let totalOutstanding = 0;
  let studentsWithFee = 0;

  const records = leads.map((lead) => {
    const fr = lead.feeRecord;
    if (!fr) {
      return {
        id: lead.id,
        leadId: lead.leadId,
        studentName: lead.studentName,
        classType: lead.classType,
        studentStatus: lead.studentStatus,
        totalFee: 0,
        discount: 0,
        netFee: 0,
        paid: 0,
        balance: 0,
        paymentStatus: "NO_FEE" as const,
      };
    }
    studentsWithFee++;
    const paid = fr.payments.reduce((sum, p) => sum + p.amount, 0);
    const netFee = fr.totalFee - fr.discount;
    const balance = Math.max(0, netFee - paid);
    totalRevenue += paid;
    totalOutstanding += balance;

    let paymentStatus: "PAID" | "PARTIAL" | "UNPAID" | "NO_FEE";
    if (balance === 0 && netFee > 0) paymentStatus = "PAID";
    else if (paid > 0) paymentStatus = "PARTIAL";
    else paymentStatus = "UNPAID";

    return {
      id: lead.id,
      leadId: lead.leadId,
      studentName: lead.studentName,
      classType: lead.classType,
      studentStatus: lead.studentStatus,
      totalFee: fr.totalFee,
      discount: fr.discount,
      netFee,
      paid,
      balance,
      paymentStatus,
    };
  });

  // Filter by payment status if requested
  const filtered = paymentStatusParam
    ? records.filter((r) => r.paymentStatus === paymentStatusParam)
    : records;

  // Sort by balance descending
  filtered.sort((a, b) => b.balance - a.balance);

  return NextResponse.json({
    summary: {
      totalStudents: leads.length,
      studentsWithFee,
      totalRevenue,
      totalOutstanding,
    },
    records: filtered,
  });
}

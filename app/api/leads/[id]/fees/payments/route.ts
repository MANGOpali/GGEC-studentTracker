import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const feeRecord = await prisma.feeRecord.findUnique({ where: { leadId: lead.id }, select: { id: true } });
  if (!feeRecord) return NextResponse.json({ error: "No fee record exists" }, { status: 400 });

  const { amount, method, reference, paidAt, notes } = await request.json();
  if (!amount || Number(amount) <= 0) return NextResponse.json({ error: "Invalid amount" }, { status: 400 });

  const payment = await prisma.payment.create({
    data: {
      feeRecordId: feeRecord.id,
      amount: Number(amount),
      method: method ?? "CASH",
      reference: reference ?? null,
      paidAt: paidAt ? new Date(paidAt) : new Date(),
      notes: notes ?? null,
      recordedById: session.userId,
    },
  });

  const updatedFeeRecord = await prisma.feeRecord.findUnique({
    where: { id: feeRecord.id },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ payment, feeRecord: updatedFeeRecord }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const paymentId = searchParams.get("paymentId");
  if (!paymentId) return NextResponse.json({ error: "paymentId required" }, { status: 400 });

  await prisma.payment.delete({ where: { id: paymentId } });
  return NextResponse.json({ ok: true });
}

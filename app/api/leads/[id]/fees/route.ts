import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const feeRecord = await prisma.feeRecord.findUnique({
    where: { leadId: lead.id },
    include: {
      payments: { orderBy: { paidAt: "desc" } },
      createdBy: { select: { name: true } },
    },
  });

  return NextResponse.json({ feeRecord });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] }, select: { id: true } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { totalFee, discount, notes } = await request.json();
  if (!totalFee || totalFee <= 0) return NextResponse.json({ error: "Invalid fee amount" }, { status: 400 });

  const feeRecord = await prisma.feeRecord.upsert({
    where: { leadId: lead.id },
    update: { totalFee: Number(totalFee), discount: Number(discount ?? 0), notes: notes ?? null },
    create: { leadId: lead.id, totalFee: Number(totalFee), discount: Number(discount ?? 0), notes: notes ?? null, createdById: session.userId },
    include: { payments: { orderBy: { paidAt: "desc" } }, createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ feeRecord });
}

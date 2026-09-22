import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { assignLeadSchema } from "@/lib/validations";
import { createNotification } from "@/services/notificationService";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const body = await request.json();
  const parsed = assignLeadSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const counsellor = await prisma.user.findUnique({ where: { id: parsed.data.counsellorId } });
  if (!counsellor || counsellor.role !== "COUNSELLOR") {
    return NextResponse.json({ error: "Invalid counsellor" }, { status: 400 });
  }

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: { assignedCounsellorId: counsellor.id },
    include: { assignedCounsellor: { select: { name: true } } },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: session.userId,
      action: "ASSIGN_LEAD",
      metadata: { from: existing.assignedCounsellorId, to: counsellor.id, counsellorName: counsellor.name },
    },
  });

  await createNotification({
    userId: counsellor.id,
    title: "Lead Assigned",
    message: `Lead ${existing.leadId} (${existing.studentName}) has been assigned to you.`,
    leadId: existing.id,
  });

  return NextResponse.json({ lead });
}

import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { followUpSchema } from "@/lib/validations";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!existing) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const body = await request.json();
  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const lead = await prisma.lead.update({
    where: { id: existing.id },
    data: {
      nextFollowUpAt: new Date(parsed.data.nextFollowUpAt),
      followUpNotes: parsed.data.notes || existing.followUpNotes,
    },
  });

  await prisma.leadActivity.create({
    data: {
      leadId: lead.id,
      userId: session.userId,
      action: "SCHEDULE_FOLLOWUP",
      metadata: { date: parsed.data.nextFollowUpAt, notes: parsed.data.notes },
    },
  });

  return NextResponse.json({ lead });
}

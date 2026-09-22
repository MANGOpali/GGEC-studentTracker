import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { addNoteSchema } from "@/lib/validations";

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
  const parsed = addNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const activity = await prisma.leadActivity.create({
    data: {
      leadId: existing.id,
      userId: session.userId,
      action: "ADD_NOTE",
      metadata: { note: parsed.data.note },
    },
    include: { user: { select: { id: true, name: true, role: true } } },
  });

  // Also update the notes on the lead
  await prisma.lead.update({ where: { id: existing.id }, data: { lastContactedAt: new Date() } });

  return NextResponse.json({ activity });
}

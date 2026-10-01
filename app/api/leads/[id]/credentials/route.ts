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
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const credentials = await prisma.studentCredential.findMany({
    where: { leadId: lead.id },
    include: { createdBy: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ credentials });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { label, username, password, notes } = await request.json();
  if (!label?.trim() || !password?.trim()) {
    return NextResponse.json({ error: "Label and password are required" }, { status: 400 });
  }

  const credential = await prisma.studentCredential.create({
    data: {
      leadId: lead.id,
      label: label.trim(),
      username: username?.trim() || null,
      password: password.trim(),
      notes: notes?.trim() || null,
      createdById: session.userId,
    },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ credential }, { status: 201 });
}

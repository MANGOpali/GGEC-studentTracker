import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { canViewLead } from "@/lib/permissions";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  assignedToId: z.string().min(1),
  priority: z.enum(["LOW", "NORMAL", "HIGH"]).optional(),
  dueDate: z.string().optional(),
});

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  if (!canViewLead(session, lead)) {
    const hasTask = await prisma.leadTask.findFirst({ where: { leadId: lead.id, assignedToId: session.userId } });
    if (!hasTask) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const tasks = await prisma.leadTask.findMany({
    where: { leadId: lead.id },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ tasks });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "ADMIN" && session.role !== "COUNSELLOR" && session.role !== "RECEPTIONIST") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const lead = await prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
  if (!lead) return NextResponse.json({ error: "Lead not found" }, { status: 404 });

  const body = await request.json();
  const parsed = createTaskSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const task = await prisma.leadTask.create({
    data: {
      leadId: lead.id,
      title: parsed.data.title,
      description: parsed.data.description,
      assignedToId: parsed.data.assignedToId,
      createdById: session.userId,
      priority: parsed.data.priority ?? "NORMAL",
      dueDate: parsed.data.dueDate ? new Date(parsed.data.dueDate) : undefined,
    },
    include: {
      assignedTo: { select: { id: true, name: true, role: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ task }, { status: 201 });
}

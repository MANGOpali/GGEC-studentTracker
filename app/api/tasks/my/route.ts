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
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const statusFilter = searchParams.get("status") || "";

  const tasks = await prisma.leadTask.findMany({
    where: {
      assignedToId: session.userId,
      ...(statusFilter ? { status: statusFilter as never } : { status: { not: "DONE" } }),
    },
    include: {
      lead: { select: { id: true, leadId: true, studentName: true, phone: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ priority: "desc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    take: 20,
  });

  return NextResponse.json({ tasks });
}

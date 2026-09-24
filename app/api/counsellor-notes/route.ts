import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createCounsellorNoteSchema } from "@/lib/validations";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const counsellorId = searchParams.get("counsellorId");

  const where =
    session.role === "ADMIN"
      ? counsellorId ? { counsellorId } : {}
      : { counsellorId: session.userId };

  const notes = await prisma.counsellorNote.findMany({
    where,
    include: { counsellor: { select: { id: true, name: true } } },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({ notes });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "COUNSELLOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createCounsellorNoteSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const note = await prisma.counsellorNote.create({
    data: { ...parsed.data, counsellorId: session.userId },
    include: { counsellor: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ note }, { status: 201 });
}

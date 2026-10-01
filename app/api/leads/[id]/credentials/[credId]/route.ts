import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; credId: string }> }
) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { credId } = await params;
  const cred = await prisma.studentCredential.findUnique({ where: { id: credId } });
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { label, username, password, notes } = await request.json();
  const updated = await prisma.studentCredential.update({
    where: { id: credId },
    data: {
      ...(label !== undefined && { label: label.trim() }),
      ...(username !== undefined && { username: username?.trim() || null }),
      ...(password !== undefined && { password: password.trim() }),
      ...(notes !== undefined && { notes: notes?.trim() || null }),
    },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ credential: updated });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; credId: string }> }
) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role === "TEACHER") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { credId } = await params;
  const cred = await prisma.studentCredential.findUnique({ where: { id: credId } });
  if (!cred) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.studentCredential.delete({ where: { id: credId } });
  return NextResponse.json({ success: true });
}

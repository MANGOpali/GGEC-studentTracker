import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createUserSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role");

  const users = await prisma.user.findMany({
    where: role ? { role: role as never } : {},
    select: {
      id: true, email: true, name: true, role: true, phone: true,
      isActive: true, branchId: true, branch: { select: { name: true } }, createdAt: true,
      _count: { select: { assignedLeads: true, createdLeads: true, teachingLeads: true } },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json({ users });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId || session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await prisma.user.findUnique({ where: { email: parsed.data.email } });
  if (existing) return NextResponse.json({ error: "Email already in use" }, { status: 409 });

  const hashed = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: { ...parsed.data, password: hashed, email: parsed.data.email.toLowerCase() },
    select: { id: true, email: true, name: true, role: true, branchId: true, isActive: true },
  });

  return NextResponse.json({ user }, { status: 201 });
}

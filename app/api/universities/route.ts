import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { createUniversitySchema } from "@/lib/validations";

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
      ? counsellorId ? { createdById: counsellorId, isActive: true } : { isActive: true }
      : { createdById: session.userId, isActive: true };

  const universities = await prisma.university.findMany({
    where,
    include: { createdBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ universities });
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "COUNSELLOR" && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = createUniversitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });

  const university = await prisma.university.create({
    data: {
      ...parsed.data,
      tuitionFeeMin: parsed.data.tuitionFeeMin ?? null,
      tuitionFeeMax: parsed.data.tuitionFeeMax ?? null,
      createdById: session.userId,
    },
    include: { createdBy: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ university }, { status: 201 });
}

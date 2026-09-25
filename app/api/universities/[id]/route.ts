import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { updateUniversitySchema } from "@/lib/validations";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

const courseInclude = {
  orderBy: [{ courseLevel: "asc" as const }, { courseName: "asc" as const }],
};

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.university.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.createdById !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const parsed = updateUniversitySchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const { courses, ...uniFields } = parsed.data;

  // Replace course list inside a transaction
  const university = await prisma.$transaction(async (tx) => {
    if (courses !== undefined) {
      await tx.universityCourse.deleteMany({ where: { universityId: id } });
    }
    return tx.university.update({
      where: { id },
      data: {
        ...uniFields,
        ...(courses && courses.length > 0 && {
          universityCourses: {
            create: courses.map((c) => ({
              courseName: c.courseName,
              courseLevel: c.courseLevel,
              intakeName: c.intakeName || null,
              campusLocation: c.campusLocation || null,
            })),
          },
        }),
      },
      include: {
        createdBy: { select: { id: true, name: true } },
        universityCourses: courseInclude,
      },
    });
  });

  return NextResponse.json({ university });
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.university.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (existing.createdById !== session.userId && session.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.university.update({ where: { id }, data: { isActive: false } });
  return NextResponse.json({ success: true });
}

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { loginSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
    }

    const { email, password } = parsed.data;
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() }, include: { branch: true } });

    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
    }

    const response = NextResponse.json({
      user: { id: user.id, email: user.email, name: user.name, role: user.role, branchId: user.branchId },
    });

    const session = await getIronSession<SessionData>(request, response, sessionOptions);
    session.userId = user.id;
    session.email = user.email;
    session.name = user.name;
    session.role = user.role as SessionData["role"];
    session.branchId = user.branchId || undefined;
    await session.save();

    // Log login activity
    await prisma.leadActivity.create({
      data: { userId: user.id, action: "LOGIN", metadata: { email: user.email } },
    });

    return response;
  } catch (err) {
    console.error("Login error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

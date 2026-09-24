import { NextRequest, NextResponse } from "next/server";
import { getIronSession } from "iron-session";
import { SessionData, sessionOptions } from "@/lib/session";
import { prisma } from "@/lib/db";
import { r2, R2_BUCKET } from "@/lib/r2";
import { PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { canEditLead } from "@/lib/permissions";

async function getSession(req: NextRequest) {
  const res = NextResponse.next();
  return getIronSession<SessionData>(req, res, sessionOptions);
}

async function getLead(id: string) {
  return prisma.lead.findFirst({ where: { OR: [{ id }, { leadId: id }] } });
}

// GET /api/leads/[id]/documents?presign=filename&contentType=...
// Returns presigned upload URL OR lists documents
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (!canEditLead(session, lead)) {
    const hasTask = await prisma.leadTask.findFirst({ where: { leadId: lead.id, assignedToId: session.userId } });
    if (!hasTask) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const filename = searchParams.get("presign");

  if (filename) {
    const contentType = searchParams.get("contentType") ?? "application/octet-stream";
    const key = `leads/${lead.id}/${Date.now()}-${filename.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const url = await getSignedUrl(
      r2,
      new PutObjectCommand({ Bucket: R2_BUCKET, Key: key, ContentType: contentType }),
      { expiresIn: 300 }
    );
    return NextResponse.json({ uploadUrl: url, key });
  }

  const downloadKey = searchParams.get("download");
  if (downloadKey) {
    const { GetObjectCommand } = await import("@aws-sdk/client-s3");
    const url = await getSignedUrl(
      r2,
      new GetObjectCommand({ Bucket: R2_BUCKET, Key: downloadKey }),
      { expiresIn: 300 }
    );
    return NextResponse.json({ downloadUrl: url });
  }

  const documents = await prisma.leadDocument.findMany({
    where: { leadId: lead.id },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ documents });
}

// POST /api/leads/[id]/documents — save record after upload
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { name, key, size, docType } = await request.json();
  if (!name || !key || !size || !docType) return NextResponse.json({ error: "Missing fields" }, { status: 400 });

  if (!canEditLead(session, lead)) {
    const hasTask = await prisma.leadTask.findFirst({ where: { leadId: lead.id, assignedToId: session.userId } });
    if (!hasTask) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const doc = await prisma.leadDocument.create({
    data: { leadId: lead.id, name, key, size, docType, uploadedById: session.userId },
    include: { uploadedBy: { select: { id: true, name: true } } },
  });
  return NextResponse.json({ document: doc }, { status: 201 });
}

// DELETE /api/leads/[id]/documents?key=...
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const lead = await getLead(id);
  if (!lead) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const { searchParams } = new URL(request.url);
  const docId = searchParams.get("docId");
  if (!docId) return NextResponse.json({ error: "Missing docId" }, { status: 400 });

  const doc = await prisma.leadDocument.findFirst({ where: { id: docId, leadId: lead.id } });
  if (!doc) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (session.role !== "ADMIN" && session.role !== "COUNSELLOR" && doc.uploadedById !== session.userId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await Promise.all([
    r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: doc.key })),
    prisma.leadDocument.delete({ where: { id: docId } }),
  ]);

  return NextResponse.json({ success: true });
}

import { prisma } from "@/lib/db";

export async function createNotification({
  userId,
  title,
  message,
  leadId,
}: {
  userId: string;
  title: string;
  message: string;
  leadId?: string;
}) {
  return prisma.notification.create({
    data: { userId, title, message, leadId: leadId || null },
  });
}

export async function notifyAdmins(title: string, message: string, leadId?: string, excludeUserId?: string) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN", isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  if (admins.length === 0) return;
  await prisma.notification.createMany({
    data: admins.map((a) => ({ userId: a.id, title, message, leadId: leadId || null })),
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

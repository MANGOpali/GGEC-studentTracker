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

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}

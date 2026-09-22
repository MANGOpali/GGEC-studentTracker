"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell } from "lucide-react";
import { formatRelative } from "@/lib/utils";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  leadId: string | null;
  createdAt: string;
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => fetch("/api/notifications").then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 30_000, // poll every 30s
  });

  const notifications: Notification[] = data?.notifications ?? [];
  const unreadCount: number = data?.unreadCount ?? 0;

  async function handleOpen() {
    setOpen((o) => !o);
    if (!open && unreadCount > 0) {
      await fetch("/api/notifications", { method: "PATCH" });
      queryClient.setQueryData(["notifications"], (old: typeof data) =>
        old ? { ...old, unreadCount: 0, notifications: old.notifications.map((n: Notification) => ({ ...n, isRead: true })) } : old
      );
    }
  }

  return (
    <div className="relative">
      <button onClick={handleOpen}
        className="relative p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors">
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-2 w-80 bg-white border rounded-xl shadow-lg z-50 overflow-hidden">
            <div className="p-3 border-b">
              <h3 className="font-semibold text-sm text-gray-800">Notifications</h3>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-sm text-gray-500">No notifications</div>
              ) : (
                notifications.map((n) => (
                  <div key={n.id}
                    className={`p-3 border-b last:border-0 hover:bg-gray-50 ${!n.isRead ? "bg-blue-50" : ""}`}>
                    <p className="text-sm font-medium text-gray-800">{n.title}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                    <p className="text-xs text-gray-400 mt-1">{formatRelative(n.createdAt)}</p>
                    {n.leadId && (
                      <Link href={`/leads/${n.leadId}`} onClick={() => setOpen(false)}
                        className="text-xs text-[#0E356B] hover:underline mt-1 inline-block">
                        View lead →
                      </Link>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

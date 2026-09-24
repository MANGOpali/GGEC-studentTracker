"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserPlus, BarChart3, Settings, LogOut,
  Menu, X, BookOpen, Clock, ClipboardList, Calendar, Library,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import Image from "next/image";

const navGroups = [
  {
    items: [
      { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Leads",
    items: [
      { href: "/admin/leads", label: "All Leads", icon: BookOpen },
      { href: "/leads/new", label: "Add Lead", icon: UserPlus },
      { href: "/admin/followups", label: "Follow-ups", icon: Calendar },
    ],
  },
  {
    label: "Manage",
    items: [
      { href: "/admin/users", label: "Team", icon: Users },
      { href: "/admin/shifts", label: "Shifts", icon: Clock },
      { href: "/admin/attendance", label: "Attendance", icon: ClipboardList },
    ],
  },
  {
    label: "More",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3 },
      { href: "/admin/resources", label: "Resources", icon: Library },
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ],
  },
];

const allItems = navGroups.flatMap((g) => g.items);

export default function AdminLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string; role: string };
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    allItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => {
    setPendingHref(null);
    setMobileOpen(false);
  }, [pathname]);

  // Persist collapsed state
  useEffect(() => {
    const saved = localStorage.getItem("admin-sidebar-collapsed");
    if (saved === "true") setCollapsed(true);
  }, []);

  function toggleCollapsed() {
    setCollapsed((v) => {
      localStorage.setItem("admin-sidebar-collapsed", String(!v));
      return !v;
    });
  }

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  function isActive(href: string) {
    if (pendingHref) return pendingHref === href;
    if (href === "/admin/dashboard" || href === "/leads/new") return pathname === href;
    return pathname.startsWith(href);
  }

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">

      {/* ── Mobile overlay backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={cn(
          "fixed left-0 top-0 h-full z-40 flex flex-col bg-white border-r border-gray-200 transition-all duration-200 ease-in-out",
          collapsed ? "w-16" : "w-56",
          // Mobile: hidden by default, slide in when open
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo + collapse toggle */}
        <div className={cn("h-16 flex items-center border-b border-gray-100 shrink-0", collapsed ? "justify-center px-0" : "px-4 gap-2")}>
          {!collapsed && (
            <Link href="/admin/dashboard" className="flex-1 min-w-0">
              <Image src="/logo.png" alt="Global Gate" width={110} height={36} className="object-contain" />
            </Link>
          )}
          <button
            onClick={toggleCollapsed}
            className="hidden lg:flex p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors shrink-0"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto py-3 space-y-4">
          {navGroups.map((group, gi) => (
            <div key={gi}>
              {group.label && !collapsed && (
                <p className="px-4 mb-1 text-[10px] font-semibold text-gray-400 uppercase tracking-widest">
                  {group.label}
                </p>
              )}
              {group.label && collapsed && gi > 0 && (
                <div className="mx-3 my-1 h-px bg-gray-100" />
              )}
              <div className="space-y-0.5 px-2">
                {group.items.map((item) => {
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setPendingHref(item.href)}
                      title={collapsed ? item.label : undefined}
                      className={cn(
                        "flex items-center gap-3 rounded-lg text-sm font-medium transition-all duration-100",
                        collapsed ? "justify-center px-0 py-2.5" : "px-3 py-2",
                        active
                          ? "bg-blue-600 text-white"
                          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      )}
                    >
                      <item.icon size={17} className="shrink-0" />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User + logout */}
        <div className={cn("border-t border-gray-100 py-3 px-2 shrink-0", collapsed ? "flex flex-col items-center gap-2" : "")}>
          {!collapsed ? (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg">
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 leading-tight truncate">{user.name}</p>
                <p className="text-xs text-gray-400">Admin</p>
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </div>
          ) : (
            <>
              <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold" title={user.name}>
                {user.name.charAt(0).toUpperCase()}
              </div>
              <button
                onClick={handleLogout}
                title="Sign out"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
              >
                <LogOut size={15} />
              </button>
            </>
          )}
        </div>
      </aside>

      {/* ── Main area ── */}
      <div className={cn("flex flex-col flex-1 min-h-screen min-w-0 transition-all duration-200 ease-in-out", collapsed ? "lg:pl-16" : "lg:pl-56")}>

        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 bg-white border-b border-gray-200 h-14 flex items-center gap-3 px-4 shrink-0">
          <button
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100"
          >
            <Menu size={20} />
          </button>
          <Link href="/admin/dashboard" className="flex-1">
            <Image src="/logo.png" alt="Global Gate" width={100} height={34} className="object-contain" />
          </Link>
          <NotificationBell />
        </header>

        {/* Desktop top strip — notifications only */}
        <header className="hidden lg:flex sticky top-0 z-20 bg-white border-b border-gray-200 h-12 items-center justify-end px-6 shrink-0">
          <NotificationBell />
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          <div className="max-w-screen-xl mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile FAB */}
      <Link
        href="/leads/new"
        className="fixed bottom-6 right-6 z-50 lg:hidden bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors"
      >
        <UserPlus size={22} />
      </Link>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, UserPlus, BookOpen, Users, ClipboardList, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import NotificationBell from "./NotificationBell";
import Image from "next/image";

const navItems = [
  { href: "/reception/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/leads/new", label: "Add Lead", icon: UserPlus },
  { href: "/reception/leads", label: "My Leads", icon: BookOpen },
  { href: "/reception/students", label: "Students", icon: Users },
  { href: "/reception/attendance", label: "Attendance", icon: ClipboardList },
];

export default function ReceptionLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => { setPendingHref(null); setMobileOpen(false); }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-50 bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-16 flex items-center gap-4">
          <Link href="/reception/dashboard" className="flex-shrink-0 mr-2">
            <Image src="/logo.png" alt="Global Gate" width={130} height={44} className="object-contain" />
          </Link>

          <nav className="hidden lg:flex items-center gap-1 flex-1">
            {navItems.map((item) => {
              const active = pendingHref
                ? pendingHref === item.href
                : (pathname === item.href || (item.href !== "/reception/dashboard" && item.href !== "/leads/new" && item.href !== "/reception/students" && item.href !== "/reception/attendance" && pathname.startsWith(item.href)));
              return (
                <Link key={item.href} href={item.href} onClick={() => setPendingHref(item.href)}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-150 whitespace-nowrap",
                    active ? "bg-blue-600 text-white shadow-sm" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}>
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2 ml-auto lg:ml-0">
            <NotificationBell />
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-gray-200">
              <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {user.name.charAt(0).toUpperCase()}
              </div>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-gray-800 leading-tight">{user.name}</p>
                <p className="text-xs text-gray-400">Reception</p>
              </div>
            </div>
            <button onClick={handleLogout} title="Sign out" className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
              <LogOut size={16} />
            </button>
            <button className="lg:hidden p-2 rounded-lg text-gray-600 hover:bg-gray-100" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="lg:hidden border-t border-gray-100 bg-white px-4 py-3 space-y-1 shadow-md">
            {navItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link key={item.href} href={item.href} onClick={() => { setPendingHref(item.href); setMobileOpen(false); }}
                  className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                    active ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-100")}>
                  <item.icon size={16} />{item.label}
                </Link>
              );
            })}
            <div className="pt-2 mt-2 border-t border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                  {user.name.charAt(0)}
                </div>
                <span className="text-sm text-gray-700">{user.name}</span>
              </div>
              <button onClick={handleLogout} className="text-xs text-red-500 hover:underline">Sign out</button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-screen-xl mx-auto px-4 sm:px-6 py-6">
        {children}
      </main>

      <Link href="/leads/new" className="fixed bottom-6 right-6 z-40 lg:hidden bg-blue-600 text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-blue-700 transition-colors">
        <UserPlus size={22} />
      </Link>
    </div>
  );
}

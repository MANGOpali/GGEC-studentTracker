"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LayoutDashboard, BookOpen, UserPlus, Calendar, LogOut, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import NotificationBell from "./NotificationBell";

const navItems = [
  { href: "/counsellor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/counsellor/leads", label: "My Leads", icon: BookOpen },
  { href: "/leads/new", label: "Add Lead", icon: UserPlus },
  { href: "/counsellor/followups", label: "Follow-ups", icon: Calendar },
];

export default function CounsellorLayout({
  children,
  user,
}: {
  children: React.ReactNode;
  user: { name: string; email: string };
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [pendingHref, setPendingHref] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    navItems.forEach((item) => router.prefetch(item.href));
  }, [router]);

  useEffect(() => { setPendingHref(null); }, [pathname]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 bg-[#0E356B] text-white transform transition-transform duration-200 lg:static lg:translate-x-0",
        sidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex items-center justify-between p-4 border-b border-blue-800">
          <div>
            <h1 className="text-lg font-bold">Global Gate</h1>
            <p className="text-xs text-blue-300">LeadFlow</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-blue-300 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <nav className="p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pendingHref ? pendingHref === item.href : pathname === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={() => { setPendingHref(item.href); setSidebarOpen(false); }}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
                  active ? "bg-white/20 text-white font-medium" : "text-blue-200 hover:bg-white/10 hover:text-white"
                )}>
                <Icon size={18} />{item.label}
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-blue-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-sm font-bold">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user.name}</p>
              <p className="text-xs text-blue-300">Counsellor</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}
            className="w-full text-blue-200 hover:text-white hover:bg-white/10 justify-start">
            <LogOut size={16} className="mr-2" />Sign out
          </Button>
        </div>
      </aside>

      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b px-4 py-3 flex items-center justify-between shadow-sm">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600 hover:text-gray-900">
            <Menu size={20} />
          </button>
          <div className="flex items-center gap-3 ml-auto">
            <NotificationBell />
            <Link href="/leads/new">
              <Button size="sm" className="hidden sm:flex">
                <UserPlus size={16} className="mr-1" />New Lead
              </Button>
            </Link>
          </div>
        </header>

        <main className="flex-1 p-4 lg:p-6">{children}</main>
      </div>

      <Link href="/leads/new" className="fixed bottom-6 right-6 z-40 sm:hidden bg-[#0E356B] text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg">
        <UserPlus size={22} />
      </Link>
    </div>
  );
}

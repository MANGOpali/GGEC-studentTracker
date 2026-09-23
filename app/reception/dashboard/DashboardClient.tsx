"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { UserPlus, BookOpen, Users, ClipboardList, Calendar, AlertCircle } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import StatusBadge from "@/components/leads/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

interface Lead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  status: string;
  createdAt: string;
  country: { name: string } | null;
}

const quickLinks = [
  { href: "/leads/new",             label: "Add Lead",   icon: UserPlus,     bg: "bg-blue-50 hover:bg-blue-100",    text: "text-blue-700",    border: "border-blue-200" },
  { href: "/reception/leads",       label: "My Leads",   icon: BookOpen,     bg: "bg-gray-50 hover:bg-gray-100",    text: "text-gray-700",    border: "border-gray-200" },
  { href: "/reception/students",    label: "Students",   icon: Users,        bg: "bg-emerald-50 hover:bg-emerald-100", text: "text-emerald-700", border: "border-emerald-200" },
  { href: "/reception/attendance",  label: "Attendance", icon: ClipboardList, bg: "bg-violet-50 hover:bg-violet-100", text: "text-violet-700",  border: "border-violet-200" },
];

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function ReceptionDashboardClient() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/dashboard/stats").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: leadsData, isLoading: leadsLoading } = useQuery({
    queryKey: ["reception-recent-leads"],
    queryFn: () => fetch("/api/leads?pageSize=6").then((r) => r.json()),
    staleTime: 30_000,
  });

  const recentLeads: Lead[] = leadsData?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}! 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">Here&apos;s your activity at a glance.</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {!stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            <KPICard title="Leads Created Today" value={stats.todaysLeads}        icon={UserPlus}     color="blue"   />
            <KPICard title="My Total Leads"       value={stats.totalLeads}         icon={BookOpen}     color="purple" />
            <KPICard title="Follow-ups Today"     value={stats.followUpsDueToday}  icon={Calendar}     color="amber"  />
            <KPICard title="Overdue"              value={stats.overdueFollowUps}   icon={AlertCircle}  color="red"    />
          </>
        )}
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {quickLinks.map(({ href, label, icon: Icon, bg, text, border }) => (
          <Link key={href} href={href}>
            <div className={`rounded-xl border ${border} ${bg} p-4 flex flex-col items-center gap-2 cursor-pointer transition-colors`}>
              <Icon size={22} className={text} />
              <span className={`text-sm font-medium ${text}`}>{label}</span>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Leads */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-base">Recent Leads</CardTitle>
          <Link href="/reception/leads" className="text-xs text-blue-600 hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="p-0">
          {leadsLoading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-lg" />)}
            </div>
          ) : recentLeads.length === 0 ? (
            <p className="text-sm text-gray-400 py-8 text-center">No leads yet</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {recentLeads.map((lead) => (
                <Link key={lead.id} href={`/leads/${lead.id}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{lead.studentName}</p>
                    <p className="text-xs text-gray-400">{lead.phone}{lead.country ? ` · ${lead.country.name}` : ""}</p>
                  </div>
                  <div className="text-right">
                    <StatusBadge status={lead.status} />
                    <p className="text-[10px] text-gray-400 mt-1">{formatDate(lead.createdAt)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

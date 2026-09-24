"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Calendar, Users, AlertCircle, CheckCircle, FileText, UserPlus } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import MyTasksWidget from "@/components/tasks/MyTasksWidget";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import StatusBadge from "@/components/leads/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateTime } from "@/lib/utils";

interface Lead {
  id: string;
  studentName: string;
  phone: string;
  status: string;
  nextFollowUpAt: string | null;
  country: { name: string } | null;
}

export default function CounsellorDashboardClient() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => fetch("/api/dashboard/stats").then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: leadsData } = useQuery({
    queryKey: ["my-leads-recent"],
    queryFn: () => fetch("/api/leads?pageSize=5").then((r) => r.json()),
    staleTime: 30_000,
  });

  const recentLeads: Lead[] = leadsData?.data ?? [];
  const followUps = recentLeads.filter((l) => l.nextFollowUpAt);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <Link href="/leads/new">
          <Button><UserPlus size={16} className="mr-1" />Add Lead</Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        {!stats ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <KPICard title="My Leads" value={stats.totalLeads} icon={Users} color="blue" />
            <KPICard title="New Leads" value={stats.newLeads} icon={UserPlus} color="purple" />
            <KPICard title="Follow-ups Today" value={stats.followUpsDueToday} icon={Calendar} color="amber" />
            <KPICard title="Overdue" value={stats.overdueFollowUps} icon={AlertCircle} color="red" />
            <KPICard title="Applications" value={stats.applications} icon={FileText} color="teal" />
            <KPICard title="Enrolled" value={stats.enrolled} icon={CheckCircle} color="green" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Follow-ups</CardTitle>
            <Link href="/counsellor/followups" className="text-xs text-[#0E356B] hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-32" />
            ) : followUps.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No upcoming follow-ups</p>
            ) : (
              <div className="space-y-3">
                {followUps.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                    <div>
                      <p className="text-sm font-medium">{lead.studentName}</p>
                      <p className="text-xs text-gray-500">{lead.country?.name ?? "—"} · {lead.phone}</p>
                    </div>
                    <div className="text-right">
                      <StatusBadge status={lead.status} />
                      {lead.nextFollowUpAt && (
                        <p className={`text-xs mt-1 ${new Date(lead.nextFollowUpAt) < new Date() ? "text-red-500" : "text-gray-500"}`}>
                          {formatDateTime(lead.nextFollowUpAt)}
                        </p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Leads</CardTitle>
            <Link href="/counsellor/leads" className="text-xs text-[#0E356B] hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {!stats ? (
              <Skeleton className="h-32" />
            ) : recentLeads.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No leads yet</p>
            ) : (
              <div className="space-y-3">
                {recentLeads.map((lead) => (
                  <Link key={lead.id} href={`/leads/${lead.id}`}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 border transition-colors">
                    <div>
                      <p className="text-sm font-medium">{lead.studentName}</p>
                      <p className="text-xs text-gray-500">{lead.country?.name ?? "—"} · {lead.phone}</p>
                    </div>
                    <StatusBadge status={lead.status} />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6">
        <MyTasksWidget />
      </div>
    </div>
  );
}

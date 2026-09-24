"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Calendar, Search } from "lucide-react";
import StatusBadge from "@/components/leads/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  status: string;
  nextFollowUpAt: string | null;
  country: { id: string; name: string } | null;
}

export default function FollowUpsClient() {
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["counsellor-followups"],
    queryFn: () => fetch("/api/leads?hasFollowup=1&pageSize=300").then((r) => r.json()),
    staleTime: 30_000,
  });

  const allLeads: Lead[] = data?.data ?? [];
  const q = search.toLowerCase();
  const leads = q
    ? allLeads.filter((l) =>
        l.studentName.toLowerCase().includes(q) ||
        l.phone.includes(q) ||
        l.leadId.toLowerCase().includes(q)
      )
    : allLeads;

  const now = new Date();
  const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
  const todayEnd   = new Date(now); todayEnd.setHours(23, 59, 59, 999);

  const overdue  = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < todayStart);
  const dueToday = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= todayStart && new Date(l.nextFollowUpAt) <= todayEnd);
  const upcoming = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) > todayEnd);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Follow-ups</h1>
          <p className="text-sm text-gray-500 mt-0.5">Your scheduled follow-ups</p>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            className="pl-8 h-9 w-48 text-sm"
            placeholder="Search student…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <Tabs defaultValue={overdue.length > 0 ? "overdue" : "today"}>
        <TabsList className="mb-5">
          <TabsTrigger value="overdue" className="gap-2">
            Overdue
            {!isLoading && overdue.length > 0 && (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{overdue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            Today
            {!isLoading && dueToday.length > 0 && (
              <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{dueToday.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="gap-2">
            Upcoming
            {!isLoading && upcoming.length > 0 && (
              <span className="bg-blue-500 text-white rounded-full px-1.5 py-0.5 text-[10px] font-bold">{upcoming.length}</span>
            )}
          </TabsTrigger>
        </TabsList>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
          </div>
        ) : (
          <>
            <TabsContent value="overdue">
              <LeadList leads={overdue} urgent emptyMsg="No overdue follow-ups" />
            </TabsContent>
            <TabsContent value="today">
              <LeadList leads={dueToday} emptyMsg="No follow-ups due today" />
            </TabsContent>
            <TabsContent value="upcoming">
              <LeadList leads={upcoming} emptyMsg="No upcoming follow-ups" />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}

function LeadList({ leads, urgent = false, emptyMsg }: { leads: Lead[]; urgent?: boolean; emptyMsg: string }) {
  if (leads.length === 0) {
    return (
      <div className="text-center py-14 text-gray-400">
        <Calendar size={32} className="mx-auto mb-2 opacity-20" />
        <p className="text-sm">{emptyMsg}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {leads.map((lead) => (
        <Link
          key={lead.id}
          href={`/leads/${lead.id}`}
          className={cn(
            "flex items-center justify-between px-4 py-3.5 rounded-xl border transition-colors hover:shadow-sm",
            urgent ? "border-red-200 bg-red-50 hover:bg-red-100/60" : "border-gray-200 bg-white hover:bg-gray-50"
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            {urgent
              ? <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              : <Calendar size={16} className="text-blue-400 flex-shrink-0" />}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-900 text-sm">{lead.studentName}</p>
                <span className="font-mono text-[10px] text-gray-400">{lead.leadId}</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                {lead.phone}{lead.country && <> · {lead.country.name}</>}
              </p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <StatusBadge status={lead.status} />
            <p className={cn("text-xs mt-1 font-medium", urgent ? "text-red-600" : "text-gray-400")}>
              {formatDateTime(lead.nextFollowUpAt)}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}

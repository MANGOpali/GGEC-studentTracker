"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertCircle, Calendar } from "lucide-react";
import StatusBadge from "@/components/leads/StatusBadge";
import { formatDate } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Lead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  status: string;
  nextFollowUpAt: string | null;
  country: { name: string };
}

export default function FollowUpsClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-leads-followups"],
    queryFn: () => fetch("/api/leads?pageSize=100").then((r) => r.json()),
    staleTime: 30_000,
  });

  const leads: Lead[] = data?.data ?? [];

  const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
  const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

  const overdue = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) < todayStart);
  const dueToday = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) >= todayStart && new Date(l.nextFollowUpAt) <= todayEnd);
  const upcoming = leads.filter((l) => l.nextFollowUpAt && new Date(l.nextFollowUpAt) > todayEnd);

  function LeadCard({ lead, urgent = false }: { lead: Lead; urgent?: boolean }) {
    return (
      <Link href={`/leads/${lead.id}`}
        className={`flex items-center justify-between p-4 rounded-lg border hover:bg-gray-50 transition-colors ${urgent ? "border-red-200 bg-red-50" : ""}`}>
        <div className="flex items-center gap-3">
          {urgent
            ? <AlertCircle size={18} className="text-red-500 flex-shrink-0" />
            : <Calendar size={18} className="text-blue-500 flex-shrink-0" />}
          <div>
            <p className="font-medium text-gray-900">{lead.studentName}</p>
            <p className="text-sm text-gray-500">{lead.country.name} · {lead.phone}</p>
          </div>
        </div>
        <div className="text-right">
          <StatusBadge status={lead.status} />
          <p className={`text-xs mt-1 ${urgent ? "text-red-600 font-medium" : "text-gray-500"}`}>
            {formatDate(lead.nextFollowUpAt)}
          </p>
        </div>
      </Link>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Follow-ups</h1>
      <Tabs defaultValue="overdue">
        <TabsList className="mb-6">
          <TabsTrigger value="overdue" className="gap-2">
            Overdue
            {!isLoading && overdue.length > 0 && (
              <span className="bg-red-500 text-white rounded-full px-1.5 py-0.5 text-xs">{overdue.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="today" className="gap-2">
            Due Today
            {!isLoading && dueToday.length > 0 && (
              <span className="bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-xs">{dueToday.length}</span>
            )}
          </TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>

        <TabsContent value="overdue">
          {isLoading ? <Skeleton className="h-24" /> : overdue.length === 0
            ? <p className="text-center text-gray-400 py-12">No overdue follow-ups</p>
            : <div className="space-y-3">{overdue.map((l) => <LeadCard key={l.id} lead={l} urgent />)}</div>}
        </TabsContent>
        <TabsContent value="today">
          {isLoading ? <Skeleton className="h-24" /> : dueToday.length === 0
            ? <p className="text-center text-gray-400 py-12">No follow-ups due today</p>
            : <div className="space-y-3">{dueToday.map((l) => <LeadCard key={l.id} lead={l} />)}</div>}
        </TabsContent>
        <TabsContent value="upcoming">
          {isLoading ? <Skeleton className="h-24" /> : upcoming.length === 0
            ? <p className="text-center text-gray-400 py-12">No upcoming follow-ups</p>
            : <div className="space-y-3">{upcoming.map((l) => <LeadCard key={l.id} lead={l} />)}</div>}
        </TabsContent>
      </Tabs>
    </div>
  );
}

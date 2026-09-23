"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, X, ChevronLeft, ChevronRight, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/leads/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS, STATUS_LABELS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Student {
  id: string; leadId: string; studentName: string; phone: string;
  status: string; leadType: string; createdAt: string;
  nextFollowUpAt: string | null;
  source: { name: string };
}

const CLASS_STATUSES = ["NEW","CONTACTED","FOLLOW_UP","DEMO_SCHEDULED","DEMO_ATTENDED","IN_CLASS","COMPLETED","DROPPED","NOT_INTERESTED","NO_RESPONSE","CLOSED","CONFIRMED","RESCHEDULED","NO_SHOW"];

export default function StudentsClient() {
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState("");
  const [debounced, setDebounced] = useState("");
  const [status, setStatus]       = useState("");

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debounced, status]);

  const params = new URLSearchParams({ page: String(page), pageSize: "20" });
  if (debounced) params.set("search", debounced);
  if (status)    params.set("status", status);

  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students", page, debounced, status],
    queryFn: () => fetch(`/api/leads?${params}`).then((r) => r.json()),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const students: Student[] = data?.data ?? [];
  const total: number       = data?.total ?? 0;
  const totalPages: number  = data?.totalPages ?? 1;
  const hasFilters          = search || status;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} students assigned to you</p>
        </div>
        <Link href="/leads/new"><Button size="sm">+ Add Lead</Button></Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-gray-50" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        <Select value={status} onValueChange={(v) => setStatus(v === "all" ? "" : v)}>
          <SelectTrigger className="w-40 h-10 text-sm bg-gray-50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {CLASS_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>)}
          </SelectContent>
        </Select>
        {hasFilters && <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStatus(""); }} className="text-gray-500"><X size={14} />Clear</Button>}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {["Lead ID", "Student", "Phone", "Type", "Status", "Added", ""].map((h) => (
                  <th key={h} className={cn("px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider", h === "" ? "" : "text-left")}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 7 }).map((__, j) => <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-14 text-gray-400">
                  <Search size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium">{hasFilters ? "No students match your filters" : "No students assigned yet"}</p>
                </td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md">{s.leadId}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{s.studentName}</div>
                    </td>
                    <td className="px-5 py-3.5 text-gray-500 text-sm">{s.phone}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", LEAD_TYPE_COLORS[s.leadType] ?? "bg-gray-100 text-gray-600")}>
                        {LEAD_TYPE_LABELS[s.leadType] ?? s.leadType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><StatusBadge status={s.status} /></td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">{formatDate(s.createdAt)}</td>
                    <td className="px-5 py-3.5">
                      <Link href={`/leads/${s.id}`}>
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
                          View <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-sm text-gray-500">
            {total === 0 ? "0" : `${((page - 1) * 20 + 1)}–${Math.min(page * 20, total)}`} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={15} /></Button>
            <span className="text-sm text-gray-600 px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-8 w-8 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={15} /></Button>
          </div>
        </div>
      </div>
    </div>
  );
}

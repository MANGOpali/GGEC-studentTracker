"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, Download, ChevronLeft, ChevronRight, ArrowRight, X, SlidersHorizontal, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import StatusBadge from "@/components/leads/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate, ALL_STATUSES, STATUS_LABELS, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Lead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  educationLevel: string;
  status: string;
  leadType: string;
  createdAt: string;
  nextFollowUpAt: string | null;
  country: { name: string } | null;
  source: { name: string };
  branch: { name: string } | null;
  assignedCounsellor: { id: string; name: string } | null;
  teacherId: string | null;
  teacher: { id: string; name: string } | null;
  classType: string | null;
  studentStatus: string | null;
}

interface Filters {
  status: string;
  leadType: string;
  countryId: string;
  sourceId: string;
  counsellorId: string;
  branchId: string;
}

const fetchRef = () => fetch("/api/reference").then((r) => r.json());

const TYPE_DOT: Record<string, string> = {
  STUDY_ABROAD: "bg-blue-500",
  IELTS_CLASS:  "bg-violet-500",
  PTE_CLASS:    "bg-orange-500",
  DATE_BOOKING: "bg-teal-500",
};

// Inline teacher assign cell with popover
function TeacherCell({ lead, teachers, onAssign }: {
  lead: Lead;
  teachers: { id: string; name: string }[];
  onAssign: (leadId: string, teacherId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-colors",
          lead.teacher
            ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
            : "text-gray-400 border border-dashed border-gray-300 hover:border-blue-400 hover:text-blue-500"
        )}
      >
        {lead.teacher ? (
          <>
            <div className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">
              {lead.teacher.name.charAt(0)}
            </div>
            <span className="max-w-[80px] truncate">{lead.teacher.name}</span>
          </>
        ) : (
          <>
            <UserPlus size={12} />
            <span>Assign</span>
          </>
        )}
      </button>

      {open && (
        <div className="absolute z-50 top-full mt-1 left-0 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px]">
          <button
            className="w-full text-left px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50"
            onClick={() => { onAssign(lead.id, ""); setOpen(false); }}
          >
            No teacher
          </button>
          {teachers.map((t) => (
            <button
              key={t.id}
              className={cn(
                "w-full text-left px-3 py-1.5 text-xs hover:bg-blue-50 flex items-center gap-2",
                lead.teacherId === t.id ? "text-emerald-700 font-medium" : "text-gray-700"
              )}
              onClick={() => { onAssign(lead.id, t.id); setOpen(false); }}
            >
              <div className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                {t.name.charAt(0)}
              </div>
              {t.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function LeadListClient() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ status: "", leadType: "", countryId: "", sourceId: "", counsellorId: "", branchId: "" });
  const [showFilters, setShowFilters] = useState(false);

  const { data: refData } = useQuery({ queryKey: ["reference"], queryFn: fetchRef, staleTime: 10 * 60_000 });

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debouncedSearch, filters]);

  const leadsParams = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  if (debouncedSearch) leadsParams.set("search", debouncedSearch);
  Object.entries(filters).forEach(([k, v]) => { if (v) leadsParams.set(k, v); });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ["leads", page, pageSize, debouncedSearch, filters],
    queryFn: () => fetch(`/api/leads?${leadsParams}`).then((r) => r.json()),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const leads: Lead[] = leadsData?.data ?? [];
  const total: number = leadsData?.total ?? 0;
  const totalPages: number = leadsData?.totalPages ?? 1;
  const teachers: { id: string; name: string }[] = refData?.teachers ?? [];

  function handleExport() {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.open(`/api/leads/export?${params}`, "_blank");
  }

  async function assignTeacher(leadId: string, teacherId: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ teacherId }),
    });
    queryClient.invalidateQueries({ queryKey: ["leads"] });
  }

  function clearFilters() {
    setFilters({ status: "", leadType: "", countryId: "", sourceId: "", counsellorId: "", branchId: "" });
    setSearch("");
  }

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const hasFilters = activeFilterCount > 0 || !!search;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isLoading ? "Loading…" : `${total.toLocaleString()} total`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport} className="hidden sm:flex gap-1.5">
            <Download size={14} />CSV
          </Button>
          <Link href="/leads/new">
            <Button size="sm">+ New Lead</Button>
          </Link>
        </div>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-3 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Search name, phone, email, Lead ID…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 bg-gray-50 border-gray-200 focus:bg-white text-sm"
            />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={13} />
              </button>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn("gap-1.5 h-9 shrink-0", showFilters && "bg-blue-50 border-blue-300 text-blue-700")}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-blue-500 text-white text-[10px] flex items-center justify-center font-semibold">
                {activeFilterCount}
              </span>
            )}
          </Button>
          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500 h-9 shrink-0">
              <X size={13} />Clear
            </Button>
          )}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2 pt-2 border-t border-gray-100">
            {[
              { key: "leadType",    placeholder: "All Types",      options: Object.entries(LEAD_TYPE_LABELS).map(([k, v]) => ({ value: k, label: v })) },
              { key: "status",      placeholder: "All Statuses",   options: ALL_STATUSES.map((s) => ({ value: s, label: STATUS_LABELS[s] })) },
              { key: "countryId",   placeholder: "All Countries",  options: (refData?.countries ?? []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })) },
              { key: "sourceId",    placeholder: "All Sources",    options: (refData?.sources   ?? []).map((s: { id: string; name: string }) => ({ value: s.id, label: s.name })) },
              { key: "counsellorId",placeholder: "All Counsellors",options: (refData?.counsellors ?? []).map((c: { id: string; name: string }) => ({ value: c.id, label: c.name })) },
              { key: "branchId",    placeholder: "All Branches",   options: (refData?.branches  ?? []).map((b: { id: string; name: string }) => ({ value: b.id, label: b.name })) },
            ].map(({ key, placeholder, options }) => (
              <Select key={key} value={filters[key as keyof Filters]} onValueChange={(v) => setFilters((f) => ({ ...f, [key]: v === "all" ? "" : v }))}>
                <SelectTrigger className="h-8 text-xs bg-gray-50"><SelectValue placeholder={placeholder} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{placeholder}</SelectItem>
                  {options.map((o: { value: string; label: string }) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">Lead</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Counsellor</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Teacher</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden xl:table-cell">Added</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 7 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-16 text-gray-400">
                    <Search size={30} className="mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No leads found</p>
                    {hasFilters && <p className="text-xs mt-1">Try adjusting your filters</p>}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="hover:bg-blue-50/30 transition-colors group">
                    {/* Lead ID + Type */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0 mt-0.5", TYPE_DOT[lead.leadType] ?? "bg-gray-400")} />
                        <div>
                          <span className="font-mono text-xs font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-md whitespace-nowrap">
                            {lead.leadId}
                          </span>
                          <div className="mt-1">
                            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", LEAD_TYPE_COLORS[lead.leadType] ?? "bg-gray-100 text-gray-600")}>
                              {LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>
                    {/* Student */}
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900 leading-tight">{lead.studentName}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{lead.phone}</div>
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    {/* Counsellor */}
                    <td className="px-4 py-3 hidden md:table-cell">
                      {lead.assignedCounsellor ? (
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">
                            {lead.assignedCounsellor.name.charAt(0).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-700 max-w-[90px] truncate">{lead.assignedCounsellor.name}</span>
                        </div>
                      ) : (
                        <span className="text-gray-300 text-xs">—</span>
                      )}
                    </td>
                    {/* Teacher (inline assign) */}
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <TeacherCell lead={lead} teachers={teachers} onAssign={assignTeacher} />
                    </td>
                    {/* Date */}
                    <td className="px-4 py-3 hidden xl:table-cell text-gray-400 text-xs whitespace-nowrap">
                      {formatDate(lead.createdAt)}
                    </td>
                    {/* View */}
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`}>
                        <button className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors whitespace-nowrap">
                          View <ArrowRight size={12} className="group-hover:translate-x-0.5 transition-transform" />
                        </button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span className="hidden sm:inline">Show</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-7 w-16 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span className="hidden sm:inline text-xs">
              {total === 0 ? "0" : `${((page - 1) * pageSize + 1).toLocaleString()}–${Math.min(page * pageSize, total).toLocaleString()}`} of {total.toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={14} />
            </Button>
            <span className="text-xs text-gray-600 px-2 tabular-nums">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={14} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

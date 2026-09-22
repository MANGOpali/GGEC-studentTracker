"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, Filter, Download, ChevronLeft, ChevronRight, Eye } from "lucide-react";
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
  assignedCounsellor: { name: string } | null;
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

export default function LeadListClient() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filters, setFilters] = useState<Filters>({ status: "", leadType: "", countryId: "", sourceId: "", counsellorId: "", branchId: "" });
  const [showFilters, setShowFilters] = useState(false);

  // Reference data: cached for 10 minutes — almost never changes
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
    placeholderData: (prev) => prev, // keep old data while fetching next page
  });

  const leads: Lead[] = leadsData?.data ?? [];
  const total: number = leadsData?.total ?? 0;
  const totalPages: number = leadsData?.totalPages ?? 1;

  function handleExport() {
    const params = new URLSearchParams();
    if (debouncedSearch) params.set("search", debouncedSearch);
    Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
    window.open(`/api/leads/export?${params}`, "_blank");
  }

  function clearFilters() {
    setFilters({ status: "", leadType: "", countryId: "", sourceId: "", counsellorId: "", branchId: "" });
    setSearch("");
  }

  const hasFilters = Object.values(filters).some(Boolean) || search;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">All Leads</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} total leads</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={16} className="mr-1" />Export CSV
          </Button>
          <Link href="/leads/new"><Button size="sm">+ New Lead</Button></Link>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl border p-4 mb-4 space-y-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <Input placeholder="Search by name, phone, email, or Lead ID..." value={search}
              onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)}
            className={showFilters ? "bg-blue-50 border-blue-200 text-blue-700" : ""}>
            <Filter size={16} className="mr-1" />Filters
            {hasFilters && <span className="ml-1 w-2 h-2 rounded-full bg-blue-500 inline-block" />}
          </Button>
          {hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
        </div>

        {showFilters && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 border-t">
            <Select value={filters.leadType} onValueChange={(v) => setFilters((f) => ({ ...f, leadType: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Types" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {Object.entries(LEAD_TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.status} onValueChange={(v) => setFilters((f) => ({ ...f, status: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Statuses" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.countryId} onValueChange={(v) => setFilters((f) => ({ ...f, countryId: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Countries" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Countries</SelectItem>
                {refData?.countries?.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.sourceId} onValueChange={(v) => setFilters((f) => ({ ...f, sourceId: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Sources" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sources</SelectItem>
                {refData?.sources?.map((s: { id: string; name: string }) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.counsellorId} onValueChange={(v) => setFilters((f) => ({ ...f, counsellorId: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Counsellors" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Counsellors</SelectItem>
                {refData?.counsellors?.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={filters.branchId} onValueChange={(v) => setFilters((f) => ({ ...f, branchId: v === "all" ? "" : v }))}>
              <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="All Branches" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Branches</SelectItem>
                {refData?.branches?.map((b: { id: string; name: string }) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="text-left px-4 py-3 font-medium text-gray-600 whitespace-nowrap">Lead ID</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden sm:table-cell">Phone</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Country / Test</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden xl:table-cell">Counsellor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Created</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    {Array.from({ length: 9 }).map((__, j) => (
                      <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    No leads found{hasFilters ? " matching your filters" : ""}
                  </td>
                </tr>
              ) : (
                leads.map((lead) => (
                  <tr key={lead.id} className="border-b hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs text-[#0E356B] whitespace-nowrap">{lead.leadId}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{lead.studentName}</div>
                      <div className="text-xs text-gray-500 sm:hidden">{lead.phone}</div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell text-gray-600">{lead.phone}</td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <span className={cn("px-2 py-0.5 rounded-full text-xs font-medium", LEAD_TYPE_COLORS[lead.leadType] ?? "bg-gray-100 text-gray-700")}>
                        {LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-600">
                      {lead.country?.name ?? LEAD_TYPE_LABELS[lead.leadType] ?? "—"}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={lead.status} /></td>
                    <td className="px-4 py-3 hidden xl:table-cell text-gray-600">
                      {lead.assignedCounsellor?.name ?? <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell text-gray-500 whitespace-nowrap">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Link href={`/leads/${lead.id}`}>
                        <Button variant="ghost" size="sm" className="h-8 px-2">
                          <Eye size={14} className="mr-1" />View
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Show</span>
            <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
              <SelectTrigger className="h-8 w-20"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[20, 50, 100].map((n) => <SelectItem key={n} value={String(n)}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
            <span>per page · {total === 0 ? 0 : ((page - 1) * pageSize + 1).toLocaleString()}–{Math.min(page * pageSize, total).toLocaleString()} of {total.toLocaleString()}</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft size={16} />
            </Button>
            <span className="text-sm px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, ChevronLeft, ChevronRight, Phone, MessageSquare, Clock } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { formatDate, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Student {
  id: string; leadId: string; studentName: string; phone: string;
  status: string; leadType: string; createdAt: string;
  nextFollowUpAt: string | null;
  classType: string | null;
  studentStatus: string | null;
  teacher: { id: string; name: string } | null;
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
  source: { name: string };
}

const STATUS_COLORS: Record<string, string> = {
  TRIAL:    "bg-yellow-100 text-yellow-700 border-yellow-200",
  ACTIVE:   "bg-green-100 text-green-700 border-green-200",
  HOLD:     "bg-gray-100 text-gray-600 border-gray-200",
  COMPLETE: "bg-blue-100 text-blue-700 border-blue-200",
  DROPPED:  "bg-red-100 text-red-600 border-red-200",
};
const STATUS_LABELS: Record<string, string> = {
  TRIAL: "Trial", ACTIVE: "Active", HOLD: "Hold", COMPLETE: "Complete", DROPPED: "Dropped",
};
const STATUS_OPTIONS = Object.entries(STATUS_LABELS).map(([value, label]) => ({ value, label }));

function StatusPill({ value, onChange }: { value: string | null; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn("text-[11px] font-medium px-2.5 py-1 rounded-full border transition-colors", value ? STATUS_COLORS[value] : "bg-gray-50 text-gray-400 border-dashed border-gray-300 hover:border-gray-400")}
      >
        {value ? STATUS_LABELS[value] : "Set status"}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[120px]">
          <button onClick={() => { onChange(""); setOpen(false); }} className="w-full text-left px-3 py-1.5 text-xs text-gray-400 hover:bg-gray-50">Not set</button>
          {STATUS_OPTIONS.map((opt) => (
            <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); }}
              className={cn("w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50", value === opt.value ? "font-semibold text-gray-900" : "text-gray-700")}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function StudentsClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");
  const [shiftFilter, setShiftFilter] = useState("");

  const [followUpLead, setFollowUpLead] = useState<Student | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  useEffect(() => { const t = setTimeout(() => setDebounced(search), 400); return () => clearTimeout(t); }, [search]);
  useEffect(() => { setPage(1); }, [debounced, studentStatusFilter, leadTypeFilter, shiftFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: "20", classLeads: "1" });
  if (debounced) params.set("search", debounced);
  if (leadTypeFilter) params.set("leadType", leadTypeFilter);

  const { data: refData } = useQuery({ queryKey: ["reference"], queryFn: () => fetch("/api/reference").then((r) => r.json()), staleTime: 600_000 });

  const { data, isLoading } = useQuery({
    queryKey: ["reception-students", page, debounced, studentStatusFilter, leadTypeFilter, shiftFilter],
    queryFn: () => fetch(`/api/leads?${params}`).then((r) => r.json()),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const allStudents: Student[] = data?.data ?? [];
  const students = allStudents.filter((s) => {
    if (studentStatusFilter && s.studentStatus !== studentStatusFilter) return false;
    if (shiftFilter && s.shift?.id !== shiftFilter) return false;
    return true;
  });
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;
  const hasFilters = search || studentStatusFilter || leadTypeFilter || shiftFilter;

  async function updateField(leadId: string, field: string, value: string) {
    await fetch(`/api/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    queryClient.invalidateQueries({ queryKey: ["reception-students"] });
  }

  async function saveFollowUp() {
    if (!followUpLead || !followUpDate) return;
    setSavingFollowUp(true);
    try {
      await fetch(`/api/leads/${followUpLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUpAt: followUpDate, followUpNotes: followUpNote }),
      });
      queryClient.invalidateQueries({ queryKey: ["reception-students"] });
      toast({ title: "Follow-up scheduled" });
      setFollowUpLead(null); setFollowUpDate(""); setFollowUpNote("");
    } finally { setSavingFollowUp(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total} class students</p>
        </div>
        <Link href="/leads/new"><Button size="sm">+ Add Lead</Button></Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8 h-9 text-sm bg-white" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={13} /></button>}
        </div>
        <Select value={leadTypeFilter} onValueChange={(v) => setLeadTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm w-32 bg-white"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="IELTS_CLASS">IELTS</SelectItem>
            <SelectItem value="PTE_CLASS">PTE</SelectItem>
            <SelectItem value="DATE_BOOKING">Date Booking</SelectItem>
          </SelectContent>
        </Select>
        <Select value={studentStatusFilter} onValueChange={(v) => setStudentStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm w-32 bg-white"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={shiftFilter} onValueChange={(v) => setShiftFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="h-9 text-sm w-32 bg-white"><SelectValue placeholder="All Shifts" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Shifts</SelectItem>
            {(refData?.shifts ?? []).map((s: { id: string; name: string }) => (
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setStudentStatusFilter(""); setLeadTypeFilter(""); setShiftFilter(""); }} className="text-gray-500 h-9">
            <X size={13} className="mr-1" />Clear
          </Button>
        )}
      </div>

      {/* Card list */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="divide-y">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <Skeleton className="w-9 h-9 rounded-full flex-shrink-0" />
                <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-28" /></div>
                <Skeleton className="h-6 w-16 rounded-full" />
                <Skeleton className="h-3 w-24 hidden sm:block" />
              </div>
            ))}
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-14 text-gray-400">
            <Search size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm font-medium">{hasFilters ? "No students match" : "No class students yet"}</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {students.map((s) => {
              const overdue = s.nextFollowUpAt && new Date(s.nextFollowUpAt) < new Date();
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors">
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full bg-blue-100 text-blue-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                    {s.studentName.charAt(0).toUpperCase()}
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold text-gray-900 text-sm">{s.studentName}</span>
                      <span className="text-[10px] font-mono text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{s.leadId}</span>
                      <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full", LEAD_TYPE_COLORS[s.leadType] ?? "bg-gray-100 text-gray-600")}>
                        {LEAD_TYPE_LABELS[s.leadType] ?? s.leadType}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      {s.shift && (
                        <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                          <Clock size={9} />{s.shift.startTime}–{s.shift.endTime}
                        </span>
                      )}
                      {s.teacher && <span className="text-[10px] text-gray-400">{s.teacher.name}</span>}
                      {s.nextFollowUpAt && (
                        <span className={cn("text-[10px]", overdue ? "text-red-500 font-medium" : "text-gray-400")}>
                          {overdue ? "⚠ " : ""}Follow-up {formatDate(s.nextFollowUpAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Status pill */}
                  <StatusPill value={s.studentStatus} onChange={(v) => updateField(s.id, "studentStatus", v)} />

                  {/* Phone */}
                  <a href={`tel:${s.phone}`} className="hidden sm:flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 flex-shrink-0">
                    <Phone size={12} />{s.phone}
                  </a>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 flex-shrink-0">
                    <button
                      onClick={() => { setFollowUpLead(s); setFollowUpDate(""); setFollowUpNote(""); }}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Schedule follow-up"
                    >
                      <MessageSquare size={14} />
                    </button>
                    <Link href={`/leads/${s.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500 hover:text-blue-600">View</Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
          <span className="text-xs text-gray-500">
            {total === 0 ? "0" : `${(page - 1) * 20 + 1}–${Math.min(page * 20, total)}`} of {total}
          </span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page === 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft size={14} /></Button>
            <span className="text-xs text-gray-500 px-2">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" className="h-7 w-7 p-0" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}><ChevronRight size={14} /></Button>
          </div>
        </div>
      </div>

      {/* Follow-up dialog */}
      <Dialog open={!!followUpLead} onOpenChange={(o) => { if (!o) setFollowUpLead(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up — {followUpLead?.studentName}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Follow-up Date</Label>
              <input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="space-y-1.5">
              <Label>Note (optional)</Label>
              <Textarea value={followUpNote} onChange={(e) => setFollowUpNote(e.target.value)} placeholder="Add a note…" rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFollowUpLead(null)}>Cancel</Button>
            <Button onClick={saveFollowUp} disabled={savingFollowUp || !followUpDate}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

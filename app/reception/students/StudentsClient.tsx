"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Search, X, ChevronLeft, ChevronRight, Phone, MessageSquare, ArrowRight } from "lucide-react";
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
  source: { name: string };
}

const CLASS_TYPE_COLORS: Record<string, string> = {
  PHYSICAL: "bg-blue-100 text-blue-700",
  ONLINE: "bg-purple-100 text-purple-700",
  CRASH_COURSE: "bg-orange-100 text-orange-700",
};
const STUDENT_STATUS_COLORS: Record<string, string> = {
  TRIAL: "bg-yellow-100 text-yellow-700",
  ACTIVE: "bg-green-100 text-green-700",
  HOLD: "bg-gray-100 text-gray-600",
  COMPLETE: "bg-blue-100 text-blue-700",
  DROPPED: "bg-red-100 text-red-600",
};

export default function StudentsClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [classTypeFilter, setClassTypeFilter] = useState("");
  const [studentStatusFilter, setStudentStatusFilter] = useState("");
  const [leadTypeFilter, setLeadTypeFilter] = useState("");

  const [followUpLead, setFollowUpLead] = useState<Student | null>(null);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNote, setFollowUpNote] = useState("");
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => { setPage(1); }, [debounced, classTypeFilter, studentStatusFilter, leadTypeFilter]);

  const params = new URLSearchParams({ page: String(page), pageSize: "20", classLeads: "1" });
  if (debounced) params.set("search", debounced);
  if (leadTypeFilter) params.set("leadType", leadTypeFilter);

  const { data, isLoading } = useQuery({
    queryKey: ["reception-students", page, debounced, classTypeFilter, studentStatusFilter, leadTypeFilter],
    queryFn: () => fetch(`/api/leads?${params}`).then((r) => r.json()),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  });

  const allStudents: Student[] = data?.data ?? [];
  const students = allStudents.filter((s) => {
    if (classTypeFilter && s.classType !== classTypeFilter) return false;
    if (studentStatusFilter && s.studentStatus !== studentStatusFilter) return false;
    return true;
  });
  const total: number = data?.total ?? 0;
  const totalPages: number = data?.totalPages ?? 1;
  const hasFilters = search || classTypeFilter || studentStatusFilter || leadTypeFilter;

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
      setFollowUpLead(null);
      setFollowUpDate("");
      setFollowUpNote("");
    } finally {
      setSavingFollowUp(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Students</h1>
          <p className="text-sm text-gray-500 mt-0.5">{total.toLocaleString()} class students</p>
        </div>
        <Link href="/leads/new"><Button size="sm">+ Add Lead</Button></Link>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input placeholder="Search name or phone…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 bg-gray-50" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"><X size={14} /></button>}
        </div>
        <Select value={leadTypeFilter} onValueChange={(v) => setLeadTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-10 text-sm bg-gray-50"><SelectValue placeholder="All Classes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Classes</SelectItem>
            <SelectItem value="IELTS_CLASS">IELTS Class</SelectItem>
            <SelectItem value="PTE_CLASS">PTE Class</SelectItem>
            <SelectItem value="DATE_BOOKING">Date Booking</SelectItem>
          </SelectContent>
        </Select>
        <Select value={classTypeFilter} onValueChange={(v) => setClassTypeFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-10 text-sm bg-gray-50"><SelectValue placeholder="All Modes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Modes</SelectItem>
            <SelectItem value="PHYSICAL">Physical</SelectItem>
            <SelectItem value="ONLINE">Online</SelectItem>
            <SelectItem value="CRASH_COURSE">Crash Course</SelectItem>
          </SelectContent>
        </Select>
        <Select value={studentStatusFilter} onValueChange={(v) => setStudentStatusFilter(v === "all" ? "" : v)}>
          <SelectTrigger className="w-36 h-10 text-sm bg-gray-50"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="TRIAL">Trial</SelectItem>
            <SelectItem value="ACTIVE">Active</SelectItem>
            <SelectItem value="HOLD">Hold</SelectItem>
            <SelectItem value="COMPLETE">Complete</SelectItem>
            <SelectItem value="DROPPED">Dropped</SelectItem>
          </SelectContent>
        </Select>
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={() => { setSearch(""); setClassTypeFilter(""); setStudentStatusFilter(""); setLeadTypeFilter(""); }} className="text-gray-500">
            <X size={14} />Clear
          </Button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Phone</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden md:table-cell">Class</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Mode</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Teacher</th>
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider hidden lg:table-cell">Follow-up</th>
                <th className="px-5 py-3.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>{Array.from({ length: 8 }).map((__, j) => <td key={j} className="px-5 py-3.5"><Skeleton className="h-4 w-full" /></td>)}</tr>
                ))
              ) : students.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-14 text-gray-400">
                  <Search size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="font-medium">{hasFilters ? "No students match" : "No class students yet"}</p>
                </td></tr>
              ) : (
                students.map((s) => (
                  <tr key={s.id} className="hover:bg-blue-50/40 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="font-semibold text-gray-900">{s.studentName}</div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">{s.leadId}</div>
                    </td>
                    <td className="px-5 py-3.5">
                      <a href={`tel:${s.phone}`} className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 font-medium text-sm">
                        <Phone size={13} />{s.phone}
                      </a>
                    </td>
                    <td className="px-5 py-3.5 hidden md:table-cell">
                      <span className={cn("px-2.5 py-1 rounded-full text-xs font-medium", LEAD_TYPE_COLORS[s.leadType] ?? "bg-gray-100 text-gray-600")}>
                        {LEAD_TYPE_LABELS[s.leadType] ?? s.leadType}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select value={s.classType ?? ""} onValueChange={(v) => updateField(s.id, "classType", v)}>
                        <SelectTrigger className={cn("h-7 w-32 text-xs", s.classType ? "border-0 font-medium " + (CLASS_TYPE_COLORS[s.classType] ?? "") : "border-dashed text-gray-400")}>
                          <SelectValue placeholder="Set mode" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Not set</SelectItem>
                          <SelectItem value="PHYSICAL">Physical</SelectItem>
                          <SelectItem value="ONLINE">Online</SelectItem>
                          <SelectItem value="CRASH_COURSE">Crash Course</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5">
                      <Select value={s.studentStatus ?? ""} onValueChange={(v) => updateField(s.id, "studentStatus", v)}>
                        <SelectTrigger className={cn("h-7 w-28 text-xs", s.studentStatus ? "border-0 font-medium " + (STUDENT_STATUS_COLORS[s.studentStatus] ?? "") : "border-dashed text-gray-400")}>
                          <SelectValue placeholder="Set status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Not set</SelectItem>
                          <SelectItem value="TRIAL">Trial</SelectItem>
                          <SelectItem value="ACTIVE">Active</SelectItem>
                          <SelectItem value="HOLD">Hold</SelectItem>
                          <SelectItem value="COMPLETE">Complete</SelectItem>
                          <SelectItem value="DROPPED">Dropped</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {s.teacher ? (
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {s.teacher.name.charAt(0)}
                          </div>
                          <span className="text-sm text-gray-700">{s.teacher.name}</span>
                        </div>
                      ) : <span className="text-gray-400 text-sm">—</span>}
                    </td>
                    <td className="px-5 py-3.5 hidden lg:table-cell">
                      {s.nextFollowUpAt ? (
                        <span className={cn("text-xs font-medium", new Date(s.nextFollowUpAt) < new Date() ? "text-red-500" : "text-gray-500")}>
                          {formatDate(s.nextFollowUpAt)}
                        </span>
                      ) : <span className="text-gray-300 text-xs">—</span>}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setFollowUpLead(s); setFollowUpDate(""); setFollowUpNote(""); }}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Schedule follow-up"
                        >
                          <MessageSquare size={14} />
                        </button>
                        <Link href={`/leads/${s.id}`}>
                          <button className="flex items-center gap-1 text-xs font-medium text-gray-400 group-hover:text-blue-600 transition-colors">
                            View <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                          </button>
                        </Link>
                      </div>
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

      <Dialog open={!!followUpLead} onOpenChange={(o) => { if (!o) setFollowUpLead(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule Follow-up — {followUpLead?.studentName}</DialogTitle>
          </DialogHeader>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import {
  ArrowLeft, Calendar, MessageSquare, CheckCircle, AlertCircle, Pencil,
  Phone, Mail, GraduationCap, Globe, BookOpen, User, Building2, Zap,
  Clock, UserCheck, MapPin, Tag, FileText, MoreHorizontal, GraduationCap as TeacherIcon,
  DollarSign, Loader2, Plus
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/leads/StatusBadge";
import FeeSection from "@/components/leads/FeeSection";
import TasksSection from "@/components/leads/TasksSection";
import { formatDate, formatDateTime, formatRelative, STATUS_LABELS, LEAD_TYPE_LABELS, LEAD_TYPE_COLORS, STATUSES_BY_TYPE, EDUCATION_LEVELS } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Lead {
  id: string; leadId: string; studentName: string; phone: string;
  email: string | null; educationLevel: string; status: string; leadType: string;
  bookingDate: string | null; course: string | null; notes: string | null;
  followUpNotes: string | null; referredBy: string | null;
  nextFollowUpAt: string | null; lastContactedAt: string | null;
  createdAt: string; updatedAt: string;
  academicInfo: Record<string, string> | null; englishTest: Record<string, string> | null;
  country: { id: string; name: string } | null;
  source: { id: string; name: string };
  intake: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  assignedCounsellor: { id: string; name: string; email: string } | null;
  teacher: { id: string; name: string } | null;
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
  createdBy: { id: string; name: string };
  activities: Array<{
    id: string; action: string; metadata: Record<string, unknown> | null;
    createdAt: string; user: { id: string; name: string; role: string };
  }>;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_LEAD: "Created lead", UPDATE_LEAD: "Updated lead",
  ASSIGN_LEAD: "Assigned lead", CHANGE_STATUS: "Changed status",
  ADD_NOTE: "Added note", SCHEDULE_FOLLOWUP: "Scheduled follow-up",
  COMPLETE_COUNSELLING: "Completed counselling", ARCHIVE_LEAD: "Archived lead",
  LOGIN: "Logged in",
};

const ACTION_COLORS: Record<string, string> = {
  CREATE_LEAD: "bg-green-100 text-green-600",
  CHANGE_STATUS: "bg-blue-100 text-blue-600",
  ADD_NOTE: "bg-amber-100 text-amber-600",
  SCHEDULE_FOLLOWUP: "bg-purple-100 text-purple-600",
  ASSIGN_LEAD: "bg-teal-100 text-teal-600",
  UPDATE_LEAD: "bg-gray-100 text-gray-600",
};

const TYPE_CONFIG: Record<string, { bar: string; light: string; text: string }> = {
  STUDY_ABROAD: { bar: "bg-blue-500",   light: "bg-blue-50",   text: "text-blue-600" },
  IELTS_CLASS:  { bar: "bg-violet-500", light: "bg-violet-50", text: "text-violet-600" },
  PTE_CLASS:    { bar: "bg-orange-500", light: "bg-orange-50", text: "text-orange-600" },
  DATE_BOOKING: { bar: "bg-teal-500",   light: "bg-teal-50",   text: "text-teal-600" },
};

function InfoRow({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ElementType }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2 text-gray-400 flex-shrink-0">
        {Icon && <Icon size={13} />}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <div className="text-sm font-medium text-gray-800 text-right">{value}</div>
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="py-2.5 border-b border-gray-50 last:border-0">
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{label}</p>
      <p className="text-sm text-gray-800 font-medium leading-snug">{value}</p>
    </div>
  );
}

function SideRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2">
      <span className="text-xs text-gray-400 flex-shrink-0">{label}</span>
      <span className="text-xs font-medium text-gray-700 text-right flex items-center gap-1">{value}</span>
    </div>
  );
}

function LeadDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-56 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export default function LeadDetailClient({ id }: { id: string }) {
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: lead, isLoading } = useQuery<Lead>({
    queryKey: ["lead", id],
    queryFn: async () => {
      const r = await fetch(`/api/leads/${id}`);
      if (r.status === 404 || r.status === 403) { router.replace("/admin/leads"); return null as unknown as Lead; }
      return (await r.json()).lead as Lead;
    },
    staleTime: 30_000,
  });

  const { data: refData } = useQuery({
    queryKey: ["reference"],
    queryFn: () => fetch("/api/reference").then((r) => r.json()),
    staleTime: 10 * 60_000,
  });

  const { data: meData } = useQuery({
    queryKey: ["me"],
    queryFn: () => fetch("/api/auth/me").then((r) => r.json()),
    staleTime: 5 * 60_000,
  });
  const myRole: string = meData?.user?.role ?? "";

  const [showStatusDialog,   setShowStatusDialog]   = useState(false);
  const [showNoteDialog,     setShowNoteDialog]     = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [showEditDialog,     setShowEditDialog]     = useState(false);
  const [showAddProgramDialog, setShowAddProgramDialog] = useState(false);
  const [newStatus,     setNewStatus]     = useState("");
  const [note,          setNote]          = useState("");
  const [followUpDate,  setFollowUpDate]  = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [saving,        setSaving]        = useState(false);
  const [addingProgram, setAddingProgram] = useState(false);
  const [editFields,    setEditFields]    = useState<Record<string, string>>({});

  if (isLoading || !lead) return <LeadDetailSkeleton />;

  const typeConfig = TYPE_CONFIG[lead.leadType] ?? { bar: "bg-gray-400", light: "bg-gray-50", text: "text-gray-600" };
  const isOverdue = lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < new Date();

  function openEdit() {
    setEditFields({
      leadType: lead!.leadType,
      studentName: lead!.studentName, phone: lead!.phone, email: lead!.email || "",
      educationLevel: lead!.educationLevel, countryId: lead!.country?.id || "",
      course: lead!.course || "", intakeId: lead!.intake?.id || "",
      branchId: lead!.branch?.id || "", assignedCounsellorId: lead!.assignedCounsellor?.id || "",
      teacherId: lead!.teacher?.id || "",
      shiftId: lead!.shift?.id || "",
      notes: lead!.notes || "", bookingDate: lead!.bookingDate ? lead!.bookingDate.slice(0, 10) : "",
    });
    setShowEditDialog(true);
  }

  async function addToProgram(type: string) {
    setAddingProgram(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadType: type,
          studentName: lead!.studentName,
          phone: lead!.phone,
          email: lead!.email || undefined,
          educationLevel: lead!.educationLevel,
          sourceId: lead!.source.id,
          branchId: lead!.branch?.id || undefined,
          notes: `Linked from ${lead!.leadId}`,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setShowAddProgramDialog(false);
        toast({ title: "New lead created", description: `${LEAD_TYPE_LABELS[type] ?? type} lead created — ${json.lead.leadId}` });
        router.push(`/leads/${json.lead.id}`);
      } else {
        toast({ variant: "destructive", title: "Error", description: json.error || "Failed to create lead" });
      }
    } finally { setAddingProgram(false); }
  }

  async function saveEdit() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(editFields) });
      if (res.ok) { await queryClient.invalidateQueries({ queryKey: ["lead", id] }); setShowEditDialog(false); toast({ title: "Lead updated" }); }
      else { const j = await res.json(); toast({ variant: "destructive", title: "Error", description: j.error || "Failed to update" }); }
    } finally { setSaving(false); }
  }

  async function changeStatus() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: newStatus }) });
      if (res.ok) { await queryClient.invalidateQueries({ queryKey: ["lead", id] }); setShowStatusDialog(false); toast({ title: "Status updated" }); }
    } finally { setSaving(false); }
  }

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}/activity`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ note }) });
      if (res.ok) { await queryClient.invalidateQueries({ queryKey: ["lead", id] }); setNote(""); setShowNoteDialog(false); toast({ title: "Note added" }); }
    } finally { setSaving(false); }
  }

  async function scheduleFollowUp() {
    if (!followUpDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}/followup`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ nextFollowUpAt: followUpDate, notes: followUpNotes }) });
      if (res.ok) { await queryClient.invalidateQueries({ queryKey: ["lead", id] }); setShowFollowUpDialog(false); toast({ title: "Follow-up scheduled" }); }
    } finally { setSaving(false); }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-5">

      {/* Header */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className={cn("h-0.5", typeConfig.bar)} />
        <div className="px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button onClick={() => router.back()} className="w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors flex-shrink-0">
              <ArrowLeft size={14} />
            </button>
            <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0", typeConfig.light, typeConfig.text)}>
              {lead.studentName.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-gray-900 leading-tight">{lead.studentName}</h1>
                <StatusBadge status={lead.status} />
                <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", LEAD_TYPE_COLORS[lead.leadType] ?? "bg-gray-100 text-gray-600")}>
                  {LEAD_TYPE_LABELS[lead.leadType] ?? lead.leadType}
                </span>
              </div>
              <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                <span className="font-mono text-[11px] font-semibold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">{lead.leadId}</span>
                <span className="text-xs text-gray-400">{lead.phone}</span>
                {lead.email && <span className="text-xs text-gray-400">{lead.email}</span>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 flex-shrink-0">
            <button onClick={() => { setNote(""); setShowNoteDialog(true); }} title="Add note" className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors">
              <MessageSquare size={14} />
            </button>
            <button onClick={() => setShowAddProgramDialog(true)} title="Add to program" className="w-8 h-8 rounded-lg border border-indigo-200 flex items-center justify-center text-indigo-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
              <Plus size={14} />
            </button>
            <Button variant="outline" size="sm" onClick={openEdit} className="gap-1.5 h-8 text-xs px-3">
              <Pencil size={12} />Edit
            </Button>
            <Button size="sm" onClick={() => { setNewStatus(lead.status); setShowStatusDialog(true); }} className="gap-1.5 h-8 text-xs px-3">
              <Zap size={12} />Status
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left: main content */}
        <div className="lg:col-span-2 space-y-5">

          {/* Student Details */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Student</span>
            </div>
            <div className="px-5 py-2 grid grid-cols-2 sm:grid-cols-3 gap-x-6">
              <Field label="Phone" value={lead.phone} />
              <Field label="Email" value={lead.email || "—"} />
              <Field label="Education" value={lead.educationLevel} />
              {lead.country && <Field label="Country" value={lead.country.name} />}
              {lead.course   && <Field label="Course"  value={lead.course} />}
              {lead.intake   && <Field label="Intake"  value={lead.intake.name} />}
              {lead.leadType === "DATE_BOOKING" && lead.bookingDate && (
                <Field label="Booking Date" value={formatDate(lead.bookingDate)} />
              )}
              {lead.academicInfo && Object.entries(lead.academicInfo).map(([k, v]) => v ? (
                <Field key={k} label={k.replace(/([A-Z])/g, " $1")} value={v} />
              ) : null)}
            </div>
            {lead.notes && (
              <div className="mx-5 mb-4 mt-1 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
                <p className="text-xs font-semibold text-amber-600 mb-1">Notes</p>
                <p className="text-sm text-amber-900 whitespace-pre-line leading-relaxed">{lead.notes}</p>
              </div>
            )}
          </div>

          {/* Tasks */}
          <TasksSection leadId={lead.id} myUserId={meData?.user?.id ?? ""} myRole={myRole} />

          {/* Activity Timeline */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Activity</span>
                {lead.activities.length > 0 && <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{lead.activities.length}</span>}
              </div>
              <button onClick={() => { setNote(""); setShowNoteDialog(true); }} className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
                <MessageSquare size={11} />Note
              </button>
            </div>

            <div className="px-5 py-4">
              {lead.activities.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  <Clock size={28} className="mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity yet</p>
                </div>
              ) : (
                <div className="relative">
                  {/* vertical timeline line */}
                  <div className="absolute left-3.5 top-2 bottom-2 w-px bg-gray-100" />
                  <div className="space-y-4">
                    {lead.activities.map((activity) => (
                      <div key={activity.id} className="flex gap-4 relative">
                        <div className={cn("w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 z-10 ring-2 ring-white",
                          ACTION_COLORS[activity.action] ?? "bg-gray-100 text-gray-500")}>
                          {activity.user.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-800">{activity.user.name}</span>
                            <span className="text-sm text-gray-500">{ACTION_LABELS[activity.action] || activity.action}</span>
                          </div>
                          {activity.action === "CHANGE_STATUS" && activity.metadata && (
                            <div className="flex items-center gap-1.5 mt-1">
                              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{STATUS_LABELS[activity.metadata.from as string]}</span>
                              <ArrowLeft size={10} className="text-gray-400 rotate-180" />
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{STATUS_LABELS[activity.metadata.to as string]}</span>
                            </div>
                          )}
                          {activity.action === "ADD_NOTE" && activity.metadata?.note != null && (
                            <p className="text-xs text-gray-600 mt-1 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 leading-relaxed">
                              {String(activity.metadata.note)}
                            </p>
                          )}
                          {activity.action === "ASSIGN_LEAD" && activity.metadata && (
                            <p className="text-xs text-gray-500 mt-0.5">→ {String(activity.metadata.counsellorName)}</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">{formatRelative(activity.createdAt)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">

          {/* Lead Info */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Details</span>
            </div>
            <div className="px-4 py-1 divide-y divide-gray-50">
              <SideRow label="Source" value={lead.source.name} />
              {lead.branch && <SideRow label="Branch" value={lead.branch.name} />}
              <SideRow
                label="Counsellor"
                value={lead.assignedCounsellor
                  ? <span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-blue-100 text-blue-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{lead.assignedCounsellor.name[0]}</span>{lead.assignedCounsellor.name}</span>
                  : <span className="text-gray-400 font-normal">Unassigned</span>}
              />
              {lead.teacher && (
                <SideRow
                  label="Teacher"
                  value={<span className="flex items-center gap-1.5"><span className="w-4 h-4 rounded-full bg-emerald-100 text-emerald-700 text-[9px] font-bold flex items-center justify-center flex-shrink-0">{lead.teacher.name[0]}</span>{lead.teacher.name}</span>}
                />
              )}
              {lead.shift && (
                <SideRow label="Shift" value={`${lead.shift.name} · ${lead.shift.startTime}–${lead.shift.endTime}`} />
              )}
              <SideRow label="Added by" value={`${lead.createdBy.name} · ${formatDate(lead.createdAt)}`} />
              {lead.referredBy && <SideRow label="Referred by" value={lead.referredBy} />}
            </div>
          </div>

          {/* Follow-up */}
          <div className={cn("rounded-2xl border shadow-sm overflow-hidden", isOverdue ? "bg-red-50 border-red-200" : "bg-white border-gray-200")}>
            <div className={cn("px-4 py-3 border-b flex items-center justify-between", isOverdue ? "border-red-100" : "border-gray-100")}>
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Follow-up</span>
              {isOverdue && <span className="text-[10px] font-bold uppercase tracking-wide bg-red-200 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>}
            </div>
            <div className="px-4 py-3 space-y-2">
              {lead.nextFollowUpAt ? (
                <div className="flex items-center gap-2">
                  <Calendar size={13} className={isOverdue ? "text-red-500" : "text-green-500"} />
                  <span className={cn("text-sm font-semibold", isOverdue ? "text-red-700" : "text-gray-800")}>
                    {formatDateTime(lead.nextFollowUpAt)}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">Not scheduled</p>
              )}
              {lead.lastContactedAt && (
                <p className="text-xs text-gray-500">Last contact: {formatDate(lead.lastContactedAt)}</p>
              )}
              {lead.followUpNotes && (
                <p className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2 leading-relaxed">{lead.followUpNotes}</p>
              )}
              <button onClick={() => setShowFollowUpDialog(true)} className="w-full text-xs text-blue-600 hover:text-blue-700 font-medium py-1 text-left flex items-center gap-1 mt-1">
                <Calendar size={11} />{lead.nextFollowUpAt ? "Reschedule" : "Schedule follow-up"}
              </button>
            </div>
          </div>

          {/* Fee & Payments */}
          {(lead.leadType === "IELTS_CLASS" || lead.leadType === "PTE_CLASS") && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-emerald-50 flex items-center justify-center">
                  <DollarSign size={13} className="text-emerald-500" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Fees & Payments</span>
              </div>
              <div className="px-5 py-4">
                <FeeSection leadId={lead.id} role={myRole} />
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ── Dialogs ── */}

      {/* Edit Lead */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Lead</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Lead Type */}
            <div className="space-y-1.5">
              <Label>Lead Type</Label>
              <div className="flex gap-2 flex-wrap">
                {(["STUDY_ABROAD", "IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditFields((f) => ({ ...f, leadType: t }))}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all",
                      editFields.leadType === t
                        ? "bg-[#0E356B] text-white border-[#0E356B]"
                        : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                    )}
                  >
                    {LEAD_TYPE_LABELS[t] ?? t}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Student Name</Label>
                <Input value={editFields.studentName || ""} onChange={(e) => setEditFields((f) => ({ ...f, studentName: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={editFields.phone || ""} onChange={(e) => setEditFields((f) => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={editFields.email || ""} onChange={(e) => setEditFields((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Education Level</Label>
                <Select value={editFields.educationLevel || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, educationLevel: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            {/* Study Abroad fields */}
            {editFields.leadType === "STUDY_ABROAD" && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Interested Country</Label>
                  <Select value={editFields.countryId || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, countryId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {refData?.countries?.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Preferred Course</Label>
                  <Input value={editFields.course || ""} onChange={(e) => setEditFields((f) => ({ ...f, course: e.target.value }))} />
                </div>
              </div>
            )}
            {editFields.leadType === "STUDY_ABROAD" && (
              <div className="space-y-1.5">
                <Label>Intake</Label>
                <Select value={editFields.intakeId || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, intakeId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select intake" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {refData?.intakes?.map((i: { id: string; name: string }) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Date Booking field */}
            {editFields.leadType === "DATE_BOOKING" && (
              <div className="space-y-1.5">
                <Label>Test Booking Date</Label>
                <Input type="date" value={editFields.bookingDate || ""} onChange={(e) => setEditFields((f) => ({ ...f, bookingDate: e.target.value }))} />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Branch</Label>
                <Select value={editFields.branchId || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, branchId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">None</SelectItem>
                    {refData?.branches?.map((b: { id: string; name: string }) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assigned Counsellor</Label>
                <Select value={editFields.assignedCounsellorId || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, assignedCounsellorId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Unassigned" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Unassigned</SelectItem>
                    {refData?.counsellors?.map((c: { id: string; name: string }) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Assign Teacher</Label>
                <Select value={editFields.teacherId || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, teacherId: v }))}>
                  <SelectTrigger><SelectValue placeholder="No teacher" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No teacher</SelectItem>
                    {refData?.teachers?.map((t: { id: string; name: string }) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Shift</Label>
                <Select value={editFields.shiftId || ""} onValueChange={(v) => setEditFields((f) => ({ ...f, shiftId: v }))}>
                  <SelectTrigger><SelectValue placeholder="No shift" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No shift</SelectItem>
                    {refData?.shifts?.map((s: { id: string; name: string; startTime: string; endTime: string }) => (
                      <SelectItem key={s.id} value={s.id}>{s.name} ({s.startTime}–{s.endTime})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Textarea rows={3} value={editFields.notes || ""} onChange={(e) => setEditFields((f) => ({ ...f, notes: e.target.value }))} placeholder="Any notes..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={saveEdit} disabled={saving}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add to Program */}
      <Dialog open={showAddProgramDialog} onOpenChange={setShowAddProgramDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add to Another Program</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500 -mt-1">
            Creates a new linked lead for <span className="font-semibold text-gray-700">{lead.studentName}</span> with their details pre-filled.
          </p>
          <div className="grid grid-cols-2 gap-3 pt-1">
            {(["STUDY_ABROAD", "IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"] as const)
              .filter((t) => t !== lead.leadType)
              .map((type) => {
                const cfg = TYPE_CONFIG[type] ?? { light: "bg-gray-50", text: "text-gray-600" };
                return (
                  <button
                    key={type}
                    onClick={() => addToProgram(type)}
                    disabled={addingProgram}
                    className={cn(
                      "rounded-xl border-2 p-4 text-center transition-all hover:border-current hover:shadow-sm disabled:opacity-50",
                      cfg.light, cfg.text, "border-transparent"
                    )}
                  >
                    <p className="text-sm font-semibold">{LEAD_TYPE_LABELS[type] ?? type}</p>
                    <p className="text-[10px] mt-0.5 opacity-60">New lead</p>
                  </button>
                );
              })}
          </div>
          {addingProgram && (
            <div className="flex items-center justify-center gap-2 text-sm text-gray-500">
              <Loader2 size={14} className="animate-spin" />Creating lead…
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Change Status */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {(STATUSES_BY_TYPE[lead.leadType] ?? STATUSES_BY_TYPE.STUDY_ABROAD).map((s) => (
                <SelectItem key={s} value={s}>{STATUS_LABELS[s] ?? s}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={changeStatus} disabled={saving || newStatus === lead.status}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Note */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write your note here..." rows={4} autoFocus />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={saving || !note.trim()}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Follow-up */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Follow-up Date & Time</Label>
              <Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea value={followUpNotes} onChange={(e) => setFollowUpNotes(e.target.value)} placeholder="What to follow up on..." rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFollowUpDialog(false)}>Cancel</Button>
            <Button onClick={scheduleFollowUp} disabled={saving || !followUpDate}>Schedule</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

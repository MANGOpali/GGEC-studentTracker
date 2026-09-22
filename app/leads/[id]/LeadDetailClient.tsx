"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Calendar, MessageSquare, CheckCircle, AlertCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import StatusBadge from "@/components/leads/StatusBadge";
import { formatDate, formatDateTime, formatRelative, ALL_STATUSES, STATUS_LABELS } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface Lead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  email: string | null;
  educationLevel: string;
  status: string;
  course: string | null;
  notes: string | null;
  followUpNotes: string | null;
  referredBy: string | null;
  nextFollowUpAt: string | null;
  lastContactedAt: string | null;
  createdAt: string;
  updatedAt: string;
  academicInfo: Record<string, string> | null;
  englishTest: Record<string, string> | null;
  country: { id: string; name: string };
  source: { id: string; name: string };
  intake: { id: string; name: string } | null;
  branch: { id: string; name: string } | null;
  assignedCounsellor: { id: string; name: string; email: string } | null;
  createdBy: { id: string; name: string };
  activities: Array<{
    id: string;
    action: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
    user: { id: string; name: string; role: string };
  }>;
}

const ACTION_LABELS: Record<string, string> = {
  CREATE_LEAD: "Created lead",
  UPDATE_LEAD: "Updated lead",
  ASSIGN_LEAD: "Assigned lead",
  CHANGE_STATUS: "Changed status",
  ADD_NOTE: "Added note",
  SCHEDULE_FOLLOWUP: "Scheduled follow-up",
  COMPLETE_COUNSELLING: "Completed counselling",
  ARCHIVE_LEAD: "Archived lead",
  LOGIN: "Logged in",
};

function LeadDetailSkeleton() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8 rounded-md" />
        <div className="space-y-1.5">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-28" />
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {[1, 2].map((i) => (
            <Card key={i}>
              <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
              <CardContent className="grid grid-cols-2 gap-4">
                {Array.from({ length: 6 }).map((_, j) => (
                  <div key={j} className="space-y-1"><Skeleton className="h-3 w-20" /><Skeleton className="h-5 w-32" /></div>
                ))}
              </CardContent>
            </Card>
          ))}
          <Card>
            <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
            <CardContent className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-4">
          <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</CardContent></Card>
          <Card><CardContent className="pt-6 space-y-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-5 w-full" />)}</CardContent></Card>
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
      if (r.status === 404 || r.status === 403) {
        router.replace("/admin/leads");
        return null as unknown as Lead;
      }
      const data = await r.json();
      return data.lead as Lead;
    },
    staleTime: 30_000,
  });

  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showNoteDialog, setShowNoteDialog] = useState(false);
  const [showFollowUpDialog, setShowFollowUpDialog] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [note, setNote] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [saving, setSaving] = useState(false);

  if (isLoading || !lead) return <LeadDetailSkeleton />;

  async function changeStatus() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["lead", id] });
        setShowStatusDialog(false);
        toast({ title: "Status updated" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}/activity`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["lead", id] });
        setNote("");
        setShowNoteDialog(false);
        toast({ title: "Note added" });
      }
    } finally {
      setSaving(false);
    }
  }

  async function scheduleFollowUp() {
    if (!followUpDate) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${lead!.id}/followup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nextFollowUpAt: followUpDate, notes: followUpNotes }),
      });
      if (res.ok) {
        await queryClient.invalidateQueries({ queryKey: ["lead", id] });
        setShowFollowUpDialog(false);
        toast({ title: "Follow-up scheduled" });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6 gap-4">
        <div className="flex items-center gap-3">
          <Link href="/admin/leads" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{lead.studentName}</h1>
              <StatusBadge status={lead.status} />
            </div>
            <p className="text-sm text-gray-500 font-mono">{lead.leadId}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowFollowUpDialog(true)}>
            <Calendar size={14} className="mr-1" />Follow-up
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowNoteDialog(true)}>
            <MessageSquare size={14} className="mr-1" />Note
          </Button>
          <Button size="sm" onClick={() => { setNewStatus(lead.status); setShowStatusDialog(true); }}>
            <CheckCircle size={14} className="mr-1" />Status
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Student Info */}
          <Card>
            <CardHeader><CardTitle className="text-base">Student Information</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Name</span><p className="font-medium mt-0.5">{lead.studentName}</p></div>
              <div><span className="text-gray-500">Phone</span><p className="font-medium mt-0.5">{lead.phone}</p></div>
              <div><span className="text-gray-500">Email</span><p className="font-medium mt-0.5">{lead.email || "—"}</p></div>
              <div><span className="text-gray-500">Education Level</span><p className="font-medium mt-0.5">{lead.educationLevel}</p></div>
              {lead.academicInfo && Object.entries(lead.academicInfo).map(([k, v]) => v ? (
                <div key={k}><span className="text-gray-500 capitalize">{k.replace(/([A-Z])/g, " $1")}</span><p className="font-medium mt-0.5">{v}</p></div>
              ) : null)}
              {lead.englishTest && Object.entries(lead.englishTest).map(([k, v]) => v ? (
                <div key={k}><span className="text-gray-500 capitalize">{k}</span><p className="font-medium mt-0.5">{v}</p></div>
              ) : null)}
            </CardContent>
          </Card>

          {/* Study Preferences */}
          <Card>
            <CardHeader><CardTitle className="text-base">Study Preferences</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-gray-500">Country</span><p className="font-medium mt-0.5">{lead.country.name}</p></div>
              <div><span className="text-gray-500">Course</span><p className="font-medium mt-0.5">{lead.course || "—"}</p></div>
              <div><span className="text-gray-500">Intake</span><p className="font-medium mt-0.5">{lead.intake?.name || "—"}</p></div>
              <div><span className="text-gray-500">Education Level</span><p className="font-medium mt-0.5">{lead.educationLevel}</p></div>
            </CardContent>
          </Card>

          {/* Notes */}
          {lead.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notes</CardTitle></CardHeader>
              <CardContent><p className="text-sm text-gray-700 whitespace-pre-line">{lead.notes}</p></CardContent>
            </Card>
          )}

          {/* Activity Timeline */}
          <Card>
            <CardHeader><CardTitle className="text-base">Activity Timeline</CardTitle></CardHeader>
            <CardContent>
              {lead.activities.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No activity yet</p>
              ) : (
                <div className="space-y-3">
                  {lead.activities.map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0 mt-0.5">
                        {activity.user.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-medium text-gray-800">{activity.user.name}</span>
                          <span className="text-sm text-gray-600">{ACTION_LABELS[activity.action] || activity.action}</span>
                        </div>
                        {activity.action === "CHANGE_STATUS" && activity.metadata && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            {STATUS_LABELS[activity.metadata.from as string]} → {STATUS_LABELS[activity.metadata.to as string]}
                          </p>
                        )}
                        {activity.action === "ADD_NOTE" && activity.metadata?.note != null && (
                          <p className="text-xs text-gray-600 mt-0.5 bg-gray-50 rounded p-2">{String(activity.metadata.note)}</p>
                        )}
                        {activity.action === "ASSIGN_LEAD" && activity.metadata && (
                          <p className="text-xs text-gray-500 mt-0.5">Assigned to {String(activity.metadata.counsellorName)}</p>
                        )}
                        <p className="text-xs text-gray-400 mt-0.5">{formatRelative(activity.createdAt)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Lead Info</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div><span className="text-gray-500">Status</span><div className="mt-0.5"><StatusBadge status={lead.status} /></div></div>
              <div><span className="text-gray-500">Source</span><p className="font-medium mt-0.5">{lead.source.name}</p></div>
              {lead.branch && <div><span className="text-gray-500">Branch</span><p className="font-medium mt-0.5">{lead.branch.name}</p></div>}
              <div><span className="text-gray-500">Counsellor</span><p className="font-medium mt-0.5">{lead.assignedCounsellor?.name || <span className="text-gray-400">Unassigned</span>}</p></div>
              <div><span className="text-gray-500">Created by</span><p className="font-medium mt-0.5">{lead.createdBy.name}</p></div>
              <div><span className="text-gray-500">Created</span><p className="font-medium mt-0.5">{formatDateTime(lead.createdAt)}</p></div>
              {lead.referredBy && <div><span className="text-gray-500">Referred by</span><p className="font-medium mt-0.5">{lead.referredBy}</p></div>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Follow-up</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-3">
              <div>
                <span className="text-gray-500">Next Follow-up</span>
                <div className="mt-0.5 flex items-center gap-1.5">
                  {lead.nextFollowUpAt ? (
                    <>
                      {new Date(lead.nextFollowUpAt) < new Date() ? (
                        <AlertCircle size={14} className="text-red-500" />
                      ) : (
                        <Calendar size={14} className="text-green-500" />
                      )}
                      <span className="font-medium">{formatDate(lead.nextFollowUpAt)}</span>
                    </>
                  ) : (
                    <span className="text-gray-400">Not scheduled</span>
                  )}
                </div>
              </div>
              {lead.lastContactedAt && (
                <div><span className="text-gray-500">Last Contacted</span><p className="font-medium mt-0.5">{formatDate(lead.lastContactedAt)}</p></div>
              )}
              {lead.followUpNotes && (
                <div><span className="text-gray-500">Follow-up Notes</span><p className="text-gray-700 mt-0.5 text-xs">{lead.followUpNotes}</p></div>
              )}
              <Button variant="outline" size="sm" className="w-full" onClick={() => setShowFollowUpDialog(true)}>
                <Calendar size={14} className="mr-1" />Schedule Follow-up
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Status Dialog */}
      <Dialog open={showStatusDialog} onOpenChange={setShowStatusDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Change Status</DialogTitle></DialogHeader>
          <Select value={newStatus} onValueChange={setNewStatus}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {ALL_STATUSES.map((s) => <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>)}
            </SelectContent>
          </Select>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowStatusDialog(false)}>Cancel</Button>
            <Button onClick={changeStatus} disabled={saving || newStatus === lead.status}>Update</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Dialog */}
      <Dialog open={showNoteDialog} onOpenChange={setShowNoteDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Note</DialogTitle></DialogHeader>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Write your note here..." rows={4} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNoteDialog(false)}>Cancel</Button>
            <Button onClick={addNote} disabled={saving || !note.trim()}>Add Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Follow-up Dialog */}
      <Dialog open={showFollowUpDialog} onOpenChange={setShowFollowUpDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Schedule Follow-up</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Follow-up Date</Label>
              <Input type="datetime-local" value={followUpDate} onChange={(e) => setFollowUpDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Notes (optional)</Label>
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

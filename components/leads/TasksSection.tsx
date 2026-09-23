"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Plus, Trash2, ChevronDown, ChevronUp, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";

interface LeadTask {
  id: string;
  title: string;
  description: string | null;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
  completedAt: string | null;
  createdAt: string;
  assignedTo: { id: string; name: string; role: string };
  createdBy: { id: string; name: string };
}

const PRIORITY_CONFIG = {
  HIGH:   { label: "High",   cls: "bg-red-100 text-red-700" },
  NORMAL: { label: "Normal", cls: "bg-blue-100 text-blue-700" },
  LOW:    { label: "Low",    cls: "bg-gray-100 text-gray-600" },
};

const STATUS_CONFIG = {
  PENDING:     { label: "Pending",     cls: "bg-amber-100 text-amber-700" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-blue-100 text-blue-700" },
  DONE:        { label: "Done",        cls: "bg-green-100 text-green-700" },
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NP", { month: "short", day: "numeric", year: "numeric" });
}

interface Props {
  leadId: string;
  myUserId: string;
  myRole: string;
}

export default function TasksSection({ leadId, myUserId, myRole }: Props) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const canCreate = myRole === "ADMIN" || myRole === "COUNSELLOR";

  const [showCreate, setShowCreate] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", assignedToId: "", priority: "NORMAL", dueDate: "" });

  const { data: taskData, isLoading } = useQuery<{ tasks: LeadTask[] }>({
    queryKey: ["lead-tasks", leadId],
    queryFn: () => fetch(`/api/leads/${leadId}/tasks`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const { data: usersData } = useQuery<{ users: { id: string; name: string; role: string }[] }>({
    queryKey: ["staff-users"],
    queryFn: () => fetch("/api/users?active=true").then((r) => r.json()),
    staleTime: 5 * 60_000,
    enabled: canCreate,
  });

  const tasks = taskData?.tasks ?? [];
  const active = tasks.filter((t) => t.status !== "DONE");
  const done = tasks.filter((t) => t.status === "DONE");

  async function createTask() {
    if (!form.title.trim() || !form.assignedToId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, dueDate: form.dueDate || undefined }),
      });
      if (res.ok) {
        await qc.invalidateQueries({ queryKey: ["lead-tasks", leadId] });
        setShowCreate(false);
        setForm({ title: "", description: "", assignedToId: "", priority: "NORMAL", dueDate: "" });
        toast({ title: "Task created" });
      } else {
        const j = await res.json();
        toast({ variant: "destructive", title: "Error", description: j.error });
      }
    } finally { setSaving(false); }
  }

  async function updateStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["lead-tasks", leadId] });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
  }

  async function deleteTask(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
    qc.invalidateQueries({ queryKey: ["lead-tasks", leadId] });
  }

  const users = usersData?.users ?? [];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
            <CheckSquare size={13} className="text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Tasks</span>
          {active.length > 0 && (
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{active.length}</span>
          )}
        </div>
        {canCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="text-xs text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
          >
            <Plus size={12} />Assign task
          </button>
        )}
      </div>

      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <div className="px-5 py-6 text-center text-gray-400">
            <Loader2 size={18} className="mx-auto mb-1 animate-spin opacity-40" />
          </div>
        ) : active.length === 0 && done.length === 0 ? (
          <div className="px-5 py-6 text-center text-gray-400">
            <CheckSquare size={24} className="mx-auto mb-2 opacity-20" />
            <p className="text-sm">No tasks yet</p>
          </div>
        ) : null}

        {active.map((task) => (
          <TaskRow
            key={task.id}
            task={task}
            myUserId={myUserId}
            myRole={myRole}
            onStatusChange={(s) => updateStatus(task.id, s)}
            onDelete={() => deleteTask(task.id)}
          />
        ))}

        {done.length > 0 && (
          <div>
            <button
              onClick={() => setShowDone((v) => !v)}
              className="w-full px-5 py-2.5 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showDone ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
              {done.length} completed task{done.length > 1 ? "s" : ""}
            </button>
            {showDone && done.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                myUserId={myUserId}
                myRole={myRole}
                onStatusChange={(s) => updateStatus(task.id, s)}
                onDelete={() => deleteTask(task.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Create Task Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Assign Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Task title *</label>
              <Input
                placeholder="e.g. Collect documents, Follow up on visa"
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Assign to *</label>
              <Select value={form.assignedToId} onValueChange={(v) => setForm((f) => ({ ...f, assignedToId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select team member" /></SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name} <span className="text-gray-400 text-xs ml-1">({u.role})</span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Priority</label>
                <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium text-gray-700">Due date</label>
                <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700">Description</label>
              <Textarea
                placeholder="Optional details…"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="resize-none h-20"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={createTask} disabled={saving || !form.title.trim() || !form.assignedToId}>
              {saving ? <><Loader2 size={13} className="mr-1.5 animate-spin" />Creating…</> : "Create Task"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TaskRow({
  task, myUserId, myRole, onStatusChange, onDelete,
}: {
  task: LeadTask;
  myUserId: string;
  myRole: string;
  onStatusChange: (s: string) => void;
  onDelete: () => void;
}) {
  const isAssignee = task.assignedTo.id === myUserId;
  const isCreator = task.createdBy.id === myUserId || myRole === "ADMIN";
  const canChange = isAssignee || isCreator;
  const statusCfg = STATUS_CONFIG[task.status];
  const priorityCfg = PRIORITY_CONFIG[task.priority];
  const isDone = task.status === "DONE";
  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date();

  return (
    <div className={cn("px-5 py-3.5 flex items-start gap-3", isDone && "opacity-60")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className={cn("text-sm font-medium text-gray-800 leading-snug", isDone && "line-through text-gray-500")}>
              {task.title}
            </p>
            {task.description && (
              <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{task.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {canChange && !isDone ? (
              <Select value={task.status} onValueChange={onStatusChange}>
                <SelectTrigger className={cn("h-6 text-[11px] font-semibold px-2 rounded-full border-0 gap-1 w-auto", statusCfg.cls)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", statusCfg.cls)}>
                {statusCfg.label}
              </span>
            )}
            {isCreator && !isDone && (
              <button onClick={onDelete} className="text-gray-300 hover:text-red-400 transition-colors">
                <Trash2 size={13} />
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-1.5">
          <span className="text-xs text-gray-500">→ {task.assignedTo.name}</span>
          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full", priorityCfg.cls)}>
            {priorityCfg.label}
          </span>
          {task.dueDate && (
            <span className={cn("text-[10px] font-medium px-1.5 py-0.5 rounded-full",
              isOverdue ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500")}>
              Due {formatDate(task.dueDate)}
            </span>
          )}
          {isDone && task.completedAt && (
            <span className="text-[10px] text-gray-400">Completed {formatDate(task.completedAt)}</span>
          )}
        </div>
      </div>
    </div>
  );
}

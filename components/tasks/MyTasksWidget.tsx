"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckSquare, ExternalLink, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface MyTask {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
  lead: { id: string; leadId: string; studentName: string };
  createdBy: { id: string; name: string };
  assignedTo: { id: string; name: string };
}

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   "bg-red-400",
  NORMAL: "bg-blue-400",
  LOW:    "bg-gray-300",
};

const STATUS_CLS: Record<string, string> = {
  PENDING:     "bg-amber-100 text-amber-700",
  IN_PROGRESS: "bg-blue-100 text-blue-700",
  DONE:        "bg-green-100 text-green-700",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NP", { month: "short", day: "numeric" });
}

function playNotificationSound() {
  try {
    const ctx = new AudioContext();
    // Two-tone chime
    [660, 880].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.15;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(0.25, start + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.4);
      osc.start(start);
      osc.stop(start + 0.4);
    });
  } catch { /* browser blocked audio */ }
}

function TaskRow({ task, onStatusChange, showAssignee = false }: {
  task: MyTask;
  onStatusChange?: (status: string) => void;
  showAssignee?: boolean;
}) {
  const isDone = task.status === "DONE";
  const isOverdue = task.dueDate && !isDone && new Date(task.dueDate) < new Date();

  return (
    <div className={cn("px-5 py-3 flex items-start gap-3", isDone && "opacity-55")}>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn("text-sm font-medium text-gray-800 leading-snug flex-1", isDone && "line-through text-gray-400")}>
            {task.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            {onStatusChange ? (
              <Select value={task.status} onValueChange={onStatusChange}>
                <SelectTrigger className={cn("h-6 text-[11px] font-semibold px-2 rounded-full border-0 gap-1 w-auto", STATUS_CLS[task.status])}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                  <SelectItem value="DONE">Done</SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full", STATUS_CLS[task.status])}>
                {task.status === "IN_PROGRESS" ? "In Progress" : task.status === "DONE" ? "Done" : "Pending"}
              </span>
            )}
            <Link
              href={`/leads/${task.lead.id}`}
              className="text-gray-300 hover:text-indigo-500 transition-colors"
              title="View student profile"
            >
              <ExternalLink size={13} />
            </Link>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <div className={cn("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[task.priority])} />
          <span className="text-xs text-gray-500">{task.lead.studentName}</span>
          <span className="text-[10px] text-gray-400 font-mono">{task.lead.leadId}</span>
          {showAssignee && (
            <span className="text-[10px] text-gray-400">→ {task.assignedTo.name}</span>
          )}
          {task.dueDate && (
            <span className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-gray-400")}>
              Due {formatDate(task.dueDate)}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyTasksWidget() {
  const qc = useQueryClient();
  const [showDoneAssigned, setShowDoneAssigned] = useState(false);
  const prevTaskIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef(true);

  const { data, isLoading } = useQuery<{ tasks: MyTask[]; assignedOut: MyTask[] }>({
    queryKey: ["my-tasks"],
    queryFn: () => fetch("/api/tasks/my").then((r) => r.json()),
    staleTime: 30_000,
    refetchInterval: 30_000,
  });

  const tasks = data?.tasks ?? [];
  const assignedOut = data?.assignedOut ?? [];

  // Play sound when new tasks appear in "assigned to me"
  useEffect(() => {
    if (!tasks.length && isFirstLoadRef.current) return;
    const currentIds = new Set(tasks.map((t) => t.id));

    if (isFirstLoadRef.current) {
      isFirstLoadRef.current = false;
      prevTaskIdsRef.current = currentIds;
      return;
    }

    const hasNew = tasks.some((t) => !prevTaskIdsRef.current.has(t.id));
    if (hasNew) playNotificationSound();
    prevTaskIdsRef.current = currentIds;
  }, [tasks]);

  async function updateStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
    qc.invalidateQueries({ queryKey: ["lead-tasks"] });
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
        <div className="h-4 bg-gray-100 rounded w-24 mb-4 animate-pulse" />
        <div className="space-y-3">
          {[1, 2].map((i) => <div key={i} className="h-12 bg-gray-50 rounded-lg animate-pulse" />)}
        </div>
      </div>
    );
  }

  const activeAssignedOut = assignedOut.filter((t) => t.status !== "DONE");
  const doneAssignedOut = assignedOut.filter((t) => t.status === "DONE");
  const hasAnything = tasks.length > 0 || assignedOut.length > 0;
  if (!hasAnything) return null;

  return (
    <div className="space-y-4">
      {/* My Tasks (assigned to me) */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
              <CheckSquare size={13} className="text-indigo-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">My Tasks</span>
            <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{tasks.length}</span>
          </div>
          <div className="divide-y divide-gray-50">
            {tasks.map((task) => (
              <TaskRow key={task.id} task={task} onStatusChange={(s) => updateStatus(task.id, s)} />
            ))}
          </div>
        </div>
      )}

      {/* Tasks I assigned out (admin/counsellor only) */}
      {assignedOut.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-violet-50 flex items-center justify-center">
              <CheckSquare size={13} className="text-violet-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Tasks I Assigned</span>
            {activeAssignedOut.length > 0 && (
              <span className="text-xs bg-violet-100 text-violet-700 font-semibold px-2 py-0.5 rounded-full">{activeAssignedOut.length} open</span>
            )}
          </div>
          <div className="divide-y divide-gray-50">
            {activeAssignedOut.map((task) => (
              <TaskRow key={task.id} task={task} showAssignee />
            ))}
            {doneAssignedOut.length > 0 && (
              <div>
                <button
                  onClick={() => setShowDoneAssigned((v) => !v)}
                  className="w-full px-5 py-2.5 flex items-center gap-2 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {showDoneAssigned ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                  {doneAssignedOut.length} completed
                </button>
                {showDoneAssigned && doneAssignedOut.map((task) => (
                  <TaskRow key={task.id} task={task} showAssignee />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

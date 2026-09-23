"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckSquare, Clock, AlertCircle, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface MyTask {
  id: string;
  title: string;
  status: "PENDING" | "IN_PROGRESS" | "DONE";
  priority: "LOW" | "NORMAL" | "HIGH";
  dueDate: string | null;
  lead: { id: string; leadId: string; studentName: string };
  createdBy: { id: string; name: string };
}

const PRIORITY_DOT: Record<string, string> = {
  HIGH:   "bg-red-400",
  NORMAL: "bg-blue-400",
  LOW:    "bg-gray-300",
};

const STATUS_ICON: Record<string, React.ElementType> = {
  PENDING:     Clock,
  IN_PROGRESS: AlertCircle,
  DONE:        Check,
};

const STATUS_CLS: Record<string, string> = {
  PENDING:     "text-amber-500",
  IN_PROGRESS: "text-blue-500",
  DONE:        "text-green-500",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-NP", { month: "short", day: "numeric" });
}

export default function MyTasksWidget() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ tasks: MyTask[] }>({
    queryKey: ["my-tasks"],
    queryFn: () => fetch("/api/tasks/my").then((r) => r.json()),
    staleTime: 60_000,
  });

  const tasks = data?.tasks ?? [];

  async function markDone(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "DONE" }),
    });
    qc.invalidateQueries({ queryKey: ["my-tasks"] });
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

  if (tasks.length === 0) return null;

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
            <CheckSquare size={13} className="text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">My Tasks</span>
          <span className="text-xs bg-indigo-100 text-indigo-700 font-semibold px-2 py-0.5 rounded-full">{tasks.length}</span>
        </div>
      </div>

      <div className="divide-y divide-gray-50">
        {tasks.map((task) => {
          const StatusIcon = STATUS_ICON[task.status];
          const isOverdue = task.dueDate && task.status !== "DONE" && new Date(task.dueDate) < new Date();

          return (
            <div key={task.id} className="px-5 py-3 flex items-start gap-3">
              <button
                onClick={() => markDone(task.id)}
                title="Mark as done"
                className={cn("mt-0.5 flex-shrink-0 transition-colors hover:opacity-70", STATUS_CLS[task.status])}
              >
                <StatusIcon size={15} />
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
                  <Link
                    href={`/leads/${task.lead.id}`}
                    className="text-gray-300 hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5"
                    title="View student profile"
                  >
                    <ExternalLink size={13} />
                  </Link>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <div className={cn("w-2 h-2 rounded-full flex-shrink-0", PRIORITY_DOT[task.priority])} />
                  <span className="text-xs text-gray-500">{task.lead.studentName}</span>
                  <span className="text-[10px] text-gray-400 font-mono">{task.lead.leadId}</span>
                  {task.dueDate && (
                    <span className={cn("text-[10px] font-medium", isOverdue ? "text-red-500" : "text-gray-400")}>
                      Due {formatDate(task.dueDate)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

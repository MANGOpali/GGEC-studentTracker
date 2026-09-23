"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { CheckSquare, ExternalLink } from "lucide-react";
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

export default function MyTasksWidget() {
  const qc = useQueryClient();

  const { data, isLoading } = useQuery<{ tasks: MyTask[] }>({
    queryKey: ["my-tasks"],
    queryFn: () => fetch("/api/tasks/my").then((r) => r.json()),
    staleTime: 60_000,
  });

  const tasks = data?.tasks ?? [];

  async function updateStatus(taskId: string, status: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
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
          const isOverdue = task.dueDate && new Date(task.dueDate) < new Date();

          return (
            <div key={task.id} className="px-5 py-3 flex items-start gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-800 leading-snug">{task.title}</p>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Select value={task.status} onValueChange={(v) => updateStatus(task.id, v)}>
                      <SelectTrigger className={cn("h-6 text-[11px] font-semibold px-2 rounded-full border-0 gap-1 w-auto", STATUS_CLS[task.status])}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">Pending</SelectItem>
                        <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                        <SelectItem value="DONE">Done</SelectItem>
                      </SelectContent>
                    </Select>
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

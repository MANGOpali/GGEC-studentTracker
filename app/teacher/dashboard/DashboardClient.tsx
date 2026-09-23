"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, BookOpen, CheckCircle, UserX, ClipboardList } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { cn } from "@/lib/utils";
import MyTasksWidget from "@/components/tasks/MyTasksWidget";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

const STATUS_GROUPS = [
  { key: "active",    label: "In Class",   color: "bg-blue-50 text-blue-700 border-blue-200",   statuses: ["IN_CLASS", "DEMO_SCHEDULED", "DEMO_ATTENDED"] },
  { key: "completed", label: "Completed",  color: "bg-green-50 text-green-700 border-green-200", statuses: ["COMPLETED"] },
  { key: "dropped",   label: "Dropped",    color: "bg-red-50 text-red-700 border-red-200",        statuses: ["DROPPED"] },
  { key: "new",       label: "New / Other", color: "bg-gray-50 text-gray-700 border-gray-200",   statuses: [] },
];

export default function TeacherDashboardClient({ userName }: { userName: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["teacher-students"],
    queryFn: () => fetch("/api/leads?pageSize=200").then((r) => r.json()),
    staleTime: 30_000,
  });

  const students = data?.data ?? [];
  const total: number = data?.total ?? 0;

  const inClass    = students.filter((s: { status: string }) => ["IN_CLASS", "DEMO_SCHEDULED", "DEMO_ATTENDED"].includes(s.status)).length;
  const completed  = students.filter((s: { status: string }) => s.status === "COMPLETED").length;
  const dropped    = students.filter((s: { status: string }) => s.status === "DROPPED").length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}, {userName.split(" ")[0]}!</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here&apos;s an overview of your students.</p>
        </div>
        <p className="text-sm text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
        ) : (
          <>
            {[
              { label: "Total Students", value: total,     icon: Users,       color: "bg-blue-100 text-blue-600",   val: "text-blue-600" },
              { label: "In Class",       value: inClass,   icon: BookOpen,    color: "bg-indigo-100 text-indigo-600", val: "text-indigo-600" },
              { label: "Completed",      value: completed, icon: CheckCircle, color: "bg-green-100 text-green-600", val: "text-green-600" },
              { label: "Dropped",        value: dropped,   icon: UserX,       color: "bg-red-100 text-red-600",     val: "text-red-600" },
            ].map(({ label, value, icon: Icon, color, val }) => (
              <div key={label} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={cn("w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0", color)}>
                  <Icon size={20} />
                </div>
                <div>
                  <p className={cn("text-2xl font-bold leading-tight", val)}>{value}</p>
                  <p className="text-sm text-gray-500 font-medium mt-0.5">{label}</p>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Link href="/teacher/students">
          <div className="bg-white border-2 border-dashed border-blue-200 rounded-2xl p-6 text-center hover:border-blue-400 hover:bg-blue-50/40 transition-colors cursor-pointer">
            <Users className="w-9 h-9 text-blue-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">My Students</p>
            <p className="text-sm text-gray-500 mt-1">{total} assigned</p>
          </div>
        </Link>
        <Link href="/teacher/students">
          <div className="bg-white border-2 border-dashed border-emerald-200 rounded-2xl p-6 text-center hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors cursor-pointer">
            <CheckCircle className="w-9 h-9 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Students List</p>
            <p className="text-sm text-gray-500 mt-1">Manage &amp; update status</p>
          </div>
        </Link>
        <Link href="/teacher/attendance">
          <div className="bg-white border-2 border-dashed border-violet-200 rounded-2xl p-6 text-center hover:border-violet-400 hover:bg-violet-50/40 transition-colors cursor-pointer">
            <ClipboardList className="w-9 h-9 text-violet-500 mx-auto mb-2" />
            <p className="font-semibold text-gray-800">Attendance</p>
            <p className="text-sm text-gray-500 mt-1">Mark daily attendance</p>
          </div>
        </Link>
      </div>

      <div className="mt-6">
        <MyTasksWidget />
      </div>
    </div>
  );
}

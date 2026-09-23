"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Users } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Student {
  id: string;
  leadId: string;
  studentName: string;
}

interface AttendanceRecord {
  leadId: string;
  date: string;
  status: AttendanceStatus;
}

const STATUS_DOT: Record<AttendanceStatus, string> = {
  PRESENT: "bg-green-500",
  ABSENT:  "bg-red-500",
  LATE:    "bg-amber-400",
  EXCUSED: "bg-gray-400",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  PRESENT: "P", ABSENT: "A", LATE: "L", EXCUSED: "E",
};

function pctColor(pct: number) {
  if (pct >= 80) return "text-green-600 bg-green-50";
  if (pct >= 60) return "text-amber-600 bg-amber-50";
  return "text-red-600 bg-red-50";
}

export default function AttendanceHistoryClient() {
  const today = new Date();
  const defaultMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;

  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(defaultMonth);

  const { data: refData } = useQuery({
    queryKey: ["reference"],
    queryFn: () => fetch("/api/reference").then((r) => r.json()),
    staleTime: 10 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["attendance-report", selectedShiftId, selectedMonth],
    queryFn: () =>
      fetch(`/api/attendance/report?shiftId=${selectedShiftId}&month=${selectedMonth}`).then((r) => r.json()),
    enabled: !!selectedShiftId && !!selectedMonth,
    staleTime: 60_000,
  });

  const students: Student[] = data?.students ?? [];
  const records: AttendanceRecord[] = data?.records ?? [];
  const days: string[] = data?.days ?? [];

  // Build lookup: leadId -> date -> status
  const recordMap = useMemo(() => {
    const m: Record<string, Record<string, AttendanceStatus>> = {};
    for (const r of records) {
      if (!m[r.leadId]) m[r.leadId] = {};
      m[r.leadId][r.date] = r.status;
    }
    return m;
  }, [records]);

  // Per-student summary stats
  const summaries = useMemo(() => {
    return students.map((s) => {
      const sr = recordMap[s.id] ?? {};
      const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
      for (const status of Object.values(sr)) counts[status as AttendanceStatus]++;
      const total = days.length;
      const attended = counts.PRESENT + counts.LATE;
      const pct = total > 0 ? Math.round((attended / total) * 100) : 0;
      return { ...s, counts, total, pct };
    });
  }, [students, recordMap, days]);

  const shifts = refData?.shifts ?? [];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-4 items-end">
        <div className="space-y-1.5 flex-1 min-w-[160px]">
          <Label>Shift</Label>
          <Select value={selectedShiftId} onValueChange={setSelectedShiftId}>
            <SelectTrigger><SelectValue placeholder="Select shift" /></SelectTrigger>
            <SelectContent>
              {shifts.map((s: { id: string; name: string; startTime: string; endTime: string }) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name} ({s.startTime}–{s.endTime})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 flex-1 min-w-[140px]">
          <Label>Month</Label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {!selectedShiftId && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <CalendarDays size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Select a shift to view history</p>
        </div>
      )}

      {selectedShiftId && isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
        </div>
      )}

      {selectedShiftId && !isLoading && students.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <Users size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No students in this shift</p>
        </div>
      )}

      {selectedShiftId && !isLoading && students.length > 0 && days.length === 0 && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <CalendarDays size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500">No attendance records for this period</p>
        </div>
      )}

      {selectedShiftId && !isLoading && students.length > 0 && days.length > 0 && (
        <>
          {/* Summary table */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-700">Monthly Summary</span>
              <div className="flex items-center gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" />Present</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Absent</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />Late</span>
                <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />Excused</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2.5 font-medium text-gray-600 min-w-[160px]">Student</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600">P</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600">A</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600">L</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600">E</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600">Days</th>
                    <th className="text-center px-3 py-2.5 font-medium text-gray-600">%</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {summaries.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2.5">
                        <p className="font-medium text-gray-900 text-sm">{s.studentName}</p>
                        <p className="text-xs text-gray-400">{s.leadId}</p>
                      </td>
                      <td className="px-3 py-2.5 text-center text-green-600 font-semibold">{s.counts.PRESENT}</td>
                      <td className="px-3 py-2.5 text-center text-red-600 font-semibold">{s.counts.ABSENT}</td>
                      <td className="px-3 py-2.5 text-center text-amber-600 font-semibold">{s.counts.LATE}</td>
                      <td className="px-3 py-2.5 text-center text-gray-500 font-semibold">{s.counts.EXCUSED}</td>
                      <td className="px-3 py-2.5 text-center text-gray-500">{s.total}</td>
                      <td className="px-3 py-2.5 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${pctColor(s.pct)}`}>
                          {s.pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Date grid */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-4 py-3 border-b bg-gray-50">
              <span className="text-sm font-semibold text-gray-700">Daily Grid</span>
            </div>
            <div className="overflow-x-auto">
              <table className="text-xs min-w-max">
                <thead>
                  <tr className="border-b">
                    <th className="text-left px-4 py-2 font-medium text-gray-600 sticky left-0 bg-white z-10 min-w-[160px]">Student</th>
                    {days.map((d) => (
                      <th key={d} className="text-center px-2 py-2 font-medium text-gray-500 min-w-[32px]">
                        {String(parseInt(d.slice(8)))}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {students.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 sticky left-0 bg-white z-10">
                        <p className="font-medium text-gray-800 truncate max-w-[140px]">{s.studentName}</p>
                      </td>
                      {days.map((d) => {
                        const status = recordMap[s.id]?.[d];
                        return (
                          <td key={d} className="px-2 py-2 text-center">
                            {status ? (
                              <span
                                title={status}
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-white text-[10px] font-bold ${STATUS_DOT[status]}`}
                              >
                                {STATUS_LABEL[status]}
                              </span>
                            ) : (
                              <span className="text-gray-200">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

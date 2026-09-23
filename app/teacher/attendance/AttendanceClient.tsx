"use client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, CheckCircle2, XCircle, Clock, AlertCircle, Users, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

type AttendanceStatus = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

interface Student {
  id: string;
  leadId: string;
  studentName: string;
  studentStatus: string | null;
  classType: string | null;
}

interface AttendanceRecord {
  id: string;
  status: AttendanceStatus;
  notes: string | null;
}

const STATUS_CONFIG: Record<AttendanceStatus, { label: string; bg: string; text: string; icon: React.ReactNode }> = {
  PRESENT: { label: "Present", bg: "bg-green-100 border-green-300 text-green-700", text: "text-green-700", icon: <CheckCircle2 size={14} /> },
  ABSENT:  { label: "Absent",  bg: "bg-red-100 border-red-300 text-red-700",       text: "text-red-700",   icon: <XCircle size={14} /> },
  LATE:    { label: "Late",    bg: "bg-amber-100 border-amber-300 text-amber-700",  text: "text-amber-700", icon: <Clock size={14} /> },
  EXCUSED: { label: "Excused", bg: "bg-gray-100 border-gray-300 text-gray-600",    text: "text-gray-600",  icon: <AlertCircle size={14} /> },
};

export default function AttendanceClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const today = new Date().toISOString().slice(0, 10);
  const [selectedShiftId, setSelectedShiftId] = useState("");
  const [selectedDate, setSelectedDate] = useState(today);
  const [attendance, setAttendance] = useState<Record<string, AttendanceStatus>>({});
  const [saving, setSaving] = useState(false);

  const { data: refData } = useQuery({
    queryKey: ["reference"],
    queryFn: () => fetch("/api/reference").then((r) => r.json()),
    staleTime: 10 * 60_000,
  });

  const { data, isLoading } = useQuery({
    queryKey: ["attendance", selectedShiftId, selectedDate],
    queryFn: () =>
      fetch(`/api/attendance?shiftId=${selectedShiftId}&date=${selectedDate}`).then((r) => r.json()),
    enabled: !!selectedShiftId && !!selectedDate,
    staleTime: 30_000,
  });

  useEffect(() => {
    if (!data?.students) return;
    const initial: Record<string, AttendanceStatus> = {};
    for (const student of data.students) {
      initial[student.id] = data.attendanceMap?.[student.id]?.status ?? "PRESENT";
    }
    setAttendance(initial);
  }, [data]);

  const students: Student[] = data?.students ?? [];
  const existingMap: Record<string, AttendanceRecord> = data?.attendanceMap ?? {};

  const stats = useMemo(() => {
    const counts = { PRESENT: 0, ABSENT: 0, LATE: 0, EXCUSED: 0 };
    Object.values(attendance).forEach((s) => counts[s]++);
    return counts;
  }, [attendance]);

  function setAll(status: AttendanceStatus) {
    const next: Record<string, AttendanceStatus> = {};
    students.forEach((s) => (next[s.id] = status));
    setAttendance(next);
  }

  async function saveAttendance() {
    if (!selectedShiftId || students.length === 0) return;
    setSaving(true);
    try {
      const records = students.map((s) => ({
        leadId: s.id,
        shiftId: selectedShiftId,
        date: selectedDate,
        status: attendance[s.id] ?? "PRESENT",
      }));
      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });
      if (res.ok) {
        queryClient.invalidateQueries({ queryKey: ["attendance", selectedShiftId, selectedDate] });
        toast({ title: `Attendance saved for ${records.length} students` });
      } else {
        toast({ variant: "destructive", title: "Error saving attendance" });
      }
    } finally {
      setSaving(false);
    }
  }

  const shifts = refData?.shifts ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="text-sm text-gray-500 mt-0.5">Mark daily attendance for your students</p>
      </div>

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
          <Label>Date</Label>
          <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
        </div>
      </div>

      {selectedShiftId && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3">
            {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
              <div key={s} className={`rounded-xl border p-3 text-center ${STATUS_CONFIG[s].bg}`}>
                <p className={`text-2xl font-bold ${STATUS_CONFIG[s].text}`}>{stats[s]}</p>
                <p className={`text-xs font-medium ${STATUS_CONFIG[s].text}`}>{STATUS_CONFIG[s].label}</p>
              </div>
            ))}
          </div>

          {/* Bulk actions */}
          {students.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500 mr-1">Mark all:</span>
              <Button size="sm" variant="outline" className="text-green-700 border-green-300 hover:bg-green-50" onClick={() => setAll("PRESENT")}>
                <CheckCircle2 size={13} className="mr-1" />Present
              </Button>
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50" onClick={() => setAll("ABSENT")}>
                <XCircle size={13} className="mr-1" />Absent
              </Button>
            </div>
          )}

          {/* Student list */}
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border">
              <Users size={32} className="mx-auto text-gray-300 mb-2" />
              <p className="text-sm text-gray-500">No students in this shift</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border divide-y">
              {students.map((student, idx) => {
                const current = attendance[student.id] ?? "PRESENT";
                return (
                  <div key={student.id} className="flex items-center gap-4 px-4 py-3">
                    <div className="w-8 h-8 rounded-full bg-gray-100 text-gray-600 text-sm font-bold flex items-center justify-center flex-shrink-0">
                      {idx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{student.studentName}</p>
                      <p className="text-xs text-gray-400">{student.leadId}{student.classType ? ` · ${student.classType.replace("_", " ")}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(["PRESENT", "ABSENT", "LATE", "EXCUSED"] as AttendanceStatus[]).map((s) => (
                        <button
                          key={s}
                          onClick={() => setAttendance((prev) => ({ ...prev, [student.id]: s }))}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                            current === s
                              ? STATUS_CONFIG[s].bg + " shadow-sm"
                              : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-gray-100"
                          }`}
                        >
                          {STATUS_CONFIG[s].icon}
                          <span className="hidden sm:inline">{STATUS_CONFIG[s].label}</span>
                        </button>
                      ))}
                    </div>
                    {existingMap[student.id] && (
                      <span className="text-[10px] text-gray-400 hidden lg:block">saved</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {students.length > 0 && (
            <div className="flex justify-end">
              <Button onClick={saveAttendance} disabled={saving} className="gap-2">
                <Save size={15} />Save Attendance ({students.length} students)
              </Button>
            </div>
          )}
        </>
      )}

      {!selectedShiftId && (
        <div className="text-center py-16 bg-white rounded-xl border">
          <CalendarDays size={36} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">Select a shift to mark attendance</p>
        </div>
      )}
    </div>
  );
}

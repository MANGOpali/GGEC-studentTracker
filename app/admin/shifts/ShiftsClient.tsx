"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Clock, Users, Power, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface Shift {
  id: string;
  name: string;
  startTime: string;
  endTime: string;
  days: string[];
  isActive: boolean;
  branch: { id: string; name: string } | null;
  _count: { leads: number };
}

const DAY_LABELS: Record<string, string> = {
  MON: "Mon", TUE: "Tue", WED: "Wed", THU: "Thu", FRI: "Fri", SAT: "Sat", SUN: "Sun",
};
const ALL_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

const emptyForm = { name: "", startTime: "", endTime: "", days: [] as string[], branchId: "" };

export default function ShiftsClient() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showDialog, setShowDialog] = useState(false);
  const [editShift, setEditShift] = useState<Shift | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [showInactive, setShowInactive] = useState(false);

  const { data: shiftsData, isLoading } = useQuery({
    queryKey: ["shifts", showInactive],
    queryFn: () => fetch(`/api/shifts?all=${showInactive ? "1" : "0"}`).then((r) => r.json()),
    staleTime: 30_000,
  });
  const { data: refData } = useQuery({
    queryKey: ["reference"],
    queryFn: () => fetch("/api/reference").then((r) => r.json()),
    staleTime: 600_000,
  });

  const shifts: Shift[] = shiftsData?.shifts ?? [];

  function openCreate() {
    setEditShift(null);
    setForm(emptyForm);
    setShowDialog(true);
  }

  function openEdit(shift: Shift) {
    setEditShift(shift);
    setForm({ name: shift.name, startTime: shift.startTime, endTime: shift.endTime, days: [...shift.days], branchId: shift.branch?.id ?? "" });
    setShowDialog(true);
  }

  function toggleDay(day: string) {
    setForm((f) => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter((d) => d !== day) : [...f.days, day],
    }));
  }

  async function save() {
    if (!form.name || !form.startTime || !form.endTime || !form.days.length) {
      toast({ variant: "destructive", title: "Fill in all required fields" });
      return;
    }
    setSaving(true);
    try {
      const url = editShift ? `/api/shifts/${editShift.id}` : "/api/shifts";
      const method = editShift ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, branchId: form.branchId || null }),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ variant: "destructive", title: d.error ?? "Error saving shift" });
        return;
      }
      queryClient.invalidateQueries({ queryKey: ["shifts"] });
      queryClient.invalidateQueries({ queryKey: ["reference"] });
      toast({ title: editShift ? "Shift updated" : "Shift created" });
      setShowDialog(false);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(shift: Shift) {
    await fetch(`/api/shifts/${shift.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !shift.isActive }),
    });
    queryClient.invalidateQueries({ queryKey: ["shifts"] });
    queryClient.invalidateQueries({ queryKey: ["reference"] });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Shifts</h1>
          <p className="text-sm text-gray-500 mt-0.5">{shifts.length} shift{shifts.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowInactive(!showInactive)}>
            {showInactive ? "Hide Inactive" : "Show Inactive"}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus size={14} className="mr-1" />New Shift
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-40 rounded-2xl" />)
        ) : shifts.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400">
            <Clock size={32} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No shifts yet</p>
            <p className="text-sm mt-1">Create your first shift to get started</p>
          </div>
        ) : (
          shifts.map((shift) => (
            <div key={shift.id} className={cn("bg-white rounded-2xl border shadow-sm p-5 space-y-3", !shift.isActive && "opacity-60")}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">{shift.name}</h3>
                  {shift.branch && <p className="text-xs text-gray-400 mt-0.5">{shift.branch.name}</p>}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(shift)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil size={13} />
                  </button>
                  <button
                    onClick={() => toggleActive(shift)}
                    className={cn("p-1.5 rounded-lg transition-colors", shift.isActive ? "text-gray-400 hover:text-red-500 hover:bg-red-50" : "text-gray-300 hover:text-green-600 hover:bg-green-50")}
                    title={shift.isActive ? "Deactivate" : "Activate"}
                  >
                    <Power size={13} />
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Clock size={14} className="text-blue-500 flex-shrink-0" />
                <span className="font-medium">{shift.startTime} – {shift.endTime}</span>
              </div>

              <div className="flex flex-wrap gap-1">
                {ALL_DAYS.map((d) => (
                  <span key={d} className={cn("px-2 py-0.5 rounded text-[11px] font-medium", shift.days.includes(d) ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-300")}>
                    {DAY_LABELS[d]}
                  </span>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-xs text-gray-500 border-t border-gray-50 pt-3">
                <Users size={12} />
                <span>{shift._count.leads} student{shift._count.leads !== 1 ? "s" : ""}</span>
                {!shift.isActive && <span className="ml-auto text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Inactive</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editShift ? "Edit Shift" : "New Shift"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Shift Name *</Label>
              <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Batch A" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Start Time *</Label>
                <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>End Time *</Label>
                <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Days *</Label>
              <div className="flex flex-wrap gap-2">
                {ALL_DAYS.map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleDay(d)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors",
                      form.days.includes(d) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200 hover:border-blue-300"
                    )}
                  >
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Branch</Label>
              <Select value={form.branchId || "none"} onValueChange={(v) => setForm((f) => ({ ...f, branchId: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="All branches" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">All branches</SelectItem>
                  {(refData?.branches ?? []).map((b: { id: string; name: string }) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.name || !form.startTime || !form.endTime || !form.days.length}>
              {saving ? "Saving…" : editShift ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

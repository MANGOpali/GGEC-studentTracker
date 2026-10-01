"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Eye, EyeOff, Copy, Plus, Trash2, Pencil, Check } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface Credential {
  id: string;
  label: string;
  username: string | null;
  password: string;
  notes: string | null;
  createdBy: { name: string };
  createdAt: string;
}

const PRESET_LABELS = ["UCAS", "University Portal", "UKVI Account", "Student Email", "VFS Global", "Other"];

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }
  return (
    <button onClick={copy} title="Copy"
      className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
      {copied ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
    </button>
  );
}

export default function CredentialsSection({
  leadId,
  myRole,
}: {
  leadId: string;
  myRole: string;
}) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Credential | null>(null);
  const [visibleIds, setVisibleIds] = useState<Set<string>>(new Set());
  const [deleteTarget, setDeleteTarget] = useState<Credential | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ label: "", username: "", password: "", notes: "" });

  const canEdit = myRole !== "TEACHER";

  const { data, isLoading } = useQuery({
    queryKey: ["credentials", leadId],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${leadId}/credentials`);
      return (await res.json()).credentials as Credential[];
    },
    staleTime: 30_000,
  });

  const credentials = data ?? [];

  function openAdd() {
    setEditing(null);
    setForm({ label: "", username: "", password: "", notes: "" });
    setDialogOpen(true);
  }

  function openEdit(c: Credential) {
    setEditing(c);
    setForm({ label: c.label, username: c.username ?? "", password: c.password, notes: c.notes ?? "" });
    setDialogOpen(true);
  }

  function toggleVisible(id: string) {
    setVisibleIds((prev) => {
      const n = new Set(prev);
      if (n.has(id)) { n.delete(id); } else { n.add(id); }
      return n;
    });
  }

  async function save() {
    if (!form.label.trim() || !form.password.trim()) return;
    setSaving(true);
    try {
      const url = editing
        ? `/api/leads/${leadId}/credentials/${editing.id}`
        : `/api/leads/${leadId}/credentials`;
      const res = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const d = await res.json();
        toast({ variant: "destructive", title: "Error", description: d.error });
        return;
      }
      await queryClient.invalidateQueries({ queryKey: ["credentials", leadId] });
      setDialogOpen(false);
      toast({ title: editing ? "Credential updated" : "Credential saved" });
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    await fetch(`/api/leads/${leadId}/credentials/${deleteTarget.id}`, { method: "DELETE" });
    await queryClient.invalidateQueries({ queryKey: ["credentials", leadId] });
    setDeleteTarget(null);
    toast({ title: "Deleted" });
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
            <KeyRound size={13} className="text-amber-600" />
          </div>
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Portal Credentials</span>
          {credentials.length > 0 && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{credentials.length}</span>
          )}
        </div>
        {canEdit && (
          <button onClick={openAdd}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Plus size={13} /> Add
          </button>
        )}
      </div>

      {/* Body */}
      <div className="divide-y divide-gray-50">
        {isLoading ? (
          <div className="px-5 py-6 text-center text-sm text-gray-400">Loading…</div>
        ) : credentials.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <KeyRound size={24} className="mx-auto mb-2 text-gray-200" />
            <p className="text-sm text-gray-400">No credentials saved yet</p>
            {canEdit && (
              <button onClick={openAdd}
                className="mt-3 text-xs text-blue-600 hover:underline font-medium">
                Add first credential
              </button>
            )}
          </div>
        ) : (
          credentials.map((c) => {
            const visible = visibleIds.has(c.id);
            return (
              <div key={c.id} className="px-5 py-3.5 group hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {/* Label */}
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-100">
                        {c.label}
                      </span>
                    </div>
                    {/* Username */}
                    {c.username && (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">Username</span>
                        <span className="text-xs font-mono text-gray-700 flex-1 truncate">{c.username}</span>
                        <CopyButton value={c.username} />
                      </div>
                    )}
                    {/* Password */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] text-gray-400 w-16 flex-shrink-0">Password</span>
                      <span className={cn("text-xs font-mono flex-1 truncate", visible ? "text-gray-700" : "text-gray-400 tracking-widest select-none")}>
                        {visible ? c.password : "••••••••"}
                      </span>
                      <button onClick={() => toggleVisible(c.id)} title={visible ? "Hide" : "Show"}
                        className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors flex-shrink-0">
                        {visible ? <EyeOff size={13} /> : <Eye size={13} />}
                      </button>
                      <CopyButton value={c.password} />
                    </div>
                    {/* Notes */}
                    {c.notes && (
                      <p className="text-xs text-gray-400 italic pt-0.5">{c.notes}</p>
                    )}
                  </div>
                  {/* Actions */}
                  {canEdit && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                      <button onClick={() => openEdit(c)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                        <Pencil size={12} />
                      </button>
                      <button onClick={() => setDeleteTarget(c)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                        <Trash2 size={12} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Credential" : "Add Portal Credential"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Label */}
            <div className="space-y-1.5">
              <Label>Portal / Service</Label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {PRESET_LABELS.map((l) => (
                  <button key={l} type="button"
                    onClick={() => setForm((f) => ({ ...f, label: l }))}
                    className={cn(
                      "px-2.5 py-1 rounded-full text-xs font-medium border transition-colors",
                      form.label === l
                        ? "bg-amber-500 text-white border-amber-500"
                        : "bg-white text-gray-600 border-gray-200 hover:border-amber-300 hover:text-amber-700"
                    )}>
                    {l}
                  </button>
                ))}
              </div>
              <Input
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Or type custom label…"
              />
            </div>
            {/* Username / Email */}
            <div className="space-y-1.5">
              <Label>Username / Email</Label>
              <Input
                value={form.username}
                onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                placeholder="student@email.com or applicant ID"
                autoComplete="off"
              />
            </div>
            {/* Password */}
            <div className="space-y-1.5">
              <Label>Password <span className="text-red-500">*</span></Label>
              <Input
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                placeholder="Enter password"
                autoComplete="new-password"
              />
            </div>
            {/* Notes */}
            <div className="space-y-1.5">
              <Label>Notes <span className="text-gray-400 font-normal">(optional)</span></Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="e.g. Reset required after first login"
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={save} disabled={saving || !form.label.trim() || !form.password.trim()}>
              {saving ? "Saving…" : editing ? "Update" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete credential?</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-500">
            This will permanently remove the <strong>{deleteTarget?.label}</strong> credential. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

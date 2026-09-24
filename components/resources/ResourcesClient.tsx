"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, GraduationCap, StickyNote, Globe, DollarSign, X, ExternalLink, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createUniversitySchema, createCounsellorNoteSchema, type CreateUniversityInput, type CreateCounsellorNoteInput } from "@/lib/validations";
import { formatRelative } from "@/lib/utils";

type University = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  tuitionFeeMin: number | null;
  tuitionFeeMax: number | null;
  currency: string;
  courses: string[];
  notes: string | null;
  website: string | null;
  createdBy: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

type CounsellorNote = {
  id: string;
  title: string;
  content: string;
  tags: string[];
  counsellor: { id: string; name: string };
  createdAt: string;
  updatedAt: string;
};

type Props = {
  isAdmin?: boolean;
  counsellors?: { id: string; name: string }[];
};

export default function ResourcesClient({ isAdmin = false, counsellors = [] }: Props) {
  const [activeTab, setActiveTab] = useState<"universities" | "notes">("universities");
  const [filterCounsellorId, setFilterCounsellorId] = useState("");
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // ---------- Universities ----------
  const { data: uniData, isLoading: uniLoading } = useQuery({
    queryKey: ["universities", filterCounsellorId],
    queryFn: async () => {
      const url = filterCounsellorId
        ? `/api/universities?counsellorId=${filterCounsellorId}`
        : "/api/universities";
      const res = await fetch(url);
      const json = await res.json();
      return json.universities as University[];
    },
  });

  // ---------- Notes ----------
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ["counsellor-notes", filterCounsellorId],
    queryFn: async () => {
      const url = filterCounsellorId
        ? `/api/counsellor-notes?counsellorId=${filterCounsellorId}`
        : "/api/counsellor-notes";
      const res = await fetch(url);
      const json = await res.json();
      return json.notes as CounsellorNote[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resources</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage your university database and personal notes</p>
        </div>
        {isAdmin && counsellors.length > 0 && (
          <select
            value={filterCounsellorId}
            onChange={(e) => setFilterCounsellorId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("universities")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "universities" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <GraduationCap size={16} />
          Universities
          {uniData && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{uniData.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "notes" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-800"
          }`}
        >
          <StickyNote size={16} />
          My Notes
          {notesData && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{notesData.length}</span>}
        </button>
      </div>

      {activeTab === "universities" && (
        <UniversitiesTab
          universities={uniData ?? []}
          loading={uniLoading}
          isAdmin={isAdmin}
          onMutate={() => queryClient.invalidateQueries({ queryKey: ["universities"] })}
        />
      )}

      {activeTab === "notes" && (
        <NotesTab
          notes={notesData ?? []}
          loading={notesLoading}
          isAdmin={isAdmin}
          onMutate={() => queryClient.invalidateQueries({ queryKey: ["counsellor-notes"] })}
        />
      )}
    </div>
  );
}

// ============================================================
// UNIVERSITIES TAB
// ============================================================

function UniversitiesTab({
  universities,
  loading,
  isAdmin,
  onMutate,
}: {
  universities: University[];
  loading: boolean;
  isAdmin: boolean;
  onMutate: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null);
  const [courseInput, setCourseInput] = useState("");
  const { toast } = useToast();

  const form = useForm<CreateUniversityInput>({
    resolver: zodResolver(createUniversitySchema),
    defaultValues: { name: "", country: "", city: "", currency: "USD", courses: [], notes: "", website: "" },
  });

  const courses = form.watch("courses") ?? [];

  function openAdd() {
    setEditing(null);
    form.reset({ name: "", country: "", city: "", currency: "USD", courses: [], notes: "", website: "" });
    setCourseInput("");
    setDialogOpen(true);
  }

  function openEdit(u: University) {
    setEditing(u);
    form.reset({
      name: u.name,
      country: u.country ?? "",
      city: u.city ?? "",
      tuitionFeeMin: u.tuitionFeeMin ?? undefined,
      tuitionFeeMax: u.tuitionFeeMax ?? undefined,
      currency: u.currency,
      courses: u.courses,
      notes: u.notes ?? "",
      website: u.website ?? "",
    });
    setCourseInput("");
    setDialogOpen(true);
  }

  function addCourse() {
    const trimmed = courseInput.trim();
    if (!trimmed || courses.includes(trimmed)) return;
    form.setValue("courses", [...courses, trimmed]);
    setCourseInput("");
  }

  function removeCourse(course: string) {
    form.setValue("courses", courses.filter((c) => c !== course));
  }

  async function onSubmit(data: CreateUniversityInput) {
    const url = editing ? `/api/universities/${editing.id}` : "/api/universities";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save university." });
      return;
    }
    toast({ title: editing ? "University updated" : "University added" });
    setDialogOpen(false);
    onMutate();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/universities/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { toast({ variant: "destructive", title: "Error", description: "Failed to delete." }); return; }
    toast({ title: "University removed" });
    setDeleteTarget(null);
    onMutate();
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{universities.length} {universities.length === 1 ? "university" : "universities"}</p>
        {!isAdmin && (
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus size={15} /> Add University
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-48 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : universities.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No universities yet</p>
          {!isAdmin && <p className="text-sm mt-1">Add your first university to start building your reference list.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {universities.map((u) => (
            <div key={u.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{u.name}</h3>
                  {(u.country || u.city) && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                      <Globe size={12} />
                      {[u.city, u.country].filter(Boolean).join(", ")}
                    </p>
                  )}
                </div>
                {!isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              {(u.tuitionFeeMin || u.tuitionFeeMax) && (
                <div className="flex items-center gap-1.5 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-1.5">
                  <DollarSign size={13} />
                  <span className="font-medium">
                    {u.tuitionFeeMin && u.tuitionFeeMax
                      ? `${u.currency} ${u.tuitionFeeMin.toLocaleString()} – ${u.tuitionFeeMax.toLocaleString()}`
                      : u.tuitionFeeMin
                      ? `From ${u.currency} ${u.tuitionFeeMin.toLocaleString()}`
                      : `Up to ${u.currency} ${u.tuitionFeeMax!.toLocaleString()}`}
                  </span>
                </div>
              )}

              {u.courses.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {u.courses.map((c) => (
                    <span key={c} className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">{c}</span>
                  ))}
                </div>
              )}

              {u.notes && (
                <p className="text-sm text-gray-600 line-clamp-2 bg-gray-50 rounded-lg px-3 py-2">{u.notes}</p>
              )}

              <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-100">
                <span className="text-xs text-gray-400">{formatRelative(u.updatedAt)}</span>
                {u.website && (
                  <a href={u.website} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline flex items-center gap-1">
                    Visit <ExternalLink size={10} />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit University" : "Add University"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div>
              <Label>University Name *</Label>
              <Input {...form.register("name")} placeholder="e.g. University of Melbourne" className="mt-1" />
              {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Country</Label>
                <Input {...form.register("country")} placeholder="e.g. Australia" className="mt-1" />
              </div>
              <div>
                <Label>City</Label>
                <Input {...form.register("city")} placeholder="e.g. Melbourne" className="mt-1" />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Min Fee</Label>
                <Input
                  type="number"
                  placeholder="20000"
                  className="mt-1"
                  {...form.register("tuitionFeeMin", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
                />
              </div>
              <div>
                <Label>Max Fee</Label>
                <Input
                  type="number"
                  placeholder="40000"
                  className="mt-1"
                  {...form.register("tuitionFeeMax", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
                />
              </div>
              <div>
                <Label>Currency</Label>
                <select
                  {...form.register("currency")}
                  className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {["USD", "AUD", "GBP", "CAD", "EUR", "NZD", "NPR"].map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <Label>Available Courses</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={courseInput}
                  onChange={(e) => setCourseInput(e.target.value)}
                  placeholder="e.g. MBA, Computer Science"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCourse(); } }}
                />
                <Button type="button" variant="outline" onClick={addCourse} size="sm">Add</Button>
              </div>
              {courses.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {courses.map((c) => (
                    <span key={c} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full border border-blue-100">
                      {c}
                      <button type="button" onClick={() => removeCourse(c)} className="hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div>
              <Label>Website</Label>
              <Input {...form.register("website")} placeholder="https://university.edu.au" className="mt-1" />
            </div>

            <div>
              <Label>Notes</Label>
              <Textarea {...form.register("notes")} placeholder="Scholarship info, deadlines, requirements..." rows={3} className="mt-1 resize-none" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : editing ? "Save Changes" : "Add University"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove University</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Remove <span className="font-semibold">{deleteTarget?.name}</span> from your list?
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ============================================================
// NOTES TAB
// ============================================================

function NotesTab({
  notes,
  loading,
  isAdmin,
  onMutate,
}: {
  notes: CounsellorNote[];
  loading: boolean;
  isAdmin: boolean;
  onMutate: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CounsellorNote | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CounsellorNote | null>(null);
  const [tagInput, setTagInput] = useState("");
  const { toast } = useToast();

  const form = useForm<CreateCounsellorNoteInput>({
    resolver: zodResolver(createCounsellorNoteSchema),
    defaultValues: { title: "", content: "", tags: [] },
  });

  const tags = form.watch("tags") ?? [];

  function openAdd() {
    setEditing(null);
    form.reset({ title: "", content: "", tags: [] });
    setTagInput("");
    setDialogOpen(true);
  }

  function openEdit(n: CounsellorNote) {
    setEditing(n);
    form.reset({ title: n.title, content: n.content, tags: n.tags });
    setTagInput("");
    setDialogOpen(true);
  }

  function addTag() {
    const trimmed = tagInput.trim().toLowerCase();
    if (!trimmed || tags.includes(trimmed)) return;
    form.setValue("tags", [...tags, trimmed]);
    setTagInput("");
  }

  function removeTag(tag: string) {
    form.setValue("tags", tags.filter((t) => t !== tag));
  }

  async function onSubmit(data: CreateCounsellorNoteInput) {
    const url = editing ? `/api/counsellor-notes/${editing.id}` : "/api/counsellor-notes";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      toast({ variant: "destructive", title: "Error", description: "Failed to save note." });
      return;
    }
    toast({ title: editing ? "Note updated" : "Note added" });
    setDialogOpen(false);
    onMutate();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/counsellor-notes/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { toast({ variant: "destructive", title: "Error", description: "Failed to delete note." }); return; }
    toast({ title: "Note deleted" });
    setDeleteTarget(null);
    onMutate();
  }

  const tagColors = ["bg-purple-50 text-purple-700 border-purple-100", "bg-orange-50 text-orange-700 border-orange-100", "bg-teal-50 text-teal-700 border-teal-100", "bg-pink-50 text-pink-700 border-pink-100"];

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-sm text-gray-500">{notes.length} {notes.length === 1 ? "note" : "notes"}</p>
        {!isAdmin && (
          <Button onClick={openAdd} size="sm" className="gap-2">
            <Plus size={15} /> Add Note
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <StickyNote size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No notes yet</p>
          {!isAdmin && <p className="text-sm mt-1">Jot down important information, strategies, or reminders.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {notes.map((n, idx) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 leading-tight">{n.title}</h3>
                {!isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => setDeleteTarget(n)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-600 line-clamp-4 flex-1 whitespace-pre-wrap">{n.content}</p>

              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {n.tags.map((t, ti) => (
                    <span key={t} className={`text-xs px-2 py-0.5 rounded-full border ${tagColors[ti % tagColors.length]}`}>
                      #{t}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-gray-100 mt-auto">
                <span className="text-xs text-gray-400">{formatRelative(n.updatedAt)}</span>
                {isAdmin && <span className="text-xs text-gray-400">{n.counsellor.name}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Note" : "Add Note"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input {...form.register("title")} placeholder="e.g. Canada Study Abroad Tips" className="mt-1" />
              {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
            </div>

            <div>
              <Label>Content *</Label>
              <Textarea
                {...form.register("content")}
                placeholder="Write your notes here..."
                rows={6}
                className="mt-1 resize-none"
              />
              {form.formState.errors.content && <p className="text-xs text-red-500 mt-1">{form.formState.errors.content.message}</p>}
            </div>

            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  placeholder="e.g. visa, scholarship"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }}
                />
                <Button type="button" variant="outline" onClick={addTag} size="sm">Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => (
                    <span key={t} className="flex items-center gap-1 text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-full border border-purple-100">
                      #{t}
                      <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500">
                        <X size={10} />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Saving..." : editing ? "Save Changes" : "Add Note"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Note</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Delete <span className="font-semibold">{deleteTarget?.title}</span>? This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

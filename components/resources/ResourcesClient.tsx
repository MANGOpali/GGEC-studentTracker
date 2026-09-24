"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Pencil, Trash2, GraduationCap, StickyNote, Globe, DollarSign, X, ExternalLink, Search, ChevronDown, ChevronRight, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createUniversitySchema, createCounsellorNoteSchema, type CreateUniversityInput, type CreateCounsellorNoteInput } from "@/lib/validations";
import { formatRelative, cn } from "@/lib/utils";

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

  const { data: uniData, isLoading: uniLoading } = useQuery({
    queryKey: ["universities", filterCounsellorId],
    queryFn: async () => {
      const url = filterCounsellorId ? `/api/universities?counsellorId=${filterCounsellorId}` : "/api/universities";
      const res = await fetch(url);
      return (await res.json()).universities as University[];
    },
  });

  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ["counsellor-notes", filterCounsellorId],
    queryFn: async () => {
      const url = filterCounsellorId ? `/api/counsellor-notes?counsellorId=${filterCounsellorId}` : "/api/counsellor-notes";
      const res = await fetch(url);
      return (await res.json()).notes as CounsellorNote[];
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
          {isAdmin ? "Notes" : "My Notes"}
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
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterCourse, setFilterCourse] = useState("");
  const [collapsedCountries, setCollapsedCountries] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const form = useForm<CreateUniversityInput>({
    resolver: zodResolver(createUniversitySchema),
    defaultValues: { name: "", country: "", city: "", currency: "USD", courses: [], notes: "", website: "" },
  });

  const courses = form.watch("courses") ?? [];

  const allCountries = useMemo(() => {
    const set = new Set(universities.map((u) => u.country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [universities]);

  const allCourses = useMemo(() => {
    const set = new Set(universities.flatMap((u) => u.courses));
    return Array.from(set).sort();
  }, [universities]);

  const filtered = useMemo(() => {
    return universities
      .filter((u) => {
        const q = search.toLowerCase();
        const matchSearch = !search ||
          u.name.toLowerCase().includes(q) ||
          (u.country ?? "").toLowerCase().includes(q) ||
          (u.city ?? "").toLowerCase().includes(q);
        const matchCountry = !filterCountry || u.country === filterCountry;
        const matchCourse = !filterCourse || u.courses.includes(filterCourse);
        return matchSearch && matchCountry && matchCourse;
      })
      .sort((a, b) => {
        const ca = a.country ?? "zzz";
        const cb = b.country ?? "zzz";
        return ca !== cb ? ca.localeCompare(cb) : a.name.localeCompare(b.name);
      });
  }, [universities, search, filterCountry, filterCourse]);

  const grouped = useMemo(() => {
    const map = new Map<string, University[]>();
    for (const u of filtered) {
      const key = u.country ?? "Other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(u);
    }
    return Array.from(map.entries());
  }, [filtered]);

  const allExpanded = collapsedCountries.size === 0;

  function toggleCountry(country: string) {
    setCollapsedCountries((prev) => {
      const next = new Set(prev);
      next.has(country) ? next.delete(country) : next.add(country);
      return next;
    });
  }

  function toggleAll() {
    if (allExpanded) {
      setCollapsedCountries(new Set(grouped.map(([c]) => c)));
    } else {
      setCollapsedCountries(new Set());
    }
  }

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

  function feeLabel(u: University) {
    if (!u.tuitionFeeMin && !u.tuitionFeeMax) return null;
    if (u.tuitionFeeMin && u.tuitionFeeMax)
      return `${u.currency} ${u.tuitionFeeMin.toLocaleString()} – ${u.tuitionFeeMax.toLocaleString()}`;
    if (u.tuitionFeeMin) return `From ${u.currency} ${u.tuitionFeeMin.toLocaleString()}`;
    return `Up to ${u.currency} ${u.tuitionFeeMax!.toLocaleString()}`;
  }

  const hasActiveFilters = search || filterCountry || filterCourse;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, country or city..."
            className="pl-9"
          />
        </div>
        <select
          value={filterCountry}
          onChange={(e) => setFilterCountry(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">All Countries</option>
          {allCountries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={filterCourse}
          onChange={(e) => setFilterCourse(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">All Courses</option>
          {allCourses.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <Button onClick={openAdd} size="sm" className="gap-2 shrink-0">
          <Plus size={15} /> Add University
        </Button>
      </div>

      {/* Meta row */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length} of {universities.length} {universities.length === 1 ? "university" : "universities"}
          {grouped.length > 0 && ` · ${grouped.length} ${grouped.length === 1 ? "country" : "countries"}`}
        </p>
        <div className="flex items-center gap-3">
          {hasActiveFilters && (
            <button
              onClick={() => { setSearch(""); setFilterCountry(""); setFilterCourse(""); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
            >
              <X size={11} /> Clear filters
            </button>
          )}
          {grouped.length > 1 && (
            <button onClick={toggleAll} className="text-xs text-gray-500 hover:text-gray-800 hover:underline">
              {allExpanded ? "Collapse all" : "Expand all"}
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{universities.length === 0 ? "No universities yet" : "No results match your filters"}</p>
          {universities.length === 0 && (
            <p className="text-sm mt-1">Add your first university to start building your reference list.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([country, items]) => {
            const isCollapsed = collapsedCountries.has(country);
            return (
              <div key={country} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Country accordion header */}
                <button
                  onClick={() => toggleCountry(country)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  {isCollapsed
                    ? <ChevronRight size={15} className="text-gray-400 shrink-0" />
                    : <ChevronDown size={15} className="text-gray-400 shrink-0" />
                  }
                  <Globe size={14} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-gray-800 text-sm flex-1">{country}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {items.length} {items.length === 1 ? "university" : "universities"}
                  </span>
                </button>

                {/* University rows */}
                {!isCollapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {items.map((u) => {
                      const fee = feeLabel(u);
                      return (
                        <div
                          key={u.id}
                          className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group"
                        >
                          {/* Name + city */}
                          <div className="min-w-0 w-48 shrink-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                            {u.city && <p className="text-xs text-gray-400 truncate">{u.city}</p>}
                          </div>

                          {/* Fee */}
                          <div className="w-44 shrink-0">
                            {fee ? (
                              <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md">
                                <DollarSign size={11} />
                                {fee}
                              </span>
                            ) : (
                              <span className="text-xs text-gray-300">—</span>
                            )}
                          </div>

                          {/* Courses */}
                          <div className="flex-1 flex flex-wrap gap-1.5 min-w-0">
                            {u.courses.length > 0 ? (
                              <>
                                {u.courses.slice(0, 4).map((c) => (
                                  <span
                                    key={c}
                                    onClick={(e) => { e.stopPropagation(); setFilterCourse(c === filterCourse ? "" : c); }}
                                    className={cn(
                                      "text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
                                      filterCourse === c
                                        ? "bg-blue-600 text-white border-blue-600"
                                        : "bg-blue-50 text-blue-700 border-blue-100 hover:bg-blue-100"
                                    )}
                                  >
                                    {c}
                                  </span>
                                ))}
                                {u.courses.length > 4 && (
                                  <span className="text-xs text-gray-400 px-1 py-0.5">+{u.courses.length - 4} more</span>
                                )}
                              </>
                            ) : (
                              <span className="text-xs text-gray-300">No courses listed</span>
                            )}
                          </div>

                          {/* Notes indicator */}
                          {u.notes && (
                            <div className="shrink-0" title={u.notes}>
                              <FileText size={14} className="text-gray-300 group-hover:text-gray-400 transition-colors" />
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                            {u.website && (
                              <a
                                href={u.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                title="Visit website"
                              >
                                <ExternalLink size={13} />
                              </a>
                            )}
                            <button
                              onClick={() => openEdit(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(u)}
                              className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>

                          {/* Admin: who added */}
                          {isAdmin && (
                            <span className="text-xs text-gray-300 shrink-0 w-20 truncate text-right hidden xl:block">
                              {u.createdBy.name}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
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
          <DialogHeader><DialogTitle>Remove University</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">
            Remove <span className="font-semibold">{deleteTarget?.name}</span> from the list?
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
  const [search, setSearch] = useState("");
  const [filterTag, setFilterTag] = useState("");
  const { toast } = useToast();

  const form = useForm<CreateCounsellorNoteInput>({
    resolver: zodResolver(createCounsellorNoteSchema),
    defaultValues: { title: "", content: "", tags: [] },
  });

  const tags = form.watch("tags") ?? [];

  const allTags = useMemo(() => {
    const set = new Set(notes.flatMap((n) => n.tags));
    return Array.from(set).sort();
  }, [notes]);

  const filtered = useMemo(() => {
    return notes.filter((n) => {
      const matchSearch = !search || n.title.toLowerCase().includes(search.toLowerCase()) || n.content.toLowerCase().includes(search.toLowerCase());
      const matchTag = !filterTag || n.tags.includes(filterTag);
      return matchSearch && matchTag;
    });
  }, [notes, search, filterTag]);

  const hasActiveFilters = search || filterTag;

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

  const tagColors = [
    "bg-purple-50 text-purple-700 border-purple-100",
    "bg-orange-50 text-orange-700 border-orange-100",
    "bg-teal-50 text-teal-700 border-teal-100",
    "bg-pink-50 text-pink-700 border-pink-100",
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search notes..."
            className="pl-9"
          />
        </div>
        <select
          value={filterTag}
          onChange={(e) => setFilterTag(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">All Tags</option>
          {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
        </select>
        <Button onClick={openAdd} size="sm" className="gap-2 shrink-0">
          <Plus size={15} /> Add Note
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length} of {notes.length} {notes.length === 1 ? "note" : "notes"}
        </p>
        {hasActiveFilters && (
          <button
            onClick={() => { setSearch(""); setFilterTag(""); }}
            className="text-xs text-blue-600 hover:underline flex items-center gap-1"
          >
            <X size={11} /> Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <div key={i} className="h-40 rounded-xl bg-gray-100 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <StickyNote size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{notes.length === 0 ? "No notes yet" : "No results match your filters"}</p>
          {notes.length === 0 && <p className="text-sm mt-1">Jot down important information, strategies, or reminders.</p>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((n) => (
            <div key={n.id} className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col gap-3 hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-semibold text-gray-900 leading-tight">{n.title}</h3>
                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => openEdit(n)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                    <Pencil size={14} />
                  </button>
                  <button onClick={() => setDeleteTarget(n)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <p className="text-sm text-gray-600 line-clamp-4 flex-1 whitespace-pre-wrap">{n.content}</p>

              {n.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {n.tags.map((t, ti) => (
                    <span
                      key={t}
                      onClick={() => setFilterTag(t === filterTag ? "" : t)}
                      className={`text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors ${
                        filterTag === t
                          ? "bg-purple-600 text-white border-purple-600"
                          : tagColors[ti % tagColors.length]
                      }`}
                    >
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
          <DialogHeader><DialogTitle>Delete Note</DialogTitle></DialogHeader>
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

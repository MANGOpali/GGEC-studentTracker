"use client";

import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, Pencil, Trash2, GraduationCap, StickyNote, Globe, DollarSign,
  X, ExternalLink, Search, ChevronDown, ChevronRight, Download,
  BookOpen, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { createUniversitySchema, createCounsellorNoteSchema, type CreateUniversityInput, type CreateCounsellorNoteInput } from "@/lib/validations";
import { formatRelative, cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type UniversityCourse = {
  id: string;
  courseName: string;
  courseLevel: string;
  intakeName: string | null;
  campusLocation: string | null;
};

type University = {
  id: string;
  name: string;
  country: string | null;
  city: string | null;
  tuitionFeeMin: number | null;
  tuitionFeeMax: number | null;
  currency: string;
  notes: string | null;
  website: string | null;
  flyer: string | null;
  academicCriteriaUG: string | null;
  academicCriteriaPG: string | null;
  englishCriteriaUG: string | null;
  englishCriteriaPG: string | null;
  englishWaiverUG: string | null;
  englishWaiverPG: string | null;
  universityCourses: UniversityCourse[];
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

type CourseInput = {
  courseName: string;
  courseLevel: string;
  intakeName: string;
  campusLocation: string;
};

type Props = {
  isAdmin?: boolean;
  counsellors?: { id: string; name: string }[];
};

const COURSE_LEVELS = ["UG", "PG", "Foundation", "Diploma", "Certificate", "Other"];

const LEVEL_COLORS: Record<string, string> = {
  UG:          "bg-blue-50 text-blue-700 border-blue-200",
  PG:          "bg-purple-50 text-purple-700 border-purple-200",
  Foundation:  "bg-amber-50 text-amber-700 border-amber-200",
  Diploma:     "bg-teal-50 text-teal-700 border-teal-200",
  Certificate: "bg-green-50 text-green-700 border-green-200",
  Other:       "bg-gray-50 text-gray-600 border-gray-200",
};

function levelColor(level: string) {
  return LEVEL_COLORS[level] ?? LEVEL_COLORS.Other;
}

// ─── Root ─────────────────────────────────────────────────────────────────────

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
          <p className="text-sm text-gray-500 mt-0.5">University database and personal notes</p>
        </div>
        {isAdmin && counsellors.length > 0 && (
          <select
            value={filterCounsellorId}
            onChange={(e) => setFilterCounsellorId(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Counsellors</option>
            {counsellors.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setActiveTab("universities")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "universities" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
        >
          <GraduationCap size={16} />
          Universities
          {uniData && <span className="bg-blue-100 text-blue-700 text-xs px-1.5 py-0.5 rounded-full">{uniData.length}</span>}
        </button>
        <button
          onClick={() => setActiveTab("notes")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "notes" ? "bg-white shadow-sm text-blue-600" : "text-gray-500 hover:text-gray-800"}`}
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

// ─── Universities Tab ─────────────────────────────────────────────────────────

function UniversitiesTab({ universities, loading, isAdmin, onMutate }: {
  universities: University[];
  loading: boolean;
  isAdmin: boolean;
  onMutate: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<University | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<University | null>(null);
  const [search, setSearch] = useState("");
  const [filterCountry, setFilterCountry] = useState("");
  const [filterLevel, setFilterLevel] = useState("");
  const [collapsedCountries, setCollapsedCountries] = useState<Set<string>>(new Set());
  const [expandedUnis, setExpandedUnis] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const allCountries = useMemo(() => {
    const set = new Set(universities.map((u) => u.country).filter(Boolean) as string[]);
    return Array.from(set).sort();
  }, [universities]);

  const allLevels = useMemo(() => {
    const set = new Set(universities.flatMap((u) => u.universityCourses.map((c) => c.courseLevel)));
    return Array.from(set).sort();
  }, [universities]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return universities
      .filter((u) => {
        const matchSearch = !search ||
          u.name.toLowerCase().includes(q) ||
          (u.country ?? "").toLowerCase().includes(q) ||
          (u.city ?? "").toLowerCase().includes(q) ||
          u.universityCourses.some((c) => c.courseName.toLowerCase().includes(q));
        const matchCountry = !filterCountry || u.country === filterCountry;
        const matchLevel = !filterLevel || u.universityCourses.some((c) => c.courseLevel === filterLevel);
        return matchSearch && matchCountry && matchLevel;
      })
      .sort((a, b) => {
        const ca = a.country ?? "zzz", cb = b.country ?? "zzz";
        return ca !== cb ? ca.localeCompare(cb) : a.name.localeCompare(b.name);
      });
  }, [universities, search, filterCountry, filterLevel]);

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

  function toggleCountry(c: string) {
    setCollapsedCountries((prev) => { const n = new Set(prev); if (n.has(c)) { n.delete(c); } else { n.add(c); } return n; });
  }
  function toggleAll() {
    setCollapsedCountries(allExpanded ? new Set(grouped.map(([c]) => c)) : new Set());
  }
  function toggleUni(id: string) {
    setExpandedUnis((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  }

  function openAdd() {
    setEditing(null);
    setDialogOpen(true);
  }
  function openEdit(u: University) {
    setEditing(u);
    setDialogOpen(true);
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

  function courseSummary(u: University) {
    const counts: Record<string, number> = {};
    for (const c of u.universityCourses) counts[c.courseLevel] = (counts[c.courseLevel] ?? 0) + 1;
    return Object.entries(counts).map(([lvl, n]) => `${n} ${lvl}`).join(" · ") || "No courses";
  }

  const hasFilters = search || filterCountry || filterLevel;

  return (
    <>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search universities or course names..." className="pl-9" />
        </div>
        <select value={filterCountry} onChange={(e) => setFilterCountry(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[140px]">
          <option value="">All Countries</option>
          {allCountries.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[130px]">
          <option value="">All Levels</option>
          {allLevels.map((l) => <option key={l} value={l}>{l}</option>)}
        </select>
        <Button onClick={openAdd} size="sm" className="gap-2 shrink-0">
          <Plus size={15} /> Add University
        </Button>
      </div>

      {/* Meta */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">
          {filtered.length} {filtered.length === 1 ? "university" : "universities"}
          {grouped.length > 0 && ` · ${grouped.length} ${grouped.length === 1 ? "country" : "countries"}`}
        </p>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button onClick={() => { setSearch(""); setFilterCountry(""); setFilterLevel(""); }}
              className="text-xs text-blue-600 hover:underline flex items-center gap-1">
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

      {/* List */}
      {loading ? (
        <div className="space-y-2">{[1,2,3,4,5].map((i) => <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <GraduationCap size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{universities.length === 0 ? "No universities yet" : "No results match your filters"}</p>
          {universities.length === 0 && <p className="text-sm mt-1">Add your first university to get started.</p>}
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([country, items]) => {
            const isCollapsed = collapsedCountries.has(country);
            return (
              <div key={country} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                {/* Country header */}
                <button onClick={() => toggleCountry(country)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                  {isCollapsed ? <ChevronRight size={15} className="text-gray-400 shrink-0" /> : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
                  <Globe size={14} className="text-blue-500 shrink-0" />
                  <span className="font-semibold text-gray-800 text-sm flex-1">{country}</span>
                  <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">
                    {items.length} {items.length === 1 ? "university" : "universities"}
                  </span>
                </button>

                {!isCollapsed && (
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {items.map((u) => {
                      const fee = feeLabel(u);
                      const isExpanded = expandedUnis.has(u.id);
                      const summary = courseSummary(u);
                      const hasRequirements = u.academicCriteriaUG || u.academicCriteriaPG || u.englishCriteriaUG || u.englishCriteriaPG;

                      return (
                        <div key={u.id}>
                          {/* University row */}
                          <div className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors group">
                            <button onClick={() => toggleUni(u.id)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                              {isExpanded ? <ChevronDown size={14} className="text-gray-400 shrink-0" /> : <ChevronRight size={14} className="text-gray-400 shrink-0" />}
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">{u.name}</p>
                                {u.city && <p className="text-xs text-gray-400">{u.city}</p>}
                              </div>
                            </button>

                            {fee && (
                              <span className="hidden md:inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-md shrink-0">
                                <DollarSign size={11} />{fee}
                              </span>
                            )}

                            <span className="hidden lg:block text-xs text-gray-400 shrink-0">{summary}</span>

                            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                              {u.website && (
                                <a href={u.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Visit website">
                                  <ExternalLink size={13} />
                                </a>
                              )}
                              {u.flyer && (
                                <a href={u.flyer} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
                                  className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="Download flyer">
                                  <Download size={13} />
                                </a>
                              )}
                              <button onClick={() => openEdit(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                <Pencil size={13} />
                              </button>
                              <button onClick={() => setDeleteTarget(u)} className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                                <Trash2 size={13} />
                              </button>
                            </div>
                            {isAdmin && <span className="hidden xl:block text-xs text-gray-300 shrink-0 w-20 truncate text-right">{u.createdBy.name}</span>}
                          </div>

                          {/* Expanded detail */}
                          {isExpanded && (
                            <div className="bg-slate-50 border-t border-gray-100 px-6 py-4 space-y-4">
                              <div className={cn("grid gap-4", hasRequirements ? "lg:grid-cols-2" : "grid-cols-1")}>

                                {/* Courses panel */}
                                <CoursePanel courses={u.universityCourses} />

                                {/* Requirements panel */}
                                {hasRequirements && <RequirementsPanel university={u} />}
                              </div>

                              {/* Footer */}
                              <div className="flex items-center justify-between pt-2 border-t border-gray-200">
                                <div className="flex items-center gap-3">
                                  {u.website && (
                                    <a href={u.website} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                      <ExternalLink size={11} /> Website
                                    </a>
                                  )}
                                  {u.flyer && (
                                    <a href={u.flyer} target="_blank" rel="noopener noreferrer"
                                      className="text-xs text-blue-600 hover:underline flex items-center gap-1">
                                      <Download size={11} /> Download Flyer
                                    </a>
                                  )}
                                  {u.notes && <p className="text-xs text-gray-400 italic">&quot;{u.notes}&quot;</p>}
                                </div>
                                <div className="flex items-center gap-2">
                                  <button onClick={() => openEdit(u)}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                                    <Pencil size={12} /> Edit
                                  </button>
                                  <button onClick={() => setDeleteTarget(u)}
                                    className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                                    <Trash2 size={12} /> Delete
                                  </button>
                                </div>
                              </div>
                            </div>
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
      {dialogOpen && (
        <UniversityDialog
          open={dialogOpen}
          onClose={() => setDialogOpen(false)}
          editing={editing}
          onSaved={() => { setDialogOpen(false); onMutate(); }}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Remove University</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Remove <span className="font-semibold">{deleteTarget?.name}</span>?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Remove</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Course Panel (inside expanded row) ──────────────────────────────────────

function CoursePanel({ courses }: {
  courses: UniversityCourse[];
}) {
  const [activeLevel, setActiveLevel] = useState("All");

  const levels = useMemo(() => {
    const set = new Set(courses.map((c) => c.courseLevel));
    return ["All", ...Array.from(set).sort()];
  }, [courses]);

  const visible = activeLevel === "All" ? courses : courses.filter((c) => c.courseLevel === activeLevel);

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <BookOpen size={14} className="text-blue-500" />
          <span className="text-sm font-semibold text-gray-800">Courses</span>
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{courses.length}</span>
        </div>
        {/* Level tabs */}
        <div className="flex gap-1">
          {levels.map((l) => (
            <button key={l} onClick={() => setActiveLevel(l)}
              className={cn("text-xs px-2 py-1 rounded-md transition-colors",
                activeLevel === l ? "bg-blue-600 text-white" : "text-gray-500 hover:bg-gray-100")}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="text-xs text-gray-400 text-center py-6">No courses listed</p>
      ) : (
        <div className="divide-y divide-gray-50 max-h-64 overflow-y-auto">
          {visible.map((c) => (
            <div key={c.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className={cn("text-xs px-1.5 py-0.5 rounded border shrink-0 mt-0.5", levelColor(c.courseLevel))}>
                {c.courseLevel}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-800 leading-snug">{c.courseName}</p>
                {(c.intakeName || c.campusLocation) && (
                  <p className="text-xs text-gray-400 mt-0.5">
                    {[c.intakeName, c.campusLocation].filter(Boolean).join(" · ")}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Requirements Panel ───────────────────────────────────────────────────────

function RequirementsPanel({ university: u }: { university: University }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-gray-100">
        <AlertCircle size={14} className="text-amber-500" />
        <span className="text-sm font-semibold text-gray-800">Entry Requirements</span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-gray-100">
        {/* UG */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Undergraduate</p>
          {u.academicCriteriaUG && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Academic</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{u.academicCriteriaUG}</p>
            </div>
          )}
          {u.englishCriteriaUG && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">English</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{u.englishCriteriaUG}</p>
            </div>
          )}
          {u.englishWaiverUG && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Waiver</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{u.englishWaiverUG}</p>
            </div>
          )}
          {!u.academicCriteriaUG && !u.englishCriteriaUG && !u.englishWaiverUG && (
            <p className="text-xs text-gray-300">Not specified</p>
          )}
        </div>
        {/* PG */}
        <div className="px-4 py-3 space-y-3">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Postgraduate</p>
          {u.academicCriteriaPG && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Academic</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{u.academicCriteriaPG}</p>
            </div>
          )}
          {u.englishCriteriaPG && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">English</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{u.englishCriteriaPG}</p>
            </div>
          )}
          {u.englishWaiverPG && (
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Waiver</p>
              <p className="text-xs text-gray-700 whitespace-pre-wrap">{u.englishWaiverPG}</p>
            </div>
          )}
          {!u.academicCriteriaPG && !u.englishCriteriaPG && !u.englishWaiverPG && (
            <p className="text-xs text-gray-300">Not specified</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── University Add/Edit Dialog ───────────────────────────────────────────────

function UniversityDialog({ open, onClose, editing, onSaved }: {
  open: boolean;
  onClose: () => void;
  editing: University | null;
  onSaved: () => void;
}) {
  const [dialogTab, setDialogTab] = useState<"basic" | "courses" | "requirements">("basic");
  const [pendingCourses, setPendingCourses] = useState<CourseInput[]>(() =>
    editing ? editing.universityCourses.map((c) => ({
      courseName: c.courseName,
      courseLevel: c.courseLevel,
      intakeName: c.intakeName ?? "",
      campusLocation: c.campusLocation ?? "",
    })) : []
  );
  const [courseForm, setCourseForm] = useState<CourseInput>({ courseName: "", courseLevel: "UG", intakeName: "", campusLocation: "" });
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  const form = useForm<CreateUniversityInput>({
    resolver: zodResolver(createUniversitySchema),
    defaultValues: editing ? {
      name: editing.name,
      country: editing.country ?? "",
      city: editing.city ?? "",
      tuitionFeeMin: editing.tuitionFeeMin ?? undefined,
      tuitionFeeMax: editing.tuitionFeeMax ?? undefined,
      currency: editing.currency,
      notes: editing.notes ?? "",
      website: editing.website ?? "",
      flyer: editing.flyer ?? "",
      academicCriteriaUG: editing.academicCriteriaUG ?? "",
      academicCriteriaPG: editing.academicCriteriaPG ?? "",
      englishCriteriaUG: editing.englishCriteriaUG ?? "",
      englishCriteriaPG: editing.englishCriteriaPG ?? "",
      englishWaiverUG: editing.englishWaiverUG ?? "",
      englishWaiverPG: editing.englishWaiverPG ?? "",
      courses: [],
    } : {
      name: "", country: "", city: "", currency: "USD", notes: "", website: "", flyer: "",
      academicCriteriaUG: "", academicCriteriaPG: "",
      englishCriteriaUG: "", englishCriteriaPG: "",
      englishWaiverUG: "", englishWaiverPG: "",
      courses: [],
    },
  });

  function addCourse() {
    if (!courseForm.courseName.trim()) return;
    setPendingCourses((prev) => [...prev, { ...courseForm, courseName: courseForm.courseName.trim() }]);
    setCourseForm((prev) => ({ ...prev, courseName: "", intakeName: "", campusLocation: "" }));
  }

  function removeCourse(i: number) {
    setPendingCourses((prev) => prev.filter((_, idx) => idx !== i));
  }

  async function onSubmit(data: CreateUniversityInput) {
    setSaving(true);
    const payload = { ...data, courses: pendingCourses };
    const url = editing ? `/api/universities/${editing.id}` : "/api/universities";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSaving(false);
    if (!res.ok) { toast({ variant: "destructive", title: "Error", description: "Failed to save university." }); return; }
    toast({ title: editing ? "University updated" : "University added" });
    onSaved();
  }

  const tabs = [
    { key: "basic", label: "Basic Info" },
    { key: "courses", label: `Courses${pendingCourses.length > 0 ? ` (${pendingCourses.length})` : ""}` },
    { key: "requirements", label: "Requirements" },
  ] as const;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle>{editing ? "Edit University" : "Add University"}</DialogTitle>
        </DialogHeader>

        {/* Tab switcher */}
        <div className="flex gap-0 border-b border-gray-200 px-6 mt-4">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setDialogTab(t.key)}
              className={cn("px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
                dialogTab === t.key ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-800")}>
              {t.label}
            </button>
          ))}
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">

            {/* ── Basic Info ── */}
            {dialogTab === "basic" && (
              <>
                <div>
                  <Label>University Name *</Label>
                  <Input {...form.register("name")} placeholder="e.g. University of Hertfordshire" className="mt-1" />
                  {form.formState.errors.name && <p className="text-xs text-red-500 mt-1">{form.formState.errors.name.message}</p>}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Country</Label>
                    <Input {...form.register("country")} placeholder="e.g. United Kingdom" className="mt-1" />
                  </div>
                  <div>
                    <Label>City / Campus</Label>
                    <Input {...form.register("city")} placeholder="e.g. Hatfield" className="mt-1" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label>Min Tuition</Label>
                    <Input type="number" placeholder="10000" className="mt-1"
                      {...form.register("tuitionFeeMin", { setValueAs: (v) => (v === "" ? null : Number(v)) })} />
                  </div>
                  <div>
                    <Label>Max Tuition</Label>
                    <Input type="number" placeholder="15000" className="mt-1"
                      {...form.register("tuitionFeeMax", { setValueAs: (v) => (v === "" ? null : Number(v)) })} />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <select {...form.register("currency")}
                      className="mt-1 w-full border border-gray-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {["USD", "AUD", "GBP", "CAD", "EUR", "NZD", "NPR"].map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Website</Label>
                    <Input {...form.register("website")} placeholder="https://..." className="mt-1" />
                  </div>
                  <div>
                    <Label>Flyer URL</Label>
                    <Input {...form.register("flyer")} placeholder="https://..." className="mt-1" />
                  </div>
                </div>
                <div>
                  <Label>Notes</Label>
                  <Textarea {...form.register("notes")} placeholder="General notes about this university..." rows={2} className="mt-1 resize-none" />
                </div>
              </>
            )}

            {/* ── Courses ── */}
            {dialogTab === "courses" && (
              <>
                {/* Add course row */}
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Add Course</p>
                  <Input
                    value={courseForm.courseName}
                    onChange={(e) => setCourseForm((p) => ({ ...p, courseName: e.target.value }))}
                    placeholder="e.g. BA (Hons) Business Management"
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCourse(); } }}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <Label className="text-xs">Level</Label>
                      <select value={courseForm.courseLevel} onChange={(e) => setCourseForm((p) => ({ ...p, courseLevel: e.target.value }))}
                        className="mt-1 w-full border border-gray-200 rounded-md px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                        {COURSE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs">Intake</Label>
                      <Input value={courseForm.intakeName} onChange={(e) => setCourseForm((p) => ({ ...p, intakeName: e.target.value }))}
                        placeholder="e.g. Sep 2026" className="mt-1 text-sm" />
                    </div>
                    <div>
                      <Label className="text-xs">Campus</Label>
                      <Input value={courseForm.campusLocation} onChange={(e) => setCourseForm((p) => ({ ...p, campusLocation: e.target.value }))}
                        placeholder="e.g. York" className="mt-1 text-sm" />
                    </div>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addCourse} className="gap-1.5">
                    <Plus size={13} /> Add Course
                  </Button>
                </div>

                {/* Course list */}
                {pendingCourses.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No courses added yet</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
                    <div className="grid grid-cols-[1fr_80px_110px_100px_32px] gap-2 px-3 py-2 bg-gray-50 text-xs font-medium text-gray-500">
                      <span>Course Name</span><span>Level</span><span>Intake</span><span>Campus</span><span />
                    </div>
                    {pendingCourses.map((c, i) => (
                      <div key={i} className="grid grid-cols-[1fr_80px_110px_100px_32px] gap-2 px-3 py-2.5 items-center hover:bg-gray-50">
                        <span className="text-sm text-gray-800 truncate">{c.courseName}</span>
                        <span className={cn("text-xs px-1.5 py-0.5 rounded border w-fit", levelColor(c.courseLevel))}>{c.courseLevel}</span>
                        <span className="text-xs text-gray-500 truncate">{c.intakeName || "—"}</span>
                        <span className="text-xs text-gray-500 truncate">{c.campusLocation || "—"}</span>
                        <button type="button" onClick={() => removeCourse(i)}
                          className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* ── Requirements ── */}
            {dialogTab === "requirements" && (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <div className="col-span-2 grid grid-cols-2 gap-x-6">
                  <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide pb-1 border-b border-blue-100">Undergraduate</p>
                  <p className="text-xs font-semibold text-purple-600 uppercase tracking-wide pb-1 border-b border-purple-100">Postgraduate</p>
                </div>
                <div>
                  <Label>Academic Criteria</Label>
                  <Textarea {...form.register("academicCriteriaUG")} placeholder="e.g. 12th Grade: 70%+ / GPA 2.8+" rows={3} className="mt-1 resize-none text-sm" />
                </div>
                <div>
                  <Label>Academic Criteria</Label>
                  <Textarea {...form.register("academicCriteriaPG")} placeholder="e.g. 3yr Bachelor: 65%+ / 4yr: 60%+" rows={3} className="mt-1 resize-none text-sm" />
                </div>
                <div>
                  <Label>English Language</Label>
                  <Textarea {...form.register("englishCriteriaUG")} placeholder="IELTS: 6.0 overall&#10;PTE: 59&#10;TOEFL: 72" rows={4} className="mt-1 resize-none text-sm" />
                </div>
                <div>
                  <Label>English Language</Label>
                  <Textarea {...form.register("englishCriteriaPG")} placeholder="IELTS: 6.0 overall&#10;PTE: 59&#10;TOEFL: 72" rows={4} className="mt-1 resize-none text-sm" />
                </div>
                <div>
                  <Label>English Waiver</Label>
                  <Textarea {...form.register("englishWaiverUG")} placeholder="e.g. 70%+ English in 12th Grade" rows={2} className="mt-1 resize-none text-sm" />
                </div>
                <div>
                  <Label>English Waiver</Label>
                  <Textarea {...form.register("englishWaiverPG")} placeholder="e.g. MOI accepted from selected institutions" rows={2} className="mt-1 resize-none text-sm" />
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-gray-100 px-6 py-4 flex justify-between items-center bg-white">
            <div className="flex gap-2">
              {dialogTab !== "basic" && (
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => setDialogTab(dialogTab === "requirements" ? "courses" : "basic")}>
                  ← Back
                </Button>
              )}
            </div>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
              {dialogTab !== "requirements" ? (
                <Button type="button" onClick={() => setDialogTab(dialogTab === "basic" ? "courses" : "requirements")}>
                  Next →
                </Button>
              ) : (
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : editing ? "Save Changes" : "Add University"}
                </Button>
              )}
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Notes Tab ────────────────────────────────────────────────────────────────

const BORDER_COLORS = [
  "border-l-purple-400", "border-l-blue-400", "border-l-teal-400",
  "border-l-orange-400", "border-l-pink-400", "border-l-green-400",
];

const TAG_CHIP_COLORS = [
  "bg-purple-50 text-purple-700 border-purple-200",
  "bg-blue-50 text-blue-700 border-blue-200",
  "bg-teal-50 text-teal-700 border-teal-200",
  "bg-orange-50 text-orange-700 border-orange-200",
  "bg-pink-50 text-pink-700 border-pink-200",
  "bg-green-50 text-green-700 border-green-200",
];

function tagColorIndex(tag: string) {
  let h = 0;
  for (let i = 0; i < tag.length; i++) h = (h * 31 + tag.charCodeAt(i)) & 0xff;
  return h % BORDER_COLORS.length;
}

function NotesTab({ notes, loading, isAdmin, onMutate }: {
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
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
    const q = search.toLowerCase();
    return notes.filter((n) => {
      const matchSearch = !search || n.title.toLowerCase().includes(q) || n.content.toLowerCase().includes(q) || n.tags.some((t) => t.includes(q));
      const matchTag = !filterTag || n.tags.includes(filterTag);
      return matchSearch && matchTag;
    });
  }, [notes, search, filterTag]);

  function toggleExpand(id: string) {
    setExpandedIds((prev) => { const n = new Set(prev); if (n.has(id)) { n.delete(id); } else { n.add(id); } return n; });
  }
  function openAdd() { setEditing(null); form.reset({ title: "", content: "", tags: [] }); setTagInput(""); setDialogOpen(true); }
  function openEdit(e: React.MouseEvent, n: CounsellorNote) { e.stopPropagation(); setEditing(n); form.reset({ title: n.title, content: n.content, tags: n.tags }); setTagInput(""); setDialogOpen(true); }
  function addTag() { const t = tagInput.trim().toLowerCase(); if (!t || tags.includes(t)) return; form.setValue("tags", [...tags, t]); setTagInput(""); }
  function removeTag(tag: string) { form.setValue("tags", tags.filter((t) => t !== tag)); }

  async function onSubmit(data: CreateCounsellorNoteInput) {
    const url = editing ? `/api/counsellor-notes/${editing.id}` : "/api/counsellor-notes";
    const method = editing ? "PATCH" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });
    if (!res.ok) { toast({ variant: "destructive", title: "Error", description: "Failed to save note." }); return; }
    toast({ title: editing ? "Note updated" : "Note added" });
    setDialogOpen(false);
    onMutate();
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const res = await fetch(`/api/counsellor-notes/${deleteTarget.id}`, { method: "DELETE" });
    if (!res.ok) { toast({ variant: "destructive", title: "Error", description: "Failed to delete." }); return; }
    toast({ title: "Note deleted" });
    setDeleteTarget(null);
    onMutate();
  }

  const wordCount = (t: string) => t.trim().split(/\s+/).filter(Boolean).length;

  return (
    <>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes by title, content or tag..." className="pl-9" />
        </div>
        <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]">
          <option value="">All Tags</option>
          {allTags.map((t) => <option key={t} value={t}>#{t}</option>)}
        </select>
        <Button onClick={openAdd} size="sm" className="gap-2 shrink-0"><Plus size={15} /> Add Note</Button>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{filtered.length} of {notes.length} {notes.length === 1 ? "note" : "notes"}</p>
        {(search || filterTag) && (
          <button onClick={() => { setSearch(""); setFilterTag(""); }} className="text-xs text-blue-600 hover:underline flex items-center gap-1">
            <X size={11} /> Clear filters
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-2">{[1,2,3,4].map((i) => <div key={i} className="h-14 rounded-xl bg-gray-100 animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <StickyNote size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">{notes.length === 0 ? "No notes yet" : "No results match your filters"}</p>
          {notes.length === 0 && <p className="text-sm mt-1">Jot down important information, strategies, or reminders.</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
          {filtered.map((n) => {
            const isExpanded = expandedIds.has(n.id);
            const colorIdx = n.tags.length > 0 ? tagColorIndex(n.tags[0]) : 0;
            return (
              <div key={n.id} className={cn("border-l-4", BORDER_COLORS[colorIdx])}>
                <button onClick={() => toggleExpand(n.id)} className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left">
                  {isExpanded ? <ChevronDown size={15} className="text-gray-400 shrink-0" /> : <ChevronRight size={15} className="text-gray-400 shrink-0" />}
                  <span className="flex-1 text-sm font-medium text-gray-900 truncate">{n.title}</span>
                  {n.tags.length > 0 && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      {n.tags.slice(0, 3).map((t) => {
                        const ci = tagColorIndex(t);
                        return (
                          <span key={t} onClick={(e) => { e.stopPropagation(); setFilterTag(t === filterTag ? "" : t); }}
                            className={cn("text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
                              filterTag === t ? "bg-gray-800 text-white border-gray-800" : TAG_CHIP_COLORS[ci])}>
                            #{t}
                          </span>
                        );
                      })}
                      {n.tags.length > 3 && <span className="text-xs text-gray-400">+{n.tags.length - 3}</span>}
                    </div>
                  )}
                  <div className="flex items-center gap-3 shrink-0">
                    {!isExpanded && <span className="hidden lg:block text-xs text-gray-300">{wordCount(n.content)} words</span>}
                    {isAdmin && <span className="hidden xl:block text-xs text-gray-400">{n.counsellor.name}</span>}
                    <span className="text-xs text-gray-400">{formatRelative(n.updatedAt)}</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="px-10 pb-4">
                    {n.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {n.tags.map((t) => {
                          const ci = tagColorIndex(t);
                          return (
                            <span key={t} onClick={() => setFilterTag(t === filterTag ? "" : t)}
                              className={cn("text-xs px-2 py-0.5 rounded-full border cursor-pointer transition-colors",
                                filterTag === t ? "bg-gray-800 text-white border-gray-800" : TAG_CHIP_COLORS[ci])}>
                              #{t}
                            </span>
                          );
                        })}
                      </div>
                    )}
                    <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{n.content}</p>
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
                      <span className="text-xs text-gray-400">{wordCount(n.content)} words · edited {formatRelative(n.updatedAt)}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={(e) => openEdit(e, n)} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-600 px-2.5 py-1.5 rounded-lg hover:bg-blue-50 transition-colors">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setDeleteTarget(n); }} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-500 px-2.5 py-1.5 rounded-lg hover:bg-red-50 transition-colors">
                          <Trash2 size={13} /> Delete
                        </button>
                      </div>
                    </div>
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
          <DialogHeader><DialogTitle>{editing ? "Edit Note" : "Add Note"}</DialogTitle></DialogHeader>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input {...form.register("title")} placeholder="e.g. Canada Study Abroad Tips" className="mt-1" />
              {form.formState.errors.title && <p className="text-xs text-red-500 mt-1">{form.formState.errors.title.message}</p>}
            </div>
            <div>
              <Label>Content *</Label>
              <Textarea {...form.register("content")} placeholder="Write your notes here..." rows={7} className="mt-1 resize-y" />
              {form.formState.errors.content && <p className="text-xs text-red-500 mt-1">{form.formState.errors.content.message}</p>}
            </div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="e.g. visa, scholarship"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} />
                <Button type="button" variant="outline" onClick={addTag} size="sm">Add</Button>
              </div>
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {tags.map((t) => {
                    const ci = tagColorIndex(t);
                    return (
                      <span key={t} className={cn("flex items-center gap-1 text-xs px-2 py-1 rounded-full border", TAG_CHIP_COLORS[ci])}>
                        #{t}
                        <button type="button" onClick={() => removeTag(t)} className="hover:text-red-500 ml-0.5"><X size={10} /></button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>{form.formState.isSubmitting ? "Saving..." : editing ? "Save Changes" : "Add Note"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Delete Note</DialogTitle></DialogHeader>
          <p className="text-sm text-gray-600 py-2">Delete <span className="font-semibold">{deleteTarget?.title}</span>? This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

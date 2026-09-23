"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useSearchParams } from "next/navigation";
import { createLeadSchema, CreateLeadInput } from "@/lib/validations";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle, Globe, BookOpen, Calendar, BookMarked, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EDUCATION_LEVELS, LEAD_TYPE_LABELS } from "@/lib/utils";

interface RefData {
  sources: Array<{ id: string; name: string }>;
  countries: Array<{ id: string; name: string }>;
  intakes: Array<{ id: string; name: string }>;
  branches: Array<{ id: string; name: string }>;
  counsellors: Array<{ id: string; name: string; branchId: string | null }>;
}

interface DuplicateLead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  email: string | null;
  educationLevel: string;
  status: string;
  leadType: string;
  country: { name: string } | null;
  source: { id: string; name: string };
  assignedCounsellor: { name: string } | null;
  updatedAt: string;
}

interface CreatedLead {
  id: string;
  leadId: string;
  studentName: string;
  phone: string;
  assignedCounsellor: { name: string } | null;
}

const LEAD_TYPES = [
  { value: "STUDY_ABROAD", label: "Study Abroad", icon: Globe, color: "text-blue-600", activeBg: "bg-blue-600", activeText: "text-white", hoverBg: "hover:bg-blue-50" },
  { value: "IELTS_CLASS",  label: "IELTS Class",  icon: BookOpen, color: "text-violet-600", activeBg: "bg-violet-600", activeText: "text-white", hoverBg: "hover:bg-violet-50" },
  { value: "PTE_CLASS",    label: "PTE Class",    icon: BookMarked, color: "text-orange-600", activeBg: "bg-orange-500", activeText: "text-white", hoverBg: "hover:bg-orange-50" },
  { value: "DATE_BOOKING", label: "Date Booking", icon: Calendar, color: "text-teal-600", activeBg: "bg-teal-600", activeText: "text-white", hoverBg: "hover:bg-teal-50" },
];

export default function QuickLeadForm({ allowedTypes }: { allowedTypes?: string[] } = {}) {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateLead[]>([]);
  const [showDupDialog, setShowDupDialog] = useState(false);
  const [createdLead, setCreatedLead] = useState<CreatedLead | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

  const duplicate = duplicates[0] ?? null;

  const { data: refData } = useQuery<RefData>({
    queryKey: ["reference"],
    queryFn: () => fetch("/api/reference").then((r) => r.json()),
    staleTime: 10 * 60_000,
  });

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateLeadInput>({
    resolver: zodResolver(createLeadSchema),
    defaultValues: {
      leadType: "STUDY_ABROAD",
      campaign: searchParams.get("campaign") || undefined,
      campaignId: searchParams.get("campaignId") || undefined,
      utmSource: searchParams.get("utmSource") || searchParams.get("utm_source") || undefined,
      utmMedium: searchParams.get("utmMedium") || searchParams.get("utm_medium") || undefined,
      utmCampaign: searchParams.get("utmCampaign") || searchParams.get("utm_campaign") || undefined,
      utmContent: searchParams.get("utmContent") || searchParams.get("utm_content") || undefined,
    },
  });

  const leadType = (watch("leadType") || "STUDY_ABROAD") as CreateLeadInput["leadType"];
  const visibleTypes = allowedTypes ? LEAD_TYPES.filter((t) => allowedTypes.includes(t.value)) : LEAD_TYPES;
  const activeType = LEAD_TYPES.find((t) => t.value === leadType) ?? visibleTypes[0];
  const isStudyAbroad = leadType === "STUDY_ABROAD";
  const isDateBooking = leadType === "DATE_BOOKING";

  useEffect(() => {
    const sourceParam = searchParams.get("source");
    if (sourceParam && refData) {
      const matched = refData.sources.find(
        (s) => s.name.toLowerCase().replace(/[\s-]/g, "") === sourceParam.toLowerCase().replace(/[\s-]/g, "")
      );
      if (matched) setValue("sourceId", matched.id);
    }
  }, [searchParams, refData, setValue]);

  async function checkDuplicatePhone(phoneVal: string) {
    if (!phoneVal || phoneVal.length < 7) return;
    try {
      const res = await fetch(`/api/leads?phone=${encodeURIComponent(phoneVal)}`);
      if (res.ok) {
        const data = await res.json();
        setDuplicates(data.duplicates ?? (data.duplicate ? [data.duplicate] : []));
      }
    } catch {}
  }

  function prefillAsClassLead(type: "IELTS_CLASS" | "PTE_CLASS", from: DuplicateLead) {
    setValue("leadType", type);
    setValue("studentName", from.studentName);
    setValue("phone", from.phone);
    if (from.email) setValue("email", from.email);
    setValue("educationLevel", from.educationLevel);
    setValue("sourceId", from.source.id);
    setForceCreate(true);
    setShowDupDialog(false);
    setShowOptional(true);
  }

  async function submitLead(data: CreateLeadInput, force = false) {
    if (!force && duplicate) { setShowDupDialog(true); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!res.ok) {
        toast({ variant: "destructive", title: "Error", description: json.error || "Failed to create lead" });
        return;
      }
      setCreatedLead(json.lead);
    } catch {
      toast({ variant: "destructive", title: "Error", description: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  function handleCreateAnother() {
    setCreatedLead(null);
    setDuplicates([]);
    setForceCreate(false);
    reset();
  }

  if (createdLead) {
    return (
      <div className="max-w-md mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-green-600 px-8 py-8 text-center">
          <CheckCircle className="w-12 h-12 text-white mx-auto mb-3" />
          <h2 className="text-xl font-bold text-white">Lead Created</h2>
          <p className="text-green-200 text-sm mt-1">{createdLead.leadId}</p>
        </div>
        <div className="px-6 py-5 space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Student</span>
            <span className="font-medium text-gray-800">{createdLead.studentName}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-500">Phone</span>
            <span className="font-medium text-gray-800">{createdLead.phone}</span>
          </div>
          {createdLead.assignedCounsellor && (
            <div className="flex justify-between py-2">
              <span className="text-gray-500">Assigned to</span>
              <span className="font-medium text-gray-800">{createdLead.assignedCounsellor.name}</span>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Link href={`/leads/${createdLead.id}`} className="flex-1">
            <Button variant="outline" className="w-full">Open Lead</Button>
          </Link>
          <Button onClick={handleCreateAnother} className="flex-1">Add Another</Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit((data) => submitLead(data, forceCreate))} className="space-y-4">

        {/* Lead Type Tabs */}
        <div className="flex gap-2 p-1 bg-white rounded-xl border border-gray-200 shadow-sm w-fit">
          {visibleTypes.map((t) => {
            const Icon = t.icon;
            const isActive = leadType === t.value;
            return (
              <button
                key={t.value}
                type="button"
                onClick={() => setValue("leadType", t.value as CreateLeadInput["leadType"])}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                  isActive
                    ? `${t.activeBg} ${t.activeText} shadow-sm`
                    : `text-gray-500 ${t.hoverBg} hover:text-gray-700`
                )}
              >
                <Icon size={15} />
                <span className="hidden sm:inline">{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm">
          {/* Thin colored top bar indicating lead type */}
          <div className={cn("h-1 rounded-t-2xl", activeType.activeBg)} />

          <div className="p-6 space-y-5">
            {/* Student */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="studentName" className="text-sm font-medium text-gray-700">Full Name <span className="text-red-500">*</span></Label>
                <Input id="studentName" placeholder="e.g. Ram Bahadur Thapa" {...register("studentName")} />
                {errors.studentName && <p className="text-xs text-red-500">{errors.studentName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></Label>
                <Input
                  id="phone"
                  placeholder="98XXXXXXXX"
                  {...register("phone")}
                  onBlur={(e) => checkDuplicatePhone(e.target.value)}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                {duplicates.length > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={11} />
                    {duplicates[0].studentName} already has {duplicates.length} record{duplicates.length > 1 ? "s" : ""} — see duplicate dialog
                  </p>
                )}
              </div>
            </div>

            <div className="h-px bg-gray-100" />

            {/* Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Education Level <span className="text-red-500">*</span></Label>
                <Select onValueChange={(v) => setValue("educationLevel", v)}>
                  <SelectTrigger><SelectValue placeholder="Select level" /></SelectTrigger>
                  <SelectContent>
                    {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.educationLevel && <p className="text-xs text-red-500">{errors.educationLevel.message}</p>}
              </div>

              {isStudyAbroad ? (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Interested Country</Label>
                  <Select onValueChange={(v) => setValue("countryId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select country" /></SelectTrigger>
                    <SelectContent>
                      {refData?.countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : isDateBooking ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bookingDate" className="text-sm font-medium text-gray-700">Test Booking Date</Label>
                  <Input id="bookingDate" type="date" {...register("bookingDate")} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Test Type</Label>
                  <div className={cn("h-9 flex items-center px-3 rounded-md border text-sm font-medium gap-2 bg-gray-50")}>
                    <activeType.icon size={14} className={activeType.color} />
                    <span className="text-gray-700">{LEAD_TYPE_LABELS[leadType]}</span>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-medium text-gray-700">Lead Source <span className="text-red-500">*</span></Label>
                <Select onValueChange={(v) => setValue("sourceId", v)} value={watch("sourceId")}>
                  <SelectTrigger><SelectValue placeholder="How did they find us?" /></SelectTrigger>
                  <SelectContent>
                    {refData?.sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.sourceId && <p className="text-xs text-red-500">{errors.sourceId.message}</p>}
              </div>
              {isStudyAbroad && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Intake</Label>
                  <Select onValueChange={(v) => setValue("intakeId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select intake" /></SelectTrigger>
                    <SelectContent>
                      {refData?.intakes.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Optional Fields */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700">Additional Information</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">optional</span>
            </div>
            {showOptional ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {showOptional && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-sm font-medium text-gray-700">Email</Label>
                  <Input id="email" type="email" placeholder="email@example.com" {...register("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course" className="text-sm font-medium text-gray-700">Preferred Course</Label>
                  <Input id="course" placeholder="e.g. Computer Science" {...register("course")} />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Branch</Label>
                  <Select onValueChange={(v) => setValue("branchId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {refData?.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium text-gray-700">Assign Counsellor</Label>
                  <Select onValueChange={(v) => setValue("assignedCounsellorId", v)}>
                    <SelectTrigger><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                    <SelectContent>
                      {refData?.counsellors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-sm font-medium text-gray-700">Notes</Label>
                <Textarea id="notes" placeholder="Any additional notes..." rows={3} {...register("notes")} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={submitting} size="lg" className="px-8">
            {submitting ? <><Loader2 size={15} className="mr-2 animate-spin" />Creating...</> : "Create Lead"}
          </Button>
          {duplicates.length > 0 && !forceCreate && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} />Existing student detected — review duplicates
            </p>
          )}
        </div>
      </form>

      <Dialog open={showDupDialog} onOpenChange={setShowDupDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={18} />
              Student Already Exists
            </DialogTitle>
          </DialogHeader>

          <p className="text-sm text-gray-500 -mt-1">
            This phone number matches {duplicates.length} existing record{duplicates.length > 1 ? "s" : ""}. What would you like to do?
          </p>

          {/* Existing records */}
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {duplicates.map((dup) => {
              const typeLabel = LEAD_TYPE_LABELS[dup.leadType] ?? dup.leadType;
              const typeCfg = LEAD_TYPES.find((t) => t.value === dup.leadType);
              return (
                <div key={dup.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm flex items-start justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-800">{dup.studentName}</span>
                      <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded-full", typeCfg ? `${typeCfg.activeBg} text-white` : "bg-gray-200 text-gray-600")}>
                        {typeLabel}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 flex items-center gap-3">
                      <span>{dup.phone}</span>
                      <span>{dup.status.replace(/_/g, " ")}</span>
                      {dup.country && <span>{dup.country.name}</span>}
                    </div>
                  </div>
                  <Link href={`/leads/${dup.id}`} target="_blank" className="text-gray-400 hover:text-indigo-500 transition-colors flex-shrink-0 mt-0.5" title="Open lead">
                    <ExternalLink size={14} />
                  </Link>
                </div>
              );
            })}
          </div>

          {/* Enroll in class options */}
          {duplicate && (
            <div className="border-t border-gray-100 pt-3 space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Enroll existing student in a class</p>
              <div className="flex flex-col sm:flex-row gap-2">
                {!duplicates.some((d) => d.leadType === "IELTS_CLASS") && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-violet-200 text-violet-700 hover:bg-violet-50"
                    onClick={() => prefillAsClassLead("IELTS_CLASS", duplicate)}
                  >
                    <Plus size={14} />IELTS Class Lead
                  </Button>
                )}
                {!duplicates.some((d) => d.leadType === "PTE_CLASS") && (
                  <Button
                    variant="outline"
                    className="flex-1 gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                    onClick={() => prefillAsClassLead("PTE_CLASS", duplicate)}
                  >
                    <Plus size={14} />PTE Class Lead
                  </Button>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="flex-col sm:flex-row gap-2 pt-1">
            <Button variant="ghost" onClick={() => setShowDupDialog(false)} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowDupDialog(false); setForceCreate(true); handleSubmit((data) => submitLead(data, true))(); }}
            >
              Create as New Record Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

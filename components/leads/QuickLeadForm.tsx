"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { createLeadSchema, CreateLeadInput } from "@/lib/validations";
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle, Globe, BookOpen, Calendar, GraduationCap, User, Phone, Mail, BookMarked, Building2, UserCheck, FileText, Sparkles } from "lucide-react";
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
  status: string;
  country: { name: string };
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

const LEAD_TYPE_CONFIG = {
  STUDY_ABROAD: {
    icon: Globe,
    label: "Study Abroad",
    gradient: "from-blue-500 to-blue-700",
    lightBg: "bg-blue-50",
    border: "border-blue-500",
    text: "text-blue-700",
    badge: "bg-blue-100 text-blue-700",
    ring: "ring-blue-500",
    description: "International education counselling",
  },
  IELTS_CLASS: {
    icon: BookOpen,
    label: "IELTS Class",
    gradient: "from-purple-500 to-purple-700",
    lightBg: "bg-purple-50",
    border: "border-purple-500",
    text: "text-purple-700",
    badge: "bg-purple-100 text-purple-700",
    ring: "ring-purple-500",
    description: "IELTS preparation coaching",
  },
  PTE_CLASS: {
    icon: BookMarked,
    label: "PTE Class",
    gradient: "from-amber-500 to-orange-600",
    lightBg: "bg-amber-50",
    border: "border-amber-500",
    text: "text-amber-700",
    badge: "bg-amber-100 text-amber-700",
    ring: "ring-amber-500",
    description: "PTE Academic preparation",
  },
  DATE_BOOKING: {
    icon: Calendar,
    label: "Date Booking",
    gradient: "from-teal-500 to-teal-700",
    lightBg: "bg-teal-50",
    border: "border-teal-500",
    text: "text-teal-700",
    badge: "bg-teal-100 text-teal-700",
    ring: "ring-teal-500",
    description: "Test date reservation",
  },
};

export default function QuickLeadForm() {
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [showOptional, setShowOptional] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [duplicate, setDuplicate] = useState<DuplicateLead | null>(null);
  const [showDupDialog, setShowDupDialog] = useState(false);
  const [createdLead, setCreatedLead] = useState<CreatedLead | null>(null);
  const [forceCreate, setForceCreate] = useState(false);

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

  const leadType = (watch("leadType") || "STUDY_ABROAD") as keyof typeof LEAD_TYPE_CONFIG;
  const config = LEAD_TYPE_CONFIG[leadType];
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

  async function checkDuplicate(phoneVal: string) {
    if (!phoneVal || phoneVal.length < 7) return;
    try {
      const res = await fetch(`/api/leads?phone=${encodeURIComponent(phoneVal)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.duplicate) setDuplicate(data.duplicate);
        else setDuplicate(null);
      }
    } catch {}
  }

  async function submitLead(data: CreateLeadInput, force = false) {
    if (!force && duplicate) {
      setShowDupDialog(true);
      return;
    }
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
    setDuplicate(null);
    setForceCreate(false);
    reset();
  }

  if (createdLead) {
    return (
      <div className="max-w-lg mx-auto">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-8 py-10 text-center">
            <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-9 h-9 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">Lead Created!</h2>
            <p className="text-green-100 text-sm">Successfully added to your pipeline</p>
          </div>
          <div className="px-8 py-6 space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Lead ID</span>
              <span className="font-mono font-bold text-blue-700">{createdLead.leadId}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Student</span>
              <span className="font-medium text-gray-800">{createdLead.studentName}</span>
            </div>
            <div className="flex items-center justify-between py-2 border-b border-gray-100">
              <span className="text-sm text-gray-500">Phone</span>
              <span className="font-medium text-gray-800">{createdLead.phone}</span>
            </div>
            {createdLead.assignedCounsellor && (
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-500">Assigned to</span>
                <span className="font-medium text-gray-800">{createdLead.assignedCounsellor.name}</span>
              </div>
            )}
          </div>
          <div className="px-8 pb-8 flex gap-3">
            <Link href={`/leads/${createdLead.id}`} className="flex-1">
              <Button variant="outline" className="w-full">Open Lead</Button>
            </Link>
            <Button onClick={handleCreateAnother} className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800">
              <Sparkles size={15} className="mr-2" />Add Another
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit((data) => submitLead(data, forceCreate))} className="max-w-3xl mx-auto space-y-5">

        {/* Lead Type Selector */}
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Lead Type</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {(Object.keys(LEAD_TYPE_CONFIG) as Array<keyof typeof LEAD_TYPE_CONFIG>).map((type) => {
              const cfg = LEAD_TYPE_CONFIG[type];
              const Icon = cfg.icon;
              const isActive = leadType === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setValue("leadType", type as CreateLeadInput["leadType"])}
                  className={cn(
                    "relative flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all duration-150 text-center",
                    isActive
                      ? `${cfg.border} ${cfg.lightBg} shadow-sm ring-2 ${cfg.ring} ring-offset-1`
                      : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", isActive ? `bg-gradient-to-br ${cfg.gradient}` : "bg-gray-100")}>
                    <Icon size={18} className={isActive ? "text-white" : "text-gray-500"} />
                  </div>
                  <div>
                    <p className={cn("text-xs font-semibold leading-tight", isActive ? cfg.text : "text-gray-600")}>{cfg.label}</p>
                  </div>
                  {isActive && (
                    <div className={cn("absolute top-2 right-2 w-2 h-2 rounded-full bg-gradient-to-br", cfg.gradient)} />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Form Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {/* Card Header */}
          <div className={cn("bg-gradient-to-r px-6 py-4", config.gradient)}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                <config.icon size={16} className="text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">{config.label} Lead</h3>
                <p className="text-white/70 text-xs">{config.description}</p>
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">
            {/* Student Info Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-6 h-6 rounded-lg bg-blue-100 flex items-center justify-center">
                  <User size={12} className="text-blue-600" />
                </div>
                <span className="text-sm font-semibold text-gray-700">Student Information</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="studentName" className="text-xs font-medium text-gray-600">Full Name <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input id="studentName" placeholder="e.g. Ram Bahadur Thapa" className="pl-9" {...register("studentName")} />
                  </div>
                  {errors.studentName && <p className="text-xs text-red-500">{errors.studentName.message}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="phone" className="text-xs font-medium text-gray-600">Phone Number <span className="text-red-500">*</span></Label>
                  <div className="relative">
                    <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="phone"
                      placeholder="98XXXXXXXX"
                      className="pl-9"
                      {...register("phone")}
                      onBlur={(e) => checkDuplicate(e.target.value)}
                    />
                  </div>
                  {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                  {duplicate && (
                    <p className="text-xs text-amber-600 flex items-center gap-1 bg-amber-50 px-2 py-1 rounded-md">
                      <AlertTriangle size={11} />Duplicate: {duplicate.studentName} already exists
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Lead Details Section */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className={cn("w-6 h-6 rounded-lg flex items-center justify-center", config.lightBg)}>
                  <config.icon size={12} className={config.text} />
                </div>
                <span className="text-sm font-semibold text-gray-700">Lead Details</span>
                <div className="flex-1 h-px bg-gray-100 ml-1" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Education Level <span className="text-red-500">*</span></Label>
                  <Select onValueChange={(v) => setValue("educationLevel", v)}>
                    <SelectTrigger>
                      <GraduationCap size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      {EDUCATION_LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  {errors.educationLevel && <p className="text-xs text-red-500">{errors.educationLevel.message}</p>}
                </div>

                {isStudyAbroad ? (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">Interested Country <span className="text-red-500">*</span></Label>
                    <Select onValueChange={(v) => setValue("countryId", v)}>
                      <SelectTrigger>
                        <Globe size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        {refData?.countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                ) : isDateBooking ? (
                  <div className="space-y-1.5">
                    <Label htmlFor="bookingDate" className="text-xs font-medium text-gray-600">Test Booking Date</Label>
                    <div className="relative">
                      <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input id="bookingDate" type="date" className="pl-9" {...register("bookingDate")} />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-gray-600">Test Type</Label>
                    <div className={cn("h-10 flex items-center px-3 rounded-md border text-sm font-medium gap-2", config.lightBg, config.border)}>
                      <config.icon size={14} className={config.text} />
                      <span className={config.text}>{LEAD_TYPE_LABELS[leadType]}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Lead Source <span className="text-red-500">*</span></Label>
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
                    <Label className="text-xs font-medium text-gray-600">Intake</Label>
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
        </div>

        {/* Optional Fields */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowOptional(!showOptional)}
            className="flex items-center justify-between w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-gray-100 flex items-center justify-center">
                <FileText size={12} className="text-gray-500" />
              </div>
              <span className="text-sm font-semibold text-gray-700">Additional Information</span>
              <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">Optional</span>
            </div>
            {showOptional
              ? <ChevronUp size={16} className="text-gray-400" />
              : <ChevronDown size={16} className="text-gray-400" />}
          </button>

          {showOptional && (
            <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-medium text-gray-600">Email Address</Label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input id="email" type="email" placeholder="email@example.com" className="pl-9" {...register("email")} />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course" className="text-xs font-medium text-gray-600">Preferred Course</Label>
                  <div className="relative">
                    <BookOpen size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                    <Input id="course" placeholder="e.g. Computer Science" className="pl-9" {...register("course")} />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Branch</Label>
                  <Select onValueChange={(v) => setValue("branchId", v)}>
                    <SelectTrigger>
                      <Building2 size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                      <SelectValue placeholder="Select branch" />
                    </SelectTrigger>
                    <SelectContent>
                      {refData?.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium text-gray-600">Assign Counsellor</Label>
                  <Select onValueChange={(v) => setValue("assignedCounsellorId", v)}>
                    <SelectTrigger>
                      <UserCheck size={14} className="text-gray-400 mr-2 flex-shrink-0" />
                      <SelectValue placeholder="Auto-assign" />
                    </SelectTrigger>
                    <SelectContent>
                      {refData?.counsellors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-xs font-medium text-gray-600">Notes</Label>
                <Textarea id="notes" placeholder="Any additional context about this lead..." rows={3} {...register("notes")} />
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            type="submit"
            disabled={submitting}
            size="lg"
            className={cn("px-8 bg-gradient-to-r text-white shadow-sm hover:shadow-md transition-all", config.gradient, "hover:opacity-90")}
          >
            {submitting
              ? <><Loader2 size={16} className="mr-2 animate-spin" />Creating...</>
              : <><Sparkles size={16} className="mr-2" />Create Lead</>}
          </Button>
          {duplicate && (
            <p className="text-xs text-amber-600 flex items-center gap-1">
              <AlertTriangle size={12} />Possible duplicate — review before submitting
            </p>
          )}
        </div>
      </form>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDupDialog} onOpenChange={setShowDupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertTriangle className="text-amber-500" size={16} />
              </div>
              Duplicate Lead Found
            </DialogTitle>
          </DialogHeader>
          {duplicate && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{duplicate.studentName}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{duplicate.phone}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Country</span><span className="font-medium">{duplicate.country.name}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium">{duplicate.status}</span></div>
              {duplicate.assignedCounsellor && (
                <div className="flex justify-between"><span className="text-gray-500">Counsellor</span><span className="font-medium">{duplicate.assignedCounsellor.name}</span></div>
              )}
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Link href={duplicate ? `/leads/${duplicate.id}` : "#"}>
              <Button variant="outline" className="w-full sm:w-auto">Open Existing Lead</Button>
            </Link>
            <Button
              onClick={() => {
                setShowDupDialog(false);
                setForceCreate(true);
                handleSubmit((data) => submitLead(data, true))();
              }}
              variant="destructive"
            >
              Create Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

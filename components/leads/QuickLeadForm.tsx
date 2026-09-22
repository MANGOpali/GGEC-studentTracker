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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp, Loader2, CheckCircle, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { EDUCATION_LEVELS, LEAD_TYPE_LABELS, STATUSES_BY_TYPE } from "@/lib/utils";

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


  const leadType = watch("leadType") || "STUDY_ABROAD";
  const isClassType = leadType === "IELTS_CLASS" || leadType === "PTE_CLASS";
  const isDateBooking = leadType === "DATE_BOOKING";
  const isStudyAbroad = leadType === "STUDY_ABROAD";

  // Pre-fill source from URL param
  useEffect(() => {
    const sourceParam = searchParams.get("source");
    if (sourceParam && refData) {
      const matched = refData.sources.find(
        (s) => s.name.toLowerCase().replace(/[\s-]/g, "") === sourceParam.toLowerCase().replace(/[\s-]/g, "")
      );
      if (matched) setValue("sourceId", matched.id);
    }
  }, [searchParams, refData, setValue]);

  // Duplicate check on phone blur
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
      <Card className="max-w-lg mx-auto">
        <CardContent className="pt-8 pb-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-1">Lead Created Successfully!</h2>
          <p className="text-gray-600 mb-1">Lead ID: <span className="font-mono font-bold text-[#0E356B]">{createdLead.leadId}</span></p>
          <p className="text-gray-600 mb-1">{createdLead.studentName} · {createdLead.phone}</p>
          {createdLead.assignedCounsellor && (
            <p className="text-sm text-gray-500 mb-4">Assigned to: {createdLead.assignedCounsellor.name}</p>
          )}
          <div className="flex gap-3 justify-center mt-6">
            <Link href={`/leads/${createdLead.id}`}>
              <Button variant="outline">Open Lead</Button>
            </Link>
            <Button onClick={handleCreateAnother}>Create Another</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit((data) => submitLead(data, forceCreate))} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Lead Type */}
            <div className="space-y-1.5">
              <Label>Lead Type *</Label>
              <Select value={leadType} onValueChange={(v) => setValue("leadType", v as CreateLeadInput["leadType"])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(LEAD_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="studentName">Student Name *</Label>
                <Input id="studentName" placeholder="Full name" {...register("studentName")} />
                {errors.studentName && <p className="text-xs text-red-500">{errors.studentName.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone *</Label>
                <Input
                  id="phone"
                  placeholder="98XXXXXXXX"
                  {...register("phone")}
                  onBlur={(e) => checkDuplicate(e.target.value)}
                />
                {errors.phone && <p className="text-xs text-red-500">{errors.phone.message}</p>}
                {duplicate && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12} />Duplicate phone found: {duplicate.studentName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Education Level *</Label>
                <Select onValueChange={(v) => setValue("educationLevel", v)}>
                  <SelectTrigger>
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
                  <Label>Interested Country *</Label>
                  <Select onValueChange={(v) => setValue("countryId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country" />
                    </SelectTrigger>
                    <SelectContent>
                      {refData?.countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ) : isDateBooking ? (
                <div className="space-y-1.5">
                  <Label htmlFor="bookingDate">Test Booking Date</Label>
                  <Input id="bookingDate" type="date" {...register("bookingDate")} />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label>Test Type</Label>
                  <div className="h-10 flex items-center px-3 rounded-md border bg-gray-50 text-sm text-gray-600">
                    {LEAD_TYPE_LABELS[leadType]}
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Lead Source *</Label>
                <Select onValueChange={(v) => setValue("sourceId", v)} value={watch("sourceId")}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select source" />
                  </SelectTrigger>
                  <SelectContent>
                    {refData?.sources.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                {errors.sourceId && <p className="text-xs text-red-500">{errors.sourceId.message}</p>}
              </div>
              {isStudyAbroad && (
                <div className="space-y-1.5">
                  <Label>Intake</Label>
                  <Select onValueChange={(v) => setValue("intakeId", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select intake" />
                    </SelectTrigger>
                    <SelectContent>
                      {refData?.intakes.map((i) => <SelectItem key={i.id} value={i.id}>{i.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Optional Fields */}
        <Card>
          <CardHeader>
            <button
              type="button"
              onClick={() => setShowOptional(!showOptional)}
              className="flex items-center justify-between w-full text-left"
            >
              <CardTitle className="text-base">Optional Information</CardTitle>
              {showOptional ? <ChevronUp size={18} className="text-gray-500" /> : <ChevronDown size={18} className="text-gray-500" />}
            </button>
          </CardHeader>
          {showOptional && (
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="email@example.com" {...register("email")} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="course">Preferred Course</Label>
                  <Input id="course" placeholder="e.g. Computer Science" {...register("course")} />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Branch</Label>
                  <Select onValueChange={(v) => setValue("branchId", v)}>
                    <SelectTrigger><SelectValue placeholder="Select branch" /></SelectTrigger>
                    <SelectContent>
                      {refData?.branches.map((b) => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Assign to Counsellor</Label>
                  <Select onValueChange={(v) => setValue("assignedCounsellorId", v)}>
                    <SelectTrigger><SelectValue placeholder="Auto-assign" /></SelectTrigger>
                    <SelectContent>
                      {refData?.counsellors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" placeholder="Any additional notes..." rows={3} {...register("notes")} />
              </div>
            </CardContent>
          )}
        </Card>

        <Button type="submit" disabled={submitting} className="w-full sm:w-auto" size="lg">
          {submitting ? <><Loader2 size={16} className="mr-2 animate-spin" />Creating...</> : "Create Lead"}
        </Button>
      </form>

      {/* Duplicate Warning Dialog */}
      <Dialog open={showDupDialog} onOpenChange={setShowDupDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={20} />
              Duplicate Lead Found
            </DialogTitle>
          </DialogHeader>
          {duplicate && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2 text-sm">
              <div><span className="font-medium">Name:</span> {duplicate.studentName}</div>
              <div><span className="font-medium">Phone:</span> {duplicate.phone}</div>
              <div><span className="font-medium">Country:</span> {duplicate.country.name}</div>
              <div><span className="font-medium">Status:</span> {duplicate.status}</div>
              {duplicate.assignedCounsellor && (
                <div><span className="font-medium">Counsellor:</span> {duplicate.assignedCounsellor.name}</div>
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

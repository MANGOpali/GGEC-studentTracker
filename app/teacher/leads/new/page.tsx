import { Suspense } from "react";
import QuickLeadForm from "@/components/leads/QuickLeadForm";

export default function TeacherNewLeadPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
        <p className="text-sm text-gray-500 mt-0.5">Capture a new class or booking lead</p>
      </div>
      <Suspense>
        <QuickLeadForm allowedTypes={["STUDY_ABROAD", "IELTS_CLASS", "PTE_CLASS", "DATE_BOOKING"]} />
      </Suspense>
    </div>
  );
}

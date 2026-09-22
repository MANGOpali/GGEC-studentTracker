import { Suspense } from "react";
import QuickLeadForm from "@/components/leads/QuickLeadForm";

export default function NewLeadPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Quick Lead</h1>
        <p className="text-gray-500 text-sm mt-1">Capture a new lead in under 15 seconds</p>
      </div>
      <Suspense>
        <QuickLeadForm />
      </Suspense>
    </div>
  );
}

import { Suspense } from "react";
import QuickLeadForm from "@/components/leads/QuickLeadForm";

export default function NewLeadPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add New Lead</h1>
        <p className="text-gray-500 text-sm mt-1">Capture a new lead — select the type to get started</p>
      </div>
      <Suspense>
        <QuickLeadForm />
      </Suspense>
    </div>
  );
}

import Link from "next/link";
import { UserPlus, BookOpen } from "lucide-react";

export default function ReceptionDashboardPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome</h1>
      <p className="text-gray-500 mb-8">Receptionist Portal</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link href="/leads/new">
          <div className="border-2 border-dashed border-[#0E356B]/30 rounded-xl p-8 text-center hover:border-[#0E356B]/60 hover:bg-blue-50 transition-colors cursor-pointer">
            <UserPlus className="w-10 h-10 text-[#0E356B] mx-auto mb-3" />
            <p className="font-semibold text-gray-800">Add New Lead</p>
            <p className="text-sm text-gray-500 mt-1">Quick lead capture</p>
          </div>
        </Link>
        <Link href="/reception/leads">
          <div className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-gray-400 hover:bg-gray-50 transition-colors cursor-pointer">
            <BookOpen className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <p className="font-semibold text-gray-800">My Leads</p>
            <p className="text-sm text-gray-500 mt-1">View leads I created</p>
          </div>
        </Link>
      </div>
    </div>
  );
}

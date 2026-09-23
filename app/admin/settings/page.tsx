import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function AdminSettingsPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        <Link href="/admin/integrations/google-sheets">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader><CardTitle className="text-base">Google Sheets Sync</CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-500">
              Configure and manage Google Sheets integration for lead export.
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/import">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader><CardTitle className="text-base">Import Students</CardTitle></CardHeader>
            <CardContent className="text-sm text-gray-500">
              Bulk-import existing student records from a CSV file.
            </CardContent>
          </Card>
        </Link>
        <Card className="opacity-60">
          <CardHeader><CardTitle className="text-base">Reference Data</CardTitle></CardHeader>
          <CardContent className="text-sm text-gray-500">
            Manage lead sources, countries, intakes and branches. <span className="text-xs">(Coming soon)</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

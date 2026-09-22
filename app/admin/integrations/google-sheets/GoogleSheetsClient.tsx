"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

export default function GoogleSheetsClient() {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string } | null>(null);
  const [syncResult, setSyncResult] = useState<{ synced: number; failed: number; total: number } | null>(null);

  async function testConnection() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/google-sheets/test", { method: "POST" });
      const data = await res.json();
      setTestResult(data);
      toast({ title: data.success ? "Connection successful!" : "Connection failed", variant: data.success ? "default" : "destructive", description: data.error });
    } finally {
      setTesting(false);
    }
  }

  async function retryFailedSyncs() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/google-sheets/sync", { method: "POST" });
      const data = await res.json();
      setSyncResult(data);
      toast({ title: `Sync complete: ${data.synced} synced, ${data.failed} failed` });
    } finally {
      setSyncing(false);
    }
  }

  const configured = !!(process.env.NEXT_PUBLIC_APP_URL); // Just a placeholder check

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Google Sheets Integration</h1>

      <div className="max-w-2xl space-y-4">
        <Card>
          <CardHeader><CardTitle className="text-base">Connection Status</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-500">Sheet ID</span>
                <span className="font-mono text-xs">{process.env.GOOGLE_SHEET_ID ? "Configured" : "Not configured"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Service Account</span>
                <span className="font-mono text-xs">{process.env.GOOGLE_CLIENT_EMAIL ? "Configured" : "Not configured"}</span>
              </div>
            </div>

            {testResult && (
              <div className={`flex items-center gap-2 p-3 rounded-lg text-sm ${testResult.success ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                {testResult.success ? <CheckCircle size={16} /> : <XCircle size={16} />}
                {testResult.success ? "Connected successfully" : testResult.error}
              </div>
            )}

            <Button onClick={testConnection} disabled={testing} variant="outline">
              {testing ? <Loader2 size={16} className="mr-2 animate-spin" /> : null}
              Test Connection
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Failed Syncs</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              Leads that failed to sync to Google Sheets can be retried here. Failed syncs never affect lead creation.
            </p>

            {syncResult && (
              <div className="bg-blue-50 text-blue-700 rounded-lg p-3 text-sm">
                Processed {syncResult.total} leads: {syncResult.synced} synced, {syncResult.failed} still failed.
              </div>
            )}

            <Button onClick={retryFailedSyncs} disabled={syncing}>
              {syncing ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}
              Retry Failed Syncs
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Column Mapping</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              {["Lead ID", "Name", "Phone", "Email", "Education Level", "Country", "Course", "Intake", "Source", "Status", "Counsellor", "Branch", "Created By", "Created At", "Next Follow-up", "Notes"].map((col, i) => (
                <div key={col} className="flex items-center gap-2">
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700">{String.fromCharCode(65 + i)}</span>
                  <span>{col}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

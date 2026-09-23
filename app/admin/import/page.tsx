"use client";

import { useState, useRef } from "react";
import { Upload, Download, CheckCircle2, XCircle, FileSpreadsheet, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ImportResult {
  row: number;
  status: "success" | "error";
  studentName: string;
  message?: string;
}

interface ImportResponse {
  succeeded: number;
  failed: number;
  results: ImportResult[];
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ImportResponse | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) { setFile(f); setResponse(null); setError(""); }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f && f.name.endsWith(".csv")) { setFile(f); setResponse(null); setError(""); }
  }

  async function upload() {
    if (!file) return;
    setLoading(true);
    setError("");
    setResponse(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/import/students", { method: "POST", body: form });
      const json = await res.json();
      if (!res.ok) { setError(json.error || "Import failed"); return; }
      setResponse(json);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Students</h1>
        <p className="text-sm text-gray-500 mt-0.5">Upload a CSV file to bulk-import existing student records</p>
      </div>

      {/* Step 1 - Download template */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">1</div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Download the template</p>
            <p className="text-sm text-gray-500 mt-0.5 mb-3">Fill in your student data using the provided CSV template. Do not change the column headers.</p>
            <a href="/student-import-template.csv" download>
              <Button variant="outline" size="sm" className="gap-2">
                <Download size={14} />Download Template
              </Button>
            </a>
          </div>
        </div>
      </div>

      {/* Field reference */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-sm">
        <p className="font-semibold text-amber-900 mb-3">Column reference</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-1.5 text-amber-800">
          <div><span className="font-medium">studentName*</span> — Full name</div>
          <div><span className="font-medium">phone*</span> — Mobile number</div>
          <div><span className="font-medium">email</span> — Optional</div>
          <div><span className="font-medium">educationLevel</span> — e.g. Bachelor&apos;s, High School</div>
          <div><span className="font-medium">leadType*</span> — IELTS_CLASS · PTE_CLASS · STUDY_ABROAD · DATE_BOOKING</div>
          <div><span className="font-medium">classType</span> — PHYSICAL · ONLINE · CRASH_COURSE</div>
          <div><span className="font-medium">studentStatus</span> — TRIAL · ACTIVE · HOLD · COMPLETE · DROPPED</div>
          <div><span className="font-medium">status</span> — e.g. IN_CLASS · NEW · DEMO_SCHEDULED</div>
          <div><span className="font-medium">source*</span> — Walk-in · Facebook · Instagram · WhatsApp · Google · Referral … (must match exactly)</div>
          <div><span className="font-medium">branch</span> — Jadibuti · Butwal · Kalanki</div>
          <div><span className="font-medium">teacher</span> — Nikesh · Dixit (exact name)</div>
          <div><span className="font-medium">shift</span> — Morning Batch A · Morning Batch B … (exact name)</div>
          <div><span className="font-medium">totalFee</span> — Number, e.g. 15000</div>
          <div><span className="font-medium">discount</span> — Number, e.g. 1000</div>
          <div><span className="font-medium">notes</span> — Optional</div>
        </div>
        <p className="text-xs text-amber-700 mt-3">* Required fields. All other fields are optional.</p>
      </div>

      {/* Step 2 - Upload */}
      <div className="bg-white rounded-xl border p-5">
        <div className="flex items-start gap-4">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-sm font-bold flex items-center justify-center flex-shrink-0">2</div>
          <div className="flex-1">
            <p className="font-medium text-gray-900">Upload your filled CSV</p>
            <div
              className="mt-3 border-2 border-dashed border-gray-200 rounded-xl p-8 text-center hover:border-blue-400 hover:bg-blue-50 transition-colors cursor-pointer"
              onClick={() => inputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={(e) => e.preventDefault()}
            >
              <FileSpreadsheet size={32} className="mx-auto text-gray-300 mb-2" />
              {file ? (
                <div>
                  <p className="text-sm font-medium text-gray-800">{file.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{(file.size / 1024).toFixed(1)} KB — click to change</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-gray-500">Drag & drop your CSV here, or <span className="text-blue-600 font-medium">browse</span></p>
                  <p className="text-xs text-gray-400 mt-0.5">.csv files only</p>
                </div>
              )}
              <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={onFileChange} />
            </div>
            {file && (
              <div className="mt-3 flex justify-end">
                <Button onClick={upload} disabled={loading} className="gap-2">
                  {loading ? <><Loader2 size={15} className="animate-spin" />Importing...</> : <><Upload size={15} />Import {file.name}</>}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>
      )}

      {/* Results */}
      {response && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <div className="p-5 border-b flex items-center gap-6">
            <div className="flex items-center gap-2 text-green-700">
              <CheckCircle2 size={18} />
              <span className="font-semibold text-lg">{response.succeeded}</span>
              <span className="text-sm">imported</span>
            </div>
            {response.failed > 0 && (
              <div className="flex items-center gap-2 text-red-600">
                <XCircle size={18} />
                <span className="font-semibold text-lg">{response.failed}</span>
                <span className="text-sm">failed</span>
              </div>
            )}
          </div>
          {response.failed > 0 && (
            <div className="divide-y max-h-80 overflow-y-auto">
              {response.results.filter((r) => r.status === "error").map((r) => (
                <div key={r.row} className="flex items-start gap-3 px-5 py-3">
                  <XCircle size={15} className="text-red-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">Row {r.row}: {r.studentName}</p>
                    <p className="text-xs text-red-600 mt-0.5">{r.message}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Paperclip, Upload, Trash2, Download, Loader2, FileText, File } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

const DOC_TYPES = [
  "Passport",
  "Academic Transcripts",
  "English Test Result",
  "Financial Documents",
  "SOP / Personal Statement",
  "Recommendation Letter",
  "Visa Documents",
  "Offer Letter",
  "Other",
];

interface Doc {
  id: string;
  name: string;
  key: string;
  size: number;
  docType: string;
  createdAt: string;
  uploadedBy: { id: string; name: string };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FileIcon({ name }: { name: string }) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["pdf"].includes(ext)) return <FileText size={14} className="text-red-500" />;
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return <FileText size={14} className="text-blue-500" />;
  if (["doc", "docx"].includes(ext)) return <FileText size={14} className="text-blue-700" />;
  return <File size={14} className="text-gray-400" />;
}

export default function DocumentsSection({ leadId, myRole }: { leadId: string; myRole: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showDialog, setShowDialog] = useState(false);
  const [docType, setDocType] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [docToDelete, setDocToDelete] = useState<Doc | null>(null);

  const { data, isLoading } = useQuery<{ documents: Doc[] }>({
    queryKey: ["documents", leadId],
    queryFn: () => fetch(`/api/leads/${leadId}/documents`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const documents = data?.documents ?? [];
  const canDelete = myRole === "ADMIN" || myRole === "COUNSELLOR" || myRole === "RECEPTIONIST";

  function openDialog() {
    setDocType("");
    setSelectedFile(null);
    setShowDialog(true);
  }

  async function handleUpload() {
    if (!selectedFile || !docType) return;
    setUploading(true);
    try {
      const presignRes = await fetch(
        `/api/leads/${leadId}/documents?presign=${encodeURIComponent(selectedFile.name)}&contentType=${encodeURIComponent(selectedFile.type || "application/octet-stream")}`
      );
      if (!presignRes.ok) throw new Error("Failed to get upload URL");
      const { uploadUrl, key } = await presignRes.json();

      const putRes = await fetch(uploadUrl, {
        method: "PUT",
        body: selectedFile,
        headers: { "Content-Type": selectedFile.type || "application/octet-stream" },
      });
      if (!putRes.ok) throw new Error("Upload to storage failed");

      const saveRes = await fetch(`/api/leads/${leadId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: selectedFile.name, key, size: selectedFile.size, docType }),
      });
      if (!saveRes.ok) throw new Error("Failed to save document record");

      await queryClient.invalidateQueries({ queryKey: ["documents", leadId] });
      setShowDialog(false);
      toast({ title: "Document uploaded" });
    } catch (err) {
      toast({ variant: "destructive", title: "Upload failed", description: (err as Error).message });
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload(doc: Doc) {
    setDownloadingId(doc.id);
    try {
      const res = await fetch(`/api/leads/${leadId}/documents?download=${encodeURIComponent(doc.key)}`);
      if (!res.ok) throw new Error("Failed to get download URL");
      const { downloadUrl } = await res.json();
      window.open(downloadUrl, "_blank");
    } catch {
      toast({ variant: "destructive", title: "Download failed" });
    } finally {
      setDownloadingId(null);
    }
  }

  async function confirmDelete() {
    if (!docToDelete) return;
    setDeletingId(docToDelete.id);
    setDocToDelete(null);
    try {
      const res = await fetch(`/api/leads/${leadId}/documents?docId=${docToDelete.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      await queryClient.invalidateQueries({ queryKey: ["documents", leadId] });
      toast({ title: "Document deleted" });
    } catch {
      toast({ variant: "destructive", title: "Delete failed" });
    } finally {
      setDeletingId(null);
    }
  }

  const grouped = documents.reduce<Record<string, Doc[]>>((acc, doc) => {
    (acc[doc.docType] = acc[doc.docType] ?? []).push(doc);
    return acc;
  }, {});

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Documents</span>
          {documents.length > 0 && (
            <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">{documents.length}</span>
          )}
        </div>
        <button
          onClick={openDialog}
          className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
        >
          <Upload size={11} />Upload
        </button>
      </div>

      <div className="px-5 py-4">
        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 size={18} className="animate-spin text-gray-300" />
          </div>
        ) : documents.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <Paperclip size={28} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No documents yet</p>
            <button onClick={openDialog} className="mt-2 text-xs text-blue-600 hover:text-blue-700 font-medium">
              Upload first document
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {Object.entries(grouped).map(([type, docs]) => (
              <div key={type}>
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-2">{type}</p>
                <div className="space-y-1.5">
                  {docs.map((doc) => (
                    <div
                      key={doc.id}
                      className="flex items-center gap-3 p-2.5 rounded-xl bg-gray-50 border border-gray-100 hover:border-gray-200 transition-colors group"
                    >
                      <div className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                        <FileIcon name={doc.name} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">{doc.name}</p>
                        <p className="text-[10px] text-gray-400">
                          {formatBytes(doc.size)} · {doc.uploadedBy.name}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleDownload(doc)}
                          disabled={downloadingId === doc.id}
                          className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Download"
                        >
                          {downloadingId === doc.id
                            ? <Loader2 size={11} className="animate-spin" />
                            : <Download size={11} />}
                        </button>
                        {canDelete && (
                          <button
                            onClick={() => setDocToDelete(doc)}
                            disabled={deletingId === doc.id}
                            className="w-6 h-6 rounded-md flex items-center justify-center text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Delete"
                          >
                            {deletingId === doc.id
                              ? <Loader2 size={11} className="animate-spin" />
                              : <Trash2 size={11} />}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <Dialog open={!!docToDelete} onOpenChange={(open) => { if (!open) setDocToDelete(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 size={14} className="text-red-600" />
              </div>
              Delete Document
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Are you sure you want to delete this document? This action cannot be undone.
            </p>
            {docToDelete && (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-gray-50 border border-gray-100">
                <div className="w-8 h-8 rounded-lg bg-white border border-gray-200 flex items-center justify-center flex-shrink-0">
                  <FileIcon name={docToDelete.name} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{docToDelete.name}</p>
                  <p className="text-[10px] text-gray-400">{formatBytes(docToDelete.size)} · {docToDelete.docType}</p>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDocToDelete(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Upload Document</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Document Type</Label>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <div
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors",
                  selectedFile ? "border-blue-300 bg-blue-50" : "border-gray-200 hover:border-gray-300"
                )}
              >
                {selectedFile ? (
                  <div>
                    <p className="text-sm font-medium text-blue-700 truncate">{selectedFile.name}</p>
                    <p className="text-xs text-blue-500 mt-0.5">{formatBytes(selectedFile.size)}</p>
                  </div>
                ) : (
                  <div>
                    <Upload size={20} className="mx-auto mb-2 text-gray-300" />
                    <p className="text-sm text-gray-500">Click to select file</p>
                    <p className="text-xs text-gray-400 mt-0.5">PDF, Word, images up to 10 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.xls"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)} disabled={uploading}>Cancel</Button>
            <Button onClick={handleUpload} disabled={!selectedFile || !docType || uploading}>
              {uploading ? <><Loader2 size={13} className="animate-spin mr-1.5" />Uploading…</> : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

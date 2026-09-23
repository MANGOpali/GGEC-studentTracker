"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { DollarSign, Plus, Trash2, CreditCard, Banknote, Smartphone, Building2, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

interface Payment {
  id: string;
  amount: number;
  method: string;
  reference: string | null;
  paidAt: string;
  notes: string | null;
}

interface FeeRecord {
  id: string;
  totalFee: number;
  discount: number;
  notes: string | null;
  createdBy: { name: string };
  payments: Payment[];
}

const methodIcons: Record<string, React.ReactNode> = {
  CASH: <Banknote size={14} />,
  BANK_TRANSFER: <Building2 size={14} />,
  CARD: <CreditCard size={14} />,
  ONLINE: <Smartphone size={14} />,
  OTHER: <MoreHorizontal size={14} />,
};

const methodLabels: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  CARD: "Card",
  ONLINE: "Online",
  OTHER: "Other",
};

export default function FeeSection({ leadId, role }: { leadId: string; role: string }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showFeeDialog, setShowFeeDialog] = useState(false);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [feeForm, setFeeForm] = useState({ totalFee: "", discount: "", notes: "" });
  const [payForm, setPayForm] = useState({ amount: "", method: "CASH", reference: "", paidAt: "", notes: "" });
  const [saving, setSaving] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["fees", leadId],
    queryFn: () => fetch(`/api/leads/${leadId}/fees`).then((r) => r.json()),
    staleTime: 30_000,
  });

  const feeRecord: FeeRecord | null = data?.feeRecord ?? null;
  const totalPaid = feeRecord?.payments.reduce((s, p) => s + p.amount, 0) ?? 0;
  const netFee = (feeRecord?.totalFee ?? 0) - (feeRecord?.discount ?? 0);
  const balance = netFee - totalPaid;
  const pct = netFee > 0 ? Math.min(100, Math.round((totalPaid / netFee) * 100)) : 0;

  function openFeeDialog() {
    if (feeRecord) {
      setFeeForm({ totalFee: String(feeRecord.totalFee), discount: String(feeRecord.discount), notes: feeRecord.notes ?? "" });
    } else {
      setFeeForm({ totalFee: "", discount: "", notes: "" });
    }
    setShowFeeDialog(true);
  }

  async function saveFee() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/fees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ totalFee: Number(feeForm.totalFee), discount: Number(feeForm.discount || 0), notes: feeForm.notes || null }),
      });
      if (res.ok) {
        setShowFeeDialog(false);
        queryClient.invalidateQueries({ queryKey: ["fees", leadId] });
        toast({ title: "Fee updated" });
      } else {
        const d = await res.json();
        toast({ variant: "destructive", title: "Error", description: d.error });
      }
    } finally {
      setSaving(false);
    }
  }

  async function addPayment() {
    setSaving(true);
    try {
      const res = await fetch(`/api/leads/${leadId}/fees/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: Number(payForm.amount), method: payForm.method, reference: payForm.reference || null, paidAt: payForm.paidAt || null, notes: payForm.notes || null }),
      });
      if (res.ok) {
        setShowPaymentDialog(false);
        setPayForm({ amount: "", method: "CASH", reference: "", paidAt: "", notes: "" });
        queryClient.invalidateQueries({ queryKey: ["fees", leadId] });
        toast({ title: "Payment recorded" });
      } else {
        const d = await res.json();
        toast({ variant: "destructive", title: "Error", description: d.error });
      }
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(paymentId: string) {
    if (!confirm("Delete this payment?")) return;
    await fetch(`/api/leads/${leadId}/fees/payments?paymentId=${paymentId}`, { method: "DELETE" });
    queryClient.invalidateQueries({ queryKey: ["fees", leadId] });
    toast({ title: "Payment deleted" });
  }

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  const barColor = pct >= 100 ? "bg-green-500" : pct >= 50 ? "bg-amber-500" : "bg-red-400";

  return (
    <div className="space-y-3">
      {!feeRecord ? (
        <div className="text-center py-6 border-2 border-dashed rounded-lg">
          <DollarSign size={24} className="mx-auto text-gray-300 mb-2" />
          <p className="text-sm text-gray-500 mb-3">No fee set yet</p>
          {(role === "ADMIN" || role === "RECEPTIONIST") && (
            <Button size="sm" variant="outline" onClick={openFeeDialog}>Set Fee</Button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-gray-50 rounded-lg p-2.5 text-center">
              <p className="text-xs text-gray-500">Total Fee</p>
              <p className="text-sm font-bold text-gray-900">NPR {feeRecord.totalFee.toLocaleString()}</p>
              {feeRecord.discount > 0 && <p className="text-xs text-green-600">-{feeRecord.discount.toLocaleString()} disc</p>}
            </div>
            <div className="bg-blue-50 rounded-lg p-2.5 text-center">
              <p className="text-xs text-blue-600">Paid</p>
              <p className="text-sm font-bold text-blue-700">NPR {totalPaid.toLocaleString()}</p>
            </div>
            <div className={`rounded-lg p-2.5 text-center ${balance <= 0 ? "bg-green-50" : "bg-red-50"}`}>
              <p className={`text-xs ${balance <= 0 ? "text-green-600" : "text-red-500"}`}>Balance</p>
              <p className={`text-sm font-bold ${balance <= 0 ? "text-green-700" : "text-red-600"}`}>NPR {Math.abs(balance).toLocaleString()}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>{pct}% paid</span>
              <span>NPR {netFee.toLocaleString()} net</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${barColor}`} style={{ width: `${pct}%` }} />
            </div>
          </div>

          {feeRecord.payments.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Payments</p>
              {feeRecord.payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between group bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">{methodIcons[p.method]}</span>
                    <div>
                      <p className="text-sm font-medium text-gray-900">NPR {p.amount.toLocaleString()}</p>
                      <p className="text-xs text-gray-400">{methodLabels[p.method]}{p.reference ? ` · ${p.reference}` : ""}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-400">{new Date(p.paidAt).toLocaleDateString()}</p>
                    {role === "ADMIN" && (
                      <button onClick={() => deletePayment(p.id)} className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-600 transition-opacity">
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            {(role === "ADMIN" || role === "RECEPTIONIST") && (
              <>
                <Button size="sm" variant="outline" className="flex-1" onClick={openFeeDialog}>Edit Fee</Button>
                <Button size="sm" className="flex-1" onClick={() => setShowPaymentDialog(true)}>
                  <Plus size={13} className="mr-1" />Add Payment
                </Button>
              </>
            )}
          </div>
        </>
      )}

      <Dialog open={showFeeDialog} onOpenChange={setShowFeeDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{feeRecord ? "Edit Fee" : "Set Fee"}</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Total Fee (NPR)</Label>
              <Input type="number" value={feeForm.totalFee} onChange={(e) => setFeeForm((f) => ({ ...f, totalFee: e.target.value }))} placeholder="e.g. 45000" />
            </div>
            <div className="space-y-1.5">
              <Label>Discount (NPR)</Label>
              <Input type="number" value={feeForm.discount} onChange={(e) => setFeeForm((f) => ({ ...f, discount: e.target.value }))} placeholder="0" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={feeForm.notes} onChange={(e) => setFeeForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeeDialog(false)}>Cancel</Button>
            <Button onClick={saveFee} disabled={saving || !feeForm.totalFee}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showPaymentDialog} onOpenChange={setShowPaymentDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>Record Payment</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>Amount (NPR)</Label>
              <Input type="number" value={payForm.amount} onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))} placeholder="e.g. 15000" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Method</Label>
                <Select value={payForm.method} onValueChange={(v) => setPayForm((f) => ({ ...f, method: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASH">Cash</SelectItem>
                    <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                    <SelectItem value="CARD">Card</SelectItem>
                    <SelectItem value="ONLINE">Online</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={payForm.paidAt} onChange={(e) => setPayForm((f) => ({ ...f, paidAt: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Reference / Receipt No.</Label>
              <Input value={payForm.reference} onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="space-y-1.5">
              <Label>Notes</Label>
              <Input value={payForm.notes} onChange={(e) => setPayForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Optional" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowPaymentDialog(false)}>Cancel</Button>
            <Button onClick={addPayment} disabled={saving || !payForm.amount}>Record</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

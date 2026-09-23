"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { DollarSign, TrendingDown, Users, AlertCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

interface FeeRecord {
  id: string;
  leadId: string;
  studentName: string;
  classType: string | null;
  studentStatus: string | null;
  totalFee: number;
  discount: number;
  netFee: number;
  paid: number;
  balance: number;
  paymentStatus: "PAID" | "PARTIAL" | "UNPAID" | "NO_FEE";
}

interface Summary {
  totalStudents: number;
  studentsWithFee: number;
  totalRevenue: number;
  totalOutstanding: number;
}

const PAYMENT_STATUS_BADGE: Record<string, string> = {
  PAID:    "bg-green-100 text-green-700",
  PARTIAL: "bg-amber-100 text-amber-700",
  UNPAID:  "bg-red-100 text-red-600",
  NO_FEE:  "bg-gray-100 text-gray-500",
};

const CLASS_TYPE_LABELS: Record<string, string> = {
  IELTS_CLASS: "IELTS",
  PTE_CLASS: "PTE",
};

const STUDENT_STATUS_LABELS: Record<string, string> = {
  TRIAL: "Trial", ACTIVE: "Active", HOLD: "Hold", COMPLETE: "Complete", DROPPED: "Dropped",
};

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string; sub?: string; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon size={20} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 leading-tight">{value}</p>
        <p className="text-sm text-gray-500 mt-0.5">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

export default function FeesReportSection() {
  const [classType, setClassType] = useState("ALL");
  const [studentStatus, setStudentStatus] = useState("ALL");
  const [paymentStatus, setPaymentStatus] = useState("ALL");

  const params = new URLSearchParams();
  if (classType !== "ALL") params.set("classType", classType);
  if (studentStatus !== "ALL") params.set("studentStatus", studentStatus);
  if (paymentStatus !== "ALL") params.set("paymentStatus", paymentStatus);

  const { data, isLoading } = useQuery({
    queryKey: ["reports-fees", classType, studentStatus, paymentStatus],
    queryFn: () => fetch(`/api/reports/fees?${params}`).then((r) => r.json()),
    staleTime: 60_000,
  });

  const summary: Summary = data?.summary ?? { totalStudents: 0, studentsWithFee: 0, totalRevenue: 0, totalOutstanding: 0 };
  const records: FeeRecord[] = data?.records ?? [];

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Users}        label="Total Students"   value={String(summary.totalStudents)}   color="bg-indigo-100 text-indigo-600" />
          <SummaryCard icon={DollarSign}   label="Students with Fee" value={String(summary.studentsWithFee)} color="bg-blue-100 text-blue-600" />
          <SummaryCard icon={TrendingDown} label="Total Revenue"    value={fmt(summary.totalRevenue)}      sub="sum of all payments" color="bg-green-100 text-green-600" />
          <SummaryCard icon={AlertCircle}  label="Outstanding"      value={fmt(summary.totalOutstanding)}  sub="total balance due" color="bg-red-100 text-red-600" />
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl border p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1.5 min-w-[140px]">
          <p className="text-xs font-medium text-gray-500">Class Type</p>
          <Select value={classType} onValueChange={setClassType}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Classes</SelectItem>
              <SelectItem value="IELTS_CLASS">IELTS</SelectItem>
              <SelectItem value="PTE_CLASS">PTE</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <p className="text-xs font-medium text-gray-500">Student Status</p>
          <Select value={studentStatus} onValueChange={setStudentStatus}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="TRIAL">Trial</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="HOLD">Hold</SelectItem>
              <SelectItem value="COMPLETE">Complete</SelectItem>
              <SelectItem value="DROPPED">Dropped</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5 min-w-[140px]">
          <p className="text-xs font-medium text-gray-500">Payment Status</p>
          <Select value={paymentStatus} onValueChange={setPaymentStatus}>
            <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PARTIAL">Partial</SelectItem>
              <SelectItem value="UNPAID">Unpaid</SelectItem>
              <SelectItem value="NO_FEE">No Fee Set</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16 text-gray-400 text-sm">No records match the selected filters</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50">
                  {["Student", "Lead ID", "Class", "Status", "Total Fee", "Discount", "Net Fee", "Paid", "Balance", "Payment"].map((h) => (
                    <th key={h} className={`px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider ${["Student", "Lead ID", "Class", "Status", "Payment"].includes(h) ? "text-left" : "text-right"}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((r) => (
                  <tr key={r.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/leads/${r.id}`} className="font-semibold text-gray-900 hover:text-blue-600 transition-colors">
                        {r.studentName}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{r.leadId}</td>
                    <td className="px-4 py-3 text-gray-600">{r.classType ? (CLASS_TYPE_LABELS[r.classType] ?? r.classType) : "—"}</td>
                    <td className="px-4 py-3 text-gray-600">{r.studentStatus ? (STUDENT_STATUS_LABELS[r.studentStatus] ?? r.studentStatus) : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.totalFee > 0 ? fmt(r.totalFee) : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-500">{r.discount > 0 ? fmt(r.discount) : "—"}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{r.netFee > 0 ? fmt(r.netFee) : "—"}</td>
                    <td className="px-4 py-3 text-right text-green-600 font-medium">{r.paid > 0 ? fmt(r.paid) : "—"}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${r.balance > 0 ? "text-red-600" : r.netFee > 0 ? "text-green-600" : "text-gray-400"}`}>
                      {r.netFee > 0 ? fmt(r.balance) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_BADGE[r.paymentStatus]}`}>
                        {r.paymentStatus.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

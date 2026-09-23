"use client";

import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, Legend,
  PieChart, Pie,
} from "recharts";
import { TrendingUp, Users, Award, Target, Globe, Megaphone } from "lucide-react";
import FeesReportSection from "@/components/reports/FeesReportSection";

interface SourceStat {
  sourceName: string;
  total: number;
  contacted: number;
  counselling: number;
  applications: number;
  enrolled: number;
}

interface CountryStat {
  countryName: string;
  total: number;
}

const CHART_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#06b6d4", "#f97316", "#ec4899", "#84cc16", "#14b8a6"];
const FUNNEL_COLORS = { total: "#6366f1", counselling: "#f59e0b", applications: "#10b981", enrolled: "#22c55e" };

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-4 py-3 text-sm">
      <p className="font-semibold text-gray-800 mb-2">{label}</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-gray-500">{p.name}:</span>
          <span className="font-semibold text-gray-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

function SummaryCard({ icon: Icon, label, value, sub, color }: {
  icon: React.ElementType; label: string; value: string | number; sub?: string; color: string;
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

function ConversionBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-semibold text-green-600 w-9 text-right">{pct}%</span>
    </div>
  );
}

export default function ReportsClient() {
  const { data: sourcesData, isLoading: loadingSources } = useQuery({
    queryKey: ["reports-sources"],
    queryFn: () => fetch("/api/reports/sources").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const { data: countriesData, isLoading: loadingCountries } = useQuery({
    queryKey: ["reports-countries"],
    queryFn: () => fetch("/api/reports/countries").then((r) => r.json()),
    staleTime: 2 * 60_000,
  });

  const sourceStats: SourceStat[] = sourcesData?.stats ?? [];
  const countryStats: CountryStat[] = countriesData?.stats ?? [];
  const loading = loadingSources || loadingCountries;

  const totalLeads    = sourceStats.reduce((s, r) => s + r.total, 0);
  const totalEnrolled = sourceStats.reduce((s, r) => s + r.enrolled, 0);
  const totalApps     = sourceStats.reduce((s, r) => s + r.applications, 0);
  const convRate      = totalLeads > 0 ? ((totalEnrolled / totalLeads) * 100).toFixed(1) : "0";
  const topSource     = sourceStats[0]?.sourceName ?? "—";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Analytics, source breakdown, and fee overview</p>
      </div>

      <Tabs defaultValue="sources">
        <TabsList>
          <TabsTrigger value="sources">Source Analytics</TabsTrigger>
          <TabsTrigger value="fees">Fees &amp; Payments</TabsTrigger>
        </TabsList>

        <TabsContent value="fees" className="mt-6">
          <FeesReportSection />
        </TabsContent>

        <TabsContent value="sources" className="mt-6">
      <div className="space-y-6">

      {/* Summary KPIs */}
      {loading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard icon={Users}     label="Total Leads"    value={totalLeads.toLocaleString()} color="bg-indigo-100 text-indigo-600" />
          <SummaryCard icon={Award}     label="Enrolled"       value={totalEnrolled.toLocaleString()} sub="across all sources" color="bg-green-100 text-green-600" />
          <SummaryCard icon={Target}    label="Conversion Rate" value={`${convRate}%`} sub="leads → enrolled" color="bg-amber-100 text-amber-600" />
          <SummaryCard icon={Megaphone} label="Top Source"     value={topSource} sub={`${sourceStats[0]?.total ?? 0} leads`} color="bg-purple-100 text-purple-600" />
        </div>
      )}

      {/* Funnel Chart */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-indigo-50 flex items-center justify-center">
            <TrendingUp size={13} className="text-indigo-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Full Funnel by Source</span>
          <span className="text-xs text-gray-400 ml-1">— Total → Counselling → Applications → Enrolled</span>
        </div>
        <div className="p-6">
          {loading ? <Skeleton className="h-72 rounded-xl" /> : sourceStats.length === 0 ? (
            <div className="h-72 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={sourceStats} margin={{ bottom: 40, left: 0, right: 0, top: 4 }} barGap={2} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="sourceName" tick={{ fontSize: 11, fill: "#9ca3af" }} angle={-30} textAnchor="end" axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="circle" iconSize={8} />
                <Bar dataKey="total"       name="Total"        fill={FUNNEL_COLORS.total}       radius={[4, 4, 0, 0]} />
                <Bar dataKey="counselling" name="Counselling"  fill={FUNNEL_COLORS.counselling} radius={[4, 4, 0, 0]} />
                <Bar dataKey="applications" name="Applications" fill={FUNNEL_COLORS.applications} radius={[4, 4, 0, 0]} />
                <Bar dataKey="enrolled"    name="Enrolled"     fill={FUNNEL_COLORS.enrolled}    radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Source Breakdown Table */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-50 flex items-center justify-center">
            <Megaphone size={13} className="text-amber-500" />
          </div>
          <span className="text-sm font-semibold text-gray-700">Source Breakdown</span>
        </div>
        {loading ? (
          <div className="p-6 space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded-lg" />)}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Source", "Total", "Contacted", "Counselling", "Applications", "Enrolled", "Conversion"].map((h) => (
                    <th key={h} className={`px-5 py-3.5 text-xs font-semibold text-gray-400 uppercase tracking-wider ${h === "Source" ? "text-left" : "text-right"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {sourceStats.map((s, i) => (
                  <tr key={s.sourceName} className="hover:bg-gray-50/60 transition-colors group">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: CHART_COLORS[i % CHART_COLORS.length] }} />
                        <span className="font-semibold text-gray-800">{s.sourceName}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">{s.total}</span>
                    </td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{s.contacted}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{s.counselling}</td>
                    <td className="px-5 py-3.5 text-right text-gray-600">{s.applications}</td>
                    <td className="px-5 py-3.5 text-right">
                      <span className={`font-semibold ${s.enrolled > 0 ? "text-green-600" : "text-gray-400"}`}>{s.enrolled}</span>
                    </td>
                    <td className="px-5 py-3.5 min-w-[120px]">
                      <ConversionBar value={s.enrolled} max={s.total} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/50">
                  <td className="px-5 py-3 text-xs font-bold text-gray-500 uppercase tracking-wide">Total</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{totalLeads}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{sourceStats.reduce((s, r) => s + r.contacted, 0)}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{sourceStats.reduce((s, r) => s + r.counselling, 0)}</td>
                  <td className="px-5 py-3 text-right font-bold text-gray-900">{totalApps}</td>
                  <td className="px-5 py-3 text-right font-bold text-green-600">{totalEnrolled}</td>
                  <td className="px-5 py-3"><ConversionBar value={totalEnrolled} max={totalLeads} /></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {/* Countries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Country bar chart */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-teal-50 flex items-center justify-center">
              <Globe size={13} className="text-teal-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Leads by Destination</span>
          </div>
          <div className="p-6">
            {loading ? <Skeleton className="h-60 rounded-xl" /> : countryStats.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={countryStats.slice(0, 10)} barSize={28} layout="vertical" margin={{ left: 8, right: 24, top: 4, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f3f4f6" />
                  <XAxis type="number" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="countryName" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} width={72} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="total" name="Leads" radius={[0, 6, 6, 0]}>
                    {countryStats.slice(0, 10).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Country donut */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-50 flex items-center justify-center">
              <Globe size={13} className="text-purple-500" />
            </div>
            <span className="text-sm font-semibold text-gray-700">Country Share</span>
          </div>
          <div className="p-6">
            {loading ? <Skeleton className="h-60 rounded-xl" /> : countryStats.length === 0 ? (
              <div className="h-60 flex items-center justify-center text-gray-400 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={countryStats.slice(0, 8)} cx="50%" cy="45%" outerRadius={88} innerRadius={36}
                    dataKey="total" nameKey="countryName" paddingAngle={3}>
                    {countryStats.slice(0, 8).map((_, i) => (
                      <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} stroke="none" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
      </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

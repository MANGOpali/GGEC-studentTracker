"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

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

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Source Analytics</h1>
      <div className="space-y-6">
        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Source — Full Funnel</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-64" /> : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={sourceStats} margin={{ left: 0, right: 0, top: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="sourceName" tick={{ fontSize: 11 }} angle={-30} textAnchor="end" />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total" name="Total" fill="#0E356B" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="counselling" name="Counselling" fill="#4a8fd4" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="applications" name="Applications" fill="#6aaee3" radius={[2, 2, 0, 0]} />
                  <Bar dataKey="enrolled" name="Enrolled" fill="#22c55e" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Source Breakdown</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-40" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium text-gray-600">Source</th>
                      <th className="text-right py-2 font-medium text-gray-600">Total</th>
                      <th className="text-right py-2 font-medium text-gray-600">Contacted</th>
                      <th className="text-right py-2 font-medium text-gray-600">Counselling</th>
                      <th className="text-right py-2 font-medium text-gray-600">Applications</th>
                      <th className="text-right py-2 font-medium text-gray-600">Enrolled</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sourceStats.map((s) => (
                      <tr key={s.sourceName} className="border-b hover:bg-gray-50">
                        <td className="py-2 font-medium">{s.sourceName}</td>
                        <td className="py-2 text-right">{s.total}</td>
                        <td className="py-2 text-right">{s.contacted}</td>
                        <td className="py-2 text-right">{s.counselling}</td>
                        <td className="py-2 text-right">{s.applications}</td>
                        <td className="py-2 text-right text-green-600 font-medium">{s.enrolled}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Leads by Destination Country</CardTitle></CardHeader>
          <CardContent>
            {loading ? <Skeleton className="h-48" /> : (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={countryStats.slice(0, 10)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="countryName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" name="Leads" fill="#1a4e9a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

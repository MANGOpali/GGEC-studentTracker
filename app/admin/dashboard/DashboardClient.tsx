"use client";

import { useQuery } from "@tanstack/react-query";
import { Users, UserPlus, Calendar, FileText, Plane, Award, CheckCircle, TrendingUp, BookOpen, CalendarCheck } from "lucide-react";
import KPICard from "@/components/dashboard/KPICard";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const COLORS = ["#0E356B", "#1a4e9a", "#2d6bb5", "#4a8fd4", "#6aaee3", "#8fccf0", "#b3dff8", "#d4eefd"];

const fetchStats = () => fetch("/api/dashboard/stats").then((r) => r.json());
const fetchSources = () => fetch("/api/reports/sources").then((r) => r.json());
const fetchCountries = () => fetch("/api/reports/countries").then((r) => r.json());

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  return "Good Evening";
}

export default function AdminDashboardClient() {
  const { data: stats } = useQuery({ queryKey: ["dashboard-stats"], queryFn: fetchStats, staleTime: 30_000 });
  const { data: sourcesData } = useQuery({ queryKey: ["reports-sources"], queryFn: fetchSources, staleTime: 60_000 });
  const { data: countriesData } = useQuery({ queryKey: ["reports-countries"], queryFn: fetchCountries, staleTime: 60_000 });

  const sourceStats: Array<{ sourceName: string; total: number }> = sourcesData?.stats ?? [];
  const countryStats: Array<{ countryName: string; total: number }> = countriesData?.stats ?? [];

  return (
    <div>
      {/* Greeting */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{getGreeting()}! 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">Here&apos;s what&apos;s happening with your leads today.</p>
        </div>
        <p className="text-sm text-gray-400 hidden sm:block">
          {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* Study Abroad KPIs */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Study Abroad</p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {!stats ? (
          Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <KPICard title="Total Leads" value={stats.totalLeads} icon={Users} color="blue" />
            <KPICard title="Today's Leads" value={stats.todaysLeads} icon={UserPlus} color="teal" />
            <KPICard title="New (Uncontacted)" value={stats.newLeads} icon={TrendingUp} color="purple" />
            <KPICard title="Follow-ups Today" value={stats.followUpsDueToday} icon={Calendar} color="amber"
              subtitle={stats.overdueFollowUps > 0 ? `+${stats.overdueFollowUps} overdue` : undefined} />
            <KPICard title="Counselling Done" value={stats.counsellingCompleted} icon={CheckCircle} color="green" subtitle="This month" />
            <KPICard title="Applications" value={stats.applications} icon={FileText} color="blue" />
            <KPICard title="Visa Process" value={stats.visaProcess} icon={Plane} color="purple" />
            <KPICard title="Enrolled" value={stats.enrolled} icon={Award} color="green" />
          </>
        )}
      </div>

      {/* Classes & Bookings KPIs */}
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-6">Classes & Bookings</p>
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {!stats ? (
          Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <KPICard title="IELTS Class Leads" value={stats.ieltsLeads} icon={BookOpen} color="amber"
              subtitle={stats.ieltsInClass > 0 ? `${stats.ieltsInClass} in class` : undefined} />
            <KPICard title="PTE Class Leads" value={stats.pteLeads} icon={BookOpen} color="purple"
              subtitle={stats.pteInClass > 0 ? `${stats.pteInClass} in class` : undefined} />
            <KPICard title="Date Bookings" value={stats.dateBookingLeads} icon={CalendarCheck} color="teal"
              subtitle={stats.bookingsConfirmed > 0 ? `${stats.bookingsConfirmed} confirmed` : undefined} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="shadow-sm border-gray-100 rounded-2xl">
          <CardHeader><CardTitle className="text-base text-gray-800">Leads by Source</CardTitle></CardHeader>
          <CardContent>
            {sourceStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={sourceStats.slice(0, 8)}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="sourceName" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="total" fill="#0E356B" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-100 rounded-2xl">
          <CardHeader><CardTitle className="text-base text-gray-800">Leads by Country</CardTitle></CardHeader>
          <CardContent>
            {countryStats.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={countryStats.slice(0, 8)} cx="50%" cy="50%" outerRadius={90}
                    dataKey="total" nameKey="countryName"
                    label={({ countryName, percent }) => `${countryName} ${(percent * 100).toFixed(0)}%`}
                    labelLine={false}>
                    {countryStats.slice(0, 8).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Skeleton className="h-48" />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

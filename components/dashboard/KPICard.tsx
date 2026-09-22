import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "red" | "purple" | "teal";
  subtitle?: string;
  href?: string;
}

const colorMap = {
  blue: "bg-blue-50 text-blue-700 border-blue-100",
  green: "bg-green-50 text-green-700 border-green-100",
  amber: "bg-amber-50 text-amber-700 border-amber-100",
  red: "bg-red-50 text-red-700 border-red-100",
  purple: "bg-purple-50 text-purple-700 border-purple-100",
  teal: "bg-teal-50 text-teal-700 border-teal-100",
};

const iconBgMap = {
  blue: "bg-blue-100",
  green: "bg-green-100",
  amber: "bg-amber-100",
  red: "bg-red-100",
  purple: "bg-purple-100",
  teal: "bg-teal-100",
};

export default function KPICard({ title, value, icon: Icon, color = "blue", subtitle }: KPICardProps) {
  return (
    <div className={cn("rounded-xl border p-4 flex items-center gap-4", colorMap[color])}>
      <div className={cn("p-3 rounded-lg", iconBgMap[color])}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold">{value.toLocaleString()}</p>
        <p className="text-sm font-medium opacity-80 truncate">{title}</p>
        {subtitle && <p className="text-xs opacity-60">{subtitle}</p>}
      </div>
    </div>
  );
}

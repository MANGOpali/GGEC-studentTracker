import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface KPICardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color?: "blue" | "green" | "amber" | "red" | "purple" | "teal";
  subtitle?: string;
}

const iconColorMap = {
  blue:   "bg-blue-100 text-blue-600",
  green:  "bg-green-100 text-green-600",
  amber:  "bg-amber-100 text-amber-600",
  red:    "bg-red-100 text-red-600",
  purple: "bg-purple-100 text-purple-600",
  teal:   "bg-teal-100 text-teal-600",
};

const valueColorMap = {
  blue:   "text-blue-600",
  green:  "text-green-600",
  amber:  "text-amber-600",
  red:    "text-red-600",
  purple: "text-purple-600",
  teal:   "text-teal-600",
};

export default function KPICard({ title, value, icon: Icon, color = "blue", subtitle }: KPICardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 flex items-center gap-4 hover:shadow-md transition-shadow">
      <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0", iconColorMap[color])}>
        <Icon size={22} />
      </div>
      <div className="min-w-0">
        <p className={cn("text-2xl font-bold leading-tight", valueColorMap[color])}>{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500 font-medium truncate mt-0.5">{title}</p>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

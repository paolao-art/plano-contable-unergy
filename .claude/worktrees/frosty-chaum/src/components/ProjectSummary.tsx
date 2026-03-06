import {
  Activity,
  BarChart3,
  DollarSign,
  Info,
  Layers,
  type LucideIcon,
  Percent,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { useSheet } from "@/context/SheetContext";
import type { MetricDetail } from "@/types/sheets";
import MetricModal from "./MetricModal";

interface MetricItemProps {
  label: string;
  detail: MetricDetail | undefined;
  icon: LucideIcon;
  color: string;
  highlight?: boolean;
  isLast?: boolean;
  onClick: () => void;
}

const MetricItem = ({
  label,
  detail,
  icon: Icon,
  color,
  highlight,
  isLast,
  onClick,
}: MetricItemProps) => (
  <button
    onClick={onClick}
    className={`group relative text-left space-y-1 transition-all p-2 -m-2 rounded-2xl hover:bg-white/40 dark:hover:bg-white/5 active:scale-95 ${!isLast ? "lg:border-r border-zinc-200/50 dark:border-zinc-800/50 lg:pr-4" : ""}`}
  >
    <div className="flex items-center justify-between opacity-60">
      <div className="flex items-center gap-1.5">
        <Icon className={`w-3 h-3 ${color}`} />
        <span className="text-[10px] font-bold uppercase tracking-tight">
          {label}
        </span>
      </div>
      <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <p
      className={`text-lg font-black tracking-tight ${highlight ? (color === "text-green-500" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400") : "text-zinc-900 dark:text-zinc-50"}`}
    >
      {label === "ROI"
        ? `${detail?.value || 0}%`
        : `$${(detail?.value || 0).toLocaleString()}`}
    </p>
  </button>
);

export default function ProjectSummary() {
  const { data, loading } = useSheet();
  const [selectedMetric, setSelectedMetric] = useState<{
    title: string;
    detail: MetricDetail;
  } | null>(null);
  const metrics = data.projectMetrics;

  if (loading && !data.items.length) {
    return (
      <div className="h-24 bg-white/40 animate-pulse rounded-3xl border border-white/40" />
    );
  }

  const items = [
    {
      label: "CAPEX",
      detail: metrics?.capex,
      icon: Layers,
      color: "text-zinc-500",
    },
    {
      label: "Energía",
      detail: metrics?.energyIncome,
      icon: Activity,
      color: "text-yellow-500",
    },
    {
      label: "Comercial.",
      detail: metrics?.marketingCosts,
      icon: TrendingDown,
      color: "text-red-500",
    },
    {
      label: "Utilidad",
      detail: metrics?.monthlyUtility,
      icon: DollarSign,
      color: "text-green-500",
      highlight: true,
    },
    {
      label: "ROI",
      detail: metrics?.roi,
      icon: Percent,
      color: "text-blue-500",
      highlight: true,
    },
  ];

  return (
    <>
      <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-lg overflow-hidden">
        <div className="px-6 py-3 border-b border-[#915BD8]/20 dark:border-zinc-800/30 flex items-center justify-between bg-gradient-to-r from-[#915BD8]/15 via-white/5 to-[#F6FF72]/15 dark:from-[#915BD8]/20 dark:via-transparent dark:to-[#F6FF72]/5">
          <h2 className="text-sm font-bold flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-[#915BD8]" />
            Resumen General
          </h2>
          <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-widest">
            Click para ver detalle
          </span>
        </div>
        <div className="p-5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {items.map((item, i) => (
            <MetricItem
              key={item.label}
              {...item}
              isLast={i === items.length - 1}
              onClick={() =>
                item.detail &&
                setSelectedMetric({ title: item.label, detail: item.detail })
              }
            />
          ))}
        </div>
      </div>

      <MetricModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        title={selectedMetric?.title || ""}
        detail={selectedMetric?.detail || null}
      />
    </>
  );
}

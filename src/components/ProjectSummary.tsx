import {
  Activity,
  BarChart3,
  DollarSign,
  Info,
  Layers,
  type LucideIcon,
  Percent,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useSheet } from "@/context/SheetContext";
import type { MetricDetail } from "@/types/sheets";
import MetricModal from "./MetricModal";
import CobrosModal from "./CobrosModal";
import type { AsociadoInvoice } from "@/pages/api/odoo/invoices/asociados";

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
        <span className="text-[10px] font-bold tracking-tight">
          {label}
        </span>
      </div>
      <Info className="w-2.5 h-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
    </div>
    <p
      className={`text-lg font-black tracking-tight ${highlight ? (color === "text-green-500" ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400") : "text-zinc-900 dark:text-zinc-50"}`}
    >
      {label === "ROI"
        ? `${(detail?.value || 0).toFixed(4)}%`
        : `$${(detail?.value || 0).toLocaleString()}`}
    </p>
  </button>
);

export default function ProjectSummary() {
  const { data, loading, selectedInvestor, selectedMonths } = useSheet();
  const [selectedMetric, setSelectedMetric] = useState<{ title: string; detail: MetricDetail } | null>(null);
  const [cobrosInvoices, setCobrosInvoices] = useState<AsociadoInvoice[]>([]);
  const [cobrosTotal, setCobrosTotal] = useState(0);
  const [cobrosLoading, setCobrosLoading] = useState(false);
  const [isCobrosOpen, setIsCobrosOpen] = useState(false);
  const metrics = data.projectMetrics;

  useEffect(() => {
    const year = new Date().getFullYear();
    const params = new URLSearchParams({ months: selectedMonths.join(","), year: String(year) });
    if (selectedInvestor && selectedInvestor !== "Total") params.set("investor", selectedInvestor);
    setCobrosLoading(true);
    fetch(`/api/odoo/invoices/asociados?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (!res.success) return;
        const invoices: AsociadoInvoice[] = res.invoices;
        setCobrosInvoices(invoices);
        setCobrosTotal(invoices.reduce((sum, inv) => sum + inv.monto, 0));
      })
      .catch(() => {})
      .finally(() => setCobrosLoading(false));
  }, [selectedInvestor, selectedMonths]);

  if (loading && !data.items.length) {
    return (
      <div className="h-24 bg-white/40 animate-pulse rounded-3xl border border-white/40" />
    );
  }

  const row1Items = [
    {
      label: "Ingresos Por Energía",
      detail: metrics?.energyIncome,
      icon: Activity,
      color: "text-yellow-500",
    },
    {
      label: "Costo de Comercialización",
      detail: metrics?.marketingCosts,
      icon: TrendingDown,
      color: "text-red-500",
    },
    {
      label: "Cobros Unergy",
      detail: { value: cobrosTotal, sourceRows: [] } as MetricDetail,
      icon: TrendingUp,
      color: "text-blue-500",
    },
    {
      label: "Otros Costos",
      detail: metrics?.costs,
      icon: Wallet,
      color: "text-orange-500",
    },
    {
      label: "Utilidad",
      detail: metrics?.monthlyUtility,
      icon: DollarSign,
      color: "text-green-500",
      highlight: true,
    },
  ];

  const tirValue = metrics?.tir?.value || 0;

  const row2Cards: { label: string; value: string; subtitle?: string; icon: LucideIcon; color: string; bg: string; detail: MetricDetail | undefined }[] = [
    {
      label: "CAPEX",
      value: `$${(metrics?.capex?.value || 0).toLocaleString()}`,
      subtitle: metrics?.participationPct != null
        ? `${(metrics.participationPct * 100).toFixed(2)}% participación`
        : undefined,
      icon: Layers,
      color: "text-zinc-500",
      bg: "bg-zinc-500/10",
      detail: metrics?.capex,
    },
    {
      label: "ROI",
      value: `${(metrics?.roi?.value || 0).toFixed(4)}%`,
      icon: Percent,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      detail: metrics?.roi,
    },
    {
      label: "TIR",
      value: `${tirValue.toFixed(4)}%`,
      icon: DollarSign,
      color: tirValue >= 0 ? "text-green-500" : "text-orange-500",
      bg: tirValue >= 0 ? "bg-green-500/10" : "bg-orange-500/10",
      detail: metrics?.tir,
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
        <div className="p-5 space-y-4">
          {/* Fila 1: 4 métricas + Utilidad más ancha */}
          <div className="grid grid-cols-2 sm:grid-cols-[repeat(4,1fr)_1.5fr] gap-4">
            {row1Items.map((item, i) => (
              <MetricItem
                key={item.label}
                {...item}
                isLast={i === row1Items.length - 1}
                onClick={() =>
                  item.label === "Cobros Unergy"
                    ? setIsCobrosOpen(true)
                    : item.detail && setSelectedMetric({ title: item.label, detail: item.detail })
                }
              />
            ))}
          </div>

        </div>
      </div>

      {/* Sección independiente: CAPEX, ROI y TIR */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
        {row2Cards.map((card) => (
          <div
            key={card.label}
            onClick={() =>
              card.detail &&
              setSelectedMetric({ title: card.label, detail: card.detail })
            }
            className={`bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md p-5 flex items-center gap-4 ${card.detail ? "cursor-pointer hover:bg-white/80 dark:hover:bg-zinc-900/80 active:scale-[0.98] transition-all" : ""}`}
          >
            <div className={`${card.bg} p-2.5 rounded-xl shrink-0`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider leading-none mb-1.5">
                {card.label}
              </p>
              <p className={`text-xl font-black tracking-tight truncate ${card.color}`}>
                {card.value}
              </p>
              {card.subtitle && (
                <p className="text-[10px] font-semibold text-zinc-400 mt-0.5">{card.subtitle}</p>
              )}
            </div>
          </div>
        ))}
      </div>

      <MetricModal
        isOpen={!!selectedMetric}
        onClose={() => setSelectedMetric(null)}
        title={selectedMetric?.title || ""}
        detail={selectedMetric?.detail || null}
        showSoportes={selectedMetric?.title === "Otros Costos"}
      />
      <CobrosModal
        isOpen={isCobrosOpen}
        onClose={() => setIsCobrosOpen(false)}
        invoices={cobrosInvoices}
        total={cobrosTotal}
        loading={cobrosLoading}
      />
    </>
  );
}

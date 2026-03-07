import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useEffect, useState } from "react";
import { useSheet } from "@/context/SheetContext";
import MetricModal from "./MetricModal";
import CobrosModal from "./CobrosModal";
import type { MetricDetail } from "@/types/sheets";
import type { AsociadoInvoice } from "@/pages/api/odoo/invoices/asociados";

export default function MonthlyStats() {
  const { data, loading, selectedInvestor, selectedMonths } = useSheet();
  const netProfit = data.income - data.expenses;
  const [costsDetail, setCostsDetail] = useState<MetricDetail | null>(null);
  const [cobrosInvoices, setCobrosInvoices] = useState<AsociadoInvoice[]>([]);
  const [cobrosTotal, setCobrosTotal] = useState(0);
  const [cobrosLoading, setCobrosLoading] = useState(false);
  const [isCobrosOpen, setIsCobrosOpen] = useState(false);

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
        const total = invoices.reduce((sum, inv) => sum + inv.monto, 0);
        setCobrosInvoices(invoices);
        setCobrosTotal(total);
      })
      .catch(() => {})
      .finally(() => setCobrosLoading(false));
  }, [selectedInvestor, selectedMonths]);

  if (loading && !data.items.length) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 bg-white/40 animate-pulse rounded-3xl border border-white/40"
          />
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: "Cobros Unergy",
      val: cobrosTotal,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
      onClick: () => setIsCobrosOpen(true),
    },
    {
      label: "Otros Costos",
      val: data.projectMetrics?.costs?.value ?? 0,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-500/10",
      onClick: () => {
        const detail = data.projectMetrics?.costs;
        if (detail) setCostsDetail(detail);
      },
    },
    {
      label: "TIR",
      val: netProfit,
      icon: Wallet,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
      onClick: undefined,
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {cards.map((card) => (
          <div
            key={card.label}
            onClick={card.onClick}
            className={`bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md transition-all ${card.onClick ? "cursor-pointer hover:bg-white/80 dark:hover:bg-zinc-900/80 active:scale-[0.98]" : ""}`}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={`${card.bg} p-2 rounded-xl`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400">
                {card.onClick ? "Click para ver detalle" : "Mes"}
              </span>
            </div>
            <p className="text-xs font-bold text-zinc-500 dark:text-zinc-400 mb-1">
              {card.label}
            </p>
            <p
              className={`text-2xl font-black tracking-tight ${card.color === "text-blue-500" && netProfit < 0 ? "text-orange-500" : "text-zinc-900 dark:text-zinc-50"}`}
            >
              ${card.val.toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      <MetricModal
        isOpen={!!costsDetail}
        onClose={() => setCostsDetail(null)}
        title="Otros Costos"
        detail={costsDetail}
        showSoportes
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

import { TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { useSheet } from "@/context/SheetContext";

export default function MonthlyStats() {
  const { data, loading } = useSheet();
  const netProfit = data.income - data.expenses;

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
      label: "Ingresos",
      val: data.income,
      icon: TrendingUp,
      color: "text-green-500",
      bg: "bg-green-500/10",
    },
    {
      label: "Gastos",
      val: data.expenses,
      icon: TrendingDown,
      color: "text-red-500",
      bg: "bg-red-500/10",
    },
    {
      label: "Neto",
      val: netProfit,
      icon: Wallet,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl p-5 rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md"
        >
          <div className="flex items-center justify-between mb-3">
            <div className={`${card.bg} p-2 rounded-xl`}>
              <card.icon className={`w-4 h-4 ${card.color}`} />
            </div>
            <span className="text-[9px] font-black tracking-widest uppercase text-zinc-400">
              Mes
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
  );
}

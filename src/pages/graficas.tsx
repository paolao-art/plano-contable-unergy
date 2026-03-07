import Head from "next/head";
import { Menu } from "lucide-react";

import Image from "next/image";
import logo from "../../public/logo.png";
import { useState, useEffect } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

import Sidebar from "@/components/Sidebar";
import FilterToolbar from "@/components/FilterToolbar";
import { SheetDataProvider, useSheet } from "@/context/SheetContext";

const ALL_MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const GREEN = "#34D399";

const fmtShort = (v: number) => {
  if (Math.abs(v) >= 1_000_000_000) return `$${(v / 1_000_000_000).toFixed(1)}B`;
  if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
  return `$${v}`;
};

const fmtFull = (v: number) =>
  `$${Math.round(v).toLocaleString("es-CO")}`;

const tooltipStyle = {
  borderRadius: 12,
  border: "none",
  boxShadow: "0 4px 24px rgba(0,0,0,0.12)",
  fontSize: 13,
  fontWeight: 700,
};

const EmptyState = () => (
  <div className="flex items-center justify-center h-64 text-zinc-400 text-sm font-semibold">
    Sin datos para mostrar
  </div>
);

const ChartCard = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md p-6">
    <h2 className="text-sm font-black uppercase tracking-widest text-zinc-500 dark:text-zinc-400 mb-6">
      {title}
    </h2>
    {children}
  </div>
);

const PROJECT_COLORS = ["#915BD8", "#34D399", "#60A5FA", "#F59E0B", "#F87171", "#A78BFA", "#FB923C", "#2DD4BF"];

function PillSelector({
  label,
  items,
  selected,
  onToggle,
  color = "purple",
}: {
  label: string;
  items: string[];
  selected: string[];
  onToggle: (item: string) => void;
  color?: "purple" | "blue";
}) {
  const activeClass = color === "blue"
    ? "bg-blue-500 text-white border-blue-500 shadow-sm"
    : "bg-[#915BD8] text-white border-[#915BD8] shadow-sm";

  return (
    <div>
      <p className="text-[9px] font-black uppercase tracking-widest text-zinc-400 mb-2">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item) => {
          const active = selected.includes(item);
          return (
            <button
              key={item}
              type="button"
              onClick={() => onToggle(item)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                active
                  ? activeClass
                  : "bg-white/60 dark:bg-zinc-800/60 text-zinc-500 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700 hover:border-[#915BD8]/50"
              }`}
            >
              {item}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function UtilidadComparativa() {
  const { selectedInvestor, selectedProjects } = useSheet();
  const [selectedMonths, setSelectedMonths] = useState<string[]>(["Enero", "Febrero", "Marzo"]);
  const [chartData, setChartData] = useState<Record<string, string | number>[]>([]);
  const [loading, setLoading] = useState(false);

  const comparingProjects = selectedProjects.length >= 2;

  useEffect(() => {
    if (selectedMonths.length === 0) return;
    setLoading(true);

    if (!comparingProjects) {
      // Consolidated: one bar per month
      const projects = selectedProjects.join(",");
      Promise.all(
        selectedMonths.map((month) =>
          fetch(`/api/sheets?months=${encodeURIComponent(month)}&investor=${encodeURIComponent(selectedInvestor)}&projects=${encodeURIComponent(projects)}`)
            .then((r) => r.json())
            .then((d) => ({ month, Utilidad: (d.projectMetrics?.monthlyUtility?.value ?? 0) as number }))
            .catch(() => ({ month, Utilidad: 0 }))
        )
      )
        .then((rows) => {
          setChartData(
            ALL_MONTHS.filter((m) => selectedMonths.includes(m)).map(
              (m) => rows.find((r) => r.month === m) ?? { month: m, Utilidad: 0 }
            )
          );
        })
        .finally(() => setLoading(false));
    } else {
      // Per project: fetch each (month × project) in parallel
      Promise.all(
        selectedMonths.flatMap((month) =>
          selectedProjects.map((project) =>
            fetch(`/api/sheets?months=${encodeURIComponent(month)}&investor=${encodeURIComponent(selectedInvestor)}&projects=${encodeURIComponent(project)}`)
              .then((r) => r.json())
              .then((d) => ({ month, project, value: (d.projectMetrics?.monthlyUtility?.value ?? 0) as number }))
              .catch(() => ({ month, project, value: 0 }))
          )
        )
      )
        .then((rows) => {
          setChartData(
            ALL_MONTHS.filter((m) => selectedMonths.includes(m)).map((month) => {
              const row: Record<string, string | number> = { month };
              for (const proj of selectedProjects) {
                row[proj] = rows.find((r) => r.month === month && r.project === proj)?.value ?? 0;
              }
              return row;
            })
          );
        })
        .finally(() => setLoading(false));
    }
  }, [selectedMonths, selectedProjects, selectedInvestor, comparingProjects]);

  function toggleMonth(m: string) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? (prev.length > 1 ? prev.filter((x) => x !== m) : prev) : [...prev, m]
    );
  }

  return (
    <ChartCard title="Comparativo de Utilidad por Mes">
      <div className="mb-6">
        <PillSelector
          label="Meses"
          items={ALL_MONTHS}
          selected={selectedMonths}
          onToggle={toggleMonth}
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-[#915BD8] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : chartData.length === 0 ? (
        <EmptyState />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
            <XAxis dataKey="month" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
            <Tooltip formatter={(v: number, name: string) => [fmtFull(v), name]} contentStyle={tooltipStyle} />
            {comparingProjects ? (
              <>
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700 }}>{v}</span>} />
                {selectedProjects.map((proj, i) => (
                  <Bar key={proj} dataKey={proj} fill={PROJECT_COLORS[i % PROJECT_COLORS.length]} radius={[6, 6, 0, 0]} barSize={24} />
                ))}
              </>
            ) : (
              <Bar dataKey="Utilidad" radius={[8, 8, 0, 0]} barSize={36}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.month as string}
                    fill={(entry.Utilidad as number) >= 0 ? GREEN : "#FB923C"}
                  />
                ))}
              </Bar>
            )}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
}

function GraficasContent() {
  return <UtilidadComparativa />;
}

export default function Graficas() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return null;

  return (
    <SheetDataProvider>
      <div className="relative min-h-screen bg-[#FDFAF7] dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden">
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full bg-[#915BD8]/30 blur-3xl dark:bg-[#915BD8]/15" />
          <div className="absolute -bottom-40 -right-40 w-[550px] h-[550px] rounded-full bg-[#F6FF72]/40 blur-3xl dark:bg-[#F6FF72]/10" />
        </div>

        <Head>
          <title>Gráficas - Unergy</title>
        </Head>

        <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

        <main className="relative z-10 lg:pl-64 transition-all duration-300">
          <div className="lg:hidden flex items-center justify-between p-4 bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl border-b border-white/40 dark:border-zinc-800/50 sticky top-0 z-30">
            <div className="flex items-center gap-2">
              <Image src={logo} alt="Unergy" width={28} height={28} className="rounded-lg shrink-0" />
              <div className="flex flex-col leading-tight">
                <span className="text-base font-black tracking-tight">Unergy</span>
                <span className="text-[8px] font-semibold text-zinc-400 tracking-tight leading-none">
                  Energía Digital S.A.S E.S.P
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-xl"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          <div className="max-w-6xl mx-auto p-4 md:p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-black tracking-tight">Gráficas</h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium mt-0.5">
                  Visualización de métricas financieras
                </p>
              </div>
              <FilterToolbar />
            </div>

            <GraficasContent />
          </div>
        </main>
      </div>
    </SheetDataProvider>
  );
}

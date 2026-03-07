import Head from "next/head";
import { Menu } from "lucide-react";
import Image from "next/image";
import logo from "../../public/logo.png";
import { Geist, Geist_Mono } from "next/font/google";
import { useState, useEffect, useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

import Sidebar from "@/components/Sidebar";
import FilterToolbar from "@/components/FilterToolbar";
import { SheetDataProvider, useSheet } from "@/context/SheetContext";
import type { SourceRow } from "@/types/sheets";

const ALL_MONTHS = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const PURPLE = "#915BD8";
const RED = "#F87171";
const GREEN = "#34D399";
const COLORS = [PURPLE, "#6B3DB8", "#C4B5FD", "#A78BFA", "#FDE68A", "#F6FF72"];

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

const groupBy = (rows: SourceRow[], key: "inversionista" | "proyecto") => {
  const map = new Map<string, number>();
  for (const row of rows) {
    const k = (row[key] || "Sin asignar").trim() || "Sin asignar";
    map.set(k, (map.get(k) || 0) + row.valor);
  }
  return map;
};

const mergeGroups = (
  incomeMap: Map<string, number>,
  costsMap: Map<string, number>,
) => {
  const keys = new Set([...incomeMap.keys(), ...costsMap.keys()]);
  return Array.from(keys)
    .map((name) => ({
      name,
      Ingresos: incomeMap.get(name) || 0,
      Costos: costsMap.get(name) || 0,
    }))
    .sort((a, b) => b.Ingresos - a.Ingresos);
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
  const { data, loading, selectedMonths } = useSheet();
  const { projectMetrics } = data;

  const incomeRows = projectMetrics?.energyIncome?.sourceRows ?? [];
  const costsRows = [
    ...(projectMetrics?.costs?.sourceRows ?? []),
    ...(projectMetrics?.marketingCosts?.sourceRows ?? []),
  ];

  // Por inversionista
  const byInvestor = useMemo(() => mergeGroups(
    groupBy(incomeRows, "inversionista"),
    groupBy(costsRows, "inversionista"),
  ), [incomeRows, costsRows]);

  // Por proyecto
  const byProject = useMemo(() => mergeGroups(
    groupBy(incomeRows, "proyecto"),
    groupBy(costsRows, "proyecto"),
  ), [incomeRows, costsRows]);

  // Distribución de métricas (pie)
  const pieData = [
    { name: "Ingresos Energía", value: projectMetrics?.energyIncome?.value ?? 0 },
    { name: "Costos Marketing", value: projectMetrics?.marketingCosts?.value ?? 0 },
    { name: "Otros Costos", value: projectMetrics?.costs?.value ?? 0 },
  ].filter((m) => m.value > 0);

  // Ingresos vs Costos totales por periodo (un punto por mes seleccionado — aquí es el acumulado del filtro activo)
  const totalsData = [
    { name: selectedMonths.length === 1 ? selectedMonths[0] : `${selectedMonths.length} meses`, Ingresos: data.income, Costos: data.expenses },
  ];

  if (loading && !data.items.length) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-72 bg-white/40 animate-pulse rounded-3xl border border-white/40" />
        ))}
      </div>
    );
  }

  const barChartProps = {
    margin: { top: 4, right: 8, left: 0, bottom: 4 },
  };

  return (
    <div className="space-y-6">
      {/* Comparativo de Utilidad */}
      <UtilidadComparativa />

      {/* Por Inversionista */}
      <ChartCard title="Ingresos vs Costos por Inversionista">
        {byInvestor.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byInvestor} {...barChartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Ingresos" fill={PURPLE} radius={[6, 6, 0, 0]} />
              <Bar dataKey="Costos" fill={RED} radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* Por Proyecto */}
      <ChartCard title="Ingresos vs Costos por Proyecto">
        {byProject.length === 0 ? <EmptyState /> : (
          <ResponsiveContainer width="100%" height={Math.max(300, byProject.length * 52)}>
            <BarChart data={byProject} layout="vertical" {...barChartProps}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" horizontal={false} />
              <XAxis type="number" tickFormatter={fmtShort} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fontWeight: 700 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Ingresos" fill={PURPLE} radius={[0, 6, 6, 0]} barSize={18} />
              <Bar dataKey="Costos" fill={RED} radius={[0, 6, 6, 0]} barSize={18} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Resumen del periodo */}
        <ChartCard title="Resumen del Periodo">
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={totalsData} {...barChartProps} barSize={56}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12, fontWeight: 700 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={64} />
              <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={tooltipStyle} />
              <Legend iconType="circle" iconSize={8} />
              <Bar dataKey="Ingresos" fill={PURPLE} radius={[8, 8, 0, 0]} />
              <Bar dataKey="Costos" fill={RED} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {/* Neto */}
          <div className={`mt-4 text-center text-sm font-black ${data.income - data.expenses >= 0 ? "text-emerald-500" : "text-orange-500"}`}>
            Neto: {fmtFull(data.income - data.expenses)}
          </div>
        </ChartCard>

        {/* Distribución de costos e ingresos */}
        <ChartCard title="Distribución de Métricas">
          {pieData.length === 0 ? <EmptyState /> : (
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="42%"
                  innerRadius={55}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtFull(v)} contentStyle={tooltipStyle} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ fontSize: 11, fontWeight: 700 }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>
    </div>
  );
}

export default function Graficas() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  if (!isMounted) return null;

  return (
    <SheetDataProvider>
      <div className={`${geistSans.className} ${geistMono.className} relative min-h-screen bg-[#FDFAF7] dark:bg-black text-zinc-900 dark:text-zinc-100 transition-colors overflow-hidden`}>
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

import {
  Calendar,
  ChevronDown,
  FolderKanban,
  RefreshCw,
  User,
} from "lucide-react";
import { useSheet } from "@/context/SheetContext";

const MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export default function FilterToolbar() {
  const {
    data,
    selectedMonth,
    setSelectedMonth,
    selectedInvestor,
    setSelectedInvestor,
    selectedProject,
    setSelectedProject,
    refetch,
    loading,
  } = useSheet();

  const investors = data.investors || ["Total"];
  const projects = data.projects || ["Total"];
  const isProjectDisabled = selectedInvestor === "Total";

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/40 dark:border-zinc-800/50 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-1">
      {/* 1. Selector de Inversionista */}
      <div className="flex-1 flex items-center px-3 py-1.5 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-colors group">
        <User className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors mr-2.5" />
        <div className="flex-1">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
            Inversionista
          </p>
          <div className="relative">
            <select
              value={selectedInvestor}
              onChange={(e) => setSelectedInvestor(e.target.value)}
              className="appearance-none bg-transparent border-none p-0 text-xs font-bold text-zinc-900 dark:text-zinc-50 focus:ring-0 cursor-pointer w-full"
            >
              {investors.map((inv) => (
                <option
                  key={inv}
                  value={inv}
                  className="bg-white dark:bg-zinc-900"
                >
                  {inv}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ChevronDown className="w-3 h-3 text-zinc-300 ml-2" />
      </div>

      <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-zinc-800 self-center mx-1" />

      {/* 2. Selector de Proyecto (Estado Estable) */}
      <div
        className={`flex-1 flex items-center px-3 py-1.5 rounded-xl transition-all ${isProjectDisabled ? "opacity-40 grayscale pointer-events-none" : "hover:bg-white/40 dark:hover:bg-white/5 group"}`}
      >
        <FolderKanban
          className={`w-3.5 h-3.5 mr-2.5 transition-colors ${isProjectDisabled ? "text-zinc-300" : "text-zinc-400 group-hover:text-blue-500"}`}
        />
        <div className="flex-1">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
            Proyecto
          </p>
          <div className="relative">
            <select
              value={selectedProject}
              disabled={isProjectDisabled}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="appearance-none bg-transparent border-none p-0 text-xs font-bold text-zinc-900 dark:text-zinc-50 focus:ring-0 cursor-pointer w-full"
            >
              <option value="Total" className="bg-white dark:bg-zinc-900">
                Consolidado
              </option>
              {projects
                .filter((p) => p !== "Total")
                .map((proj) => (
                  <option
                    key={proj}
                    value={proj}
                    className="bg-white dark:bg-zinc-900"
                  >
                    {proj}
                  </option>
                ))}
            </select>
          </div>
        </div>
        {!isProjectDisabled && (
          <ChevronDown className="w-3 h-3 text-zinc-300 ml-2" />
        )}
      </div>

      <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-zinc-800 self-center mx-1" />

      {/* 3. Selector de Mes */}
      <div className="flex-1 flex items-center px-3 py-1.5 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-colors group">
        <Calendar className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors mr-2.5" />
        <div className="flex-1">
          <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
            Periodo
          </p>
          <div className="relative">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="appearance-none bg-transparent border-none p-0 text-xs font-bold text-zinc-900 dark:text-zinc-50 focus:ring-0 cursor-pointer w-full"
            >
              {MONTHS.map((m) => (
                <option key={m} value={m} className="bg-white dark:bg-zinc-900">
                  {m}
                </option>
              ))}
            </select>
          </div>
        </div>
        <ChevronDown className="w-3 h-3 text-zinc-300 ml-2" />
      </div>

      {/* 4. Botón de Refresco sutil */}
      <button
        type="button"
        onClick={refetch}
        disabled={loading}
        className="ml-1 p-2.5 bg-white/80 dark:bg-zinc-800/80 hover:bg-white dark:hover:bg-zinc-700 text-blue-600 dark:text-blue-400 rounded-2xl transition-all shadow-sm active:scale-95 disabled:opacity-50"
        title="Sincronizar con Google Sheets"
      >
        <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
      </button>
    </div>
  );
}

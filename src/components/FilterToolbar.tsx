import {
  Calendar,
  ChevronDown,
  FolderKanban,
  RefreshCw,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
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
    selectedMonths,
    setSelectedMonths,
    selectedInvestor,
    setSelectedInvestor,
    selectedProjects,
    setSelectedProjects,
    refetch,
    loading,
  } = useSheet();

  const [monthDropdownOpen, setMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);
  const projectDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(e.target as Node)) {
        setMonthDropdownOpen(false);
      }
      if (projectDropdownRef.current && !projectDropdownRef.current.contains(e.target as Node)) {
        setProjectDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggleMonth(month: string) {
    if (selectedMonths.includes(month)) {
      if (selectedMonths.length === 1) return;
      setSelectedMonths(selectedMonths.filter((m) => m !== month));
    } else {
      setSelectedMonths([...selectedMonths, month]);
    }
  }

  function toggleProject(proj: string) {
    if (selectedProjects.includes(proj)) {
      setSelectedProjects(selectedProjects.filter((p) => p !== proj));
    } else {
      setSelectedProjects([...selectedProjects, proj]);
    }
  }

  const monthLabel =
    selectedMonths.length === 1
      ? selectedMonths[0]
      : `${selectedMonths.length} meses`;

  const projectLabel =
    selectedProjects.length === 0
      ? "Consolidado"
      : selectedProjects.length === 1
      ? selectedProjects[0]
      : `${selectedProjects.length} proyectos`;

  const investors = data.investors || ["Total"];
  const projects = (data.projects || []).filter((p) => p !== "Total");
  const isProjectDisabled = selectedInvestor === "Total";

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-md p-1.5 rounded-[1.5rem] border border-white/40 dark:border-zinc-800/50 shadow-sm flex flex-col md:flex-row items-stretch md:items-center gap-1 relative z-10">
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

      {/* 2. Selector de Proyecto (multi) */}
      <div className={`flex-1 relative ${isProjectDisabled ? "opacity-40 grayscale pointer-events-none" : ""}`} ref={projectDropdownRef}>
        <button
          type="button"
          onClick={() => setProjectDropdownOpen((o) => !o)}
          disabled={isProjectDisabled}
          className="w-full flex items-center px-3 py-1.5 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-colors group text-left"
        >
          <FolderKanban className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors mr-2.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
              Proyecto
            </p>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {projectLabel}
            </p>
          </div>
          <ChevronDown className={`w-3 h-3 text-zinc-300 ml-2 shrink-0 transition-transform ${projectDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {projectDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-[9999] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg p-2 min-w-[180px]">
            {/* Opción "Todos" */}
            <button
              type="button"
              onClick={() => setSelectedProjects([])}
              className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                selectedProjects.length === 0
                  ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                  : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              }`}
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selectedProjects.length === 0 ? "bg-blue-500 border-blue-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                {selectedProjects.length === 0 && (
                  <svg viewBox="0 0 10 8" className="w-2 h-2 text-white fill-current">
                    <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </span>
              Consolidado
            </button>

            {projects.map((proj) => {
              const checked = selectedProjects.includes(proj);
              return (
                <button
                  key={proj}
                  type="button"
                  onClick={() => toggleProject(proj)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    checked
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-blue-500 border-blue-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                    {checked && (
                      <svg viewBox="0 0 10 8" className="w-2 h-2 text-white fill-current">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {proj}
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="hidden md:block w-px h-8 bg-zinc-200 dark:bg-zinc-800 self-center mx-1" />

      {/* 3. Selector de Mes (multi) */}
      <div className="flex-1 relative" ref={monthDropdownRef}>
        <button
          type="button"
          onClick={() => setMonthDropdownOpen((o) => !o)}
          className="w-full flex items-center px-3 py-1.5 hover:bg-white/40 dark:hover:bg-white/5 rounded-xl transition-colors group text-left"
        >
          <Calendar className="w-3.5 h-3.5 text-zinc-400 group-hover:text-blue-500 transition-colors mr-2.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] font-bold text-zinc-400 uppercase tracking-tighter leading-none mb-1">
              Periodo
            </p>
            <p className="text-xs font-bold text-zinc-900 dark:text-zinc-50 truncate">
              {monthLabel}
            </p>
          </div>
          <ChevronDown className={`w-3 h-3 text-zinc-300 ml-2 shrink-0 transition-transform ${monthDropdownOpen ? "rotate-180" : ""}`} />
        </button>

        {monthDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 z-[9999] bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl shadow-lg p-2 min-w-[150px]">
            {MONTHS.map((m) => {
              const checked = selectedMonths.includes(m);
              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => toggleMonth(m)}
                  className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
                    checked
                      ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                      : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-blue-500 border-blue-500" : "border-zinc-300 dark:border-zinc-600"}`}>
                    {checked && (
                      <svg viewBox="0 0 10 8" className="w-2 h-2 text-white fill-current">
                        <path d="M1 4l3 3 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  {m}
                </button>
              );
            })}
          </div>
        )}
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

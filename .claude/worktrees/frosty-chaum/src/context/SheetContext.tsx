import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { sileo } from "sileo";
import type { SheetData } from "@/types/sheets";

interface SheetDataContextType {
  data: SheetData;
  loading: boolean;
  error: string | null;
  selectedMonth: string;
  setSelectedMonth: (month: string) => void;
  selectedInvestor: string;
  setSelectedInvestor: (investor: string) => void;
  selectedProject: string;
  setSelectedProject: (project: string) => void;
  refetch: () => void;
}

const INITIAL_DATA: SheetData = {
  income: 0,
  expenses: 0,
  items: [],
  sheetExists: true,
  investors: [],
  projects: [],
  projectMetrics: {
    capex: { value: 0, sourceRows: [] },
    energyIncome: { value: 0, sourceRows: [] },
    marketingCosts: { value: 0, sourceRows: [] },
    monthlyUtility: { value: 0, sourceRows: [] },
    roi: { value: 0, sourceRows: [] },
    costs: { value: 0, sourceRows: [] },
    tir: { value: 0, sourceRows: [] },
  },
};

const SheetDataContext = createContext<SheetDataContextType | undefined>(
  undefined,
);

export function SheetDataProvider({ children }: { children: ReactNode }) {
  const [selectedMonth, setSelectedMonth] = useState("Enero");
  const [selectedInvestor, setSelectedInvestor] = useState("Total");
  const [selectedProject, setSelectedProject] = useState("Total");
  const [data, setData] = useState<SheetData>(INITIAL_DATA);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cachedInvestors = localStorage.getItem("cached_investors");
    const cachedProjects = localStorage.getItem("cached_projects");
    if (cachedInvestors || cachedProjects) {
      setData((prev) => ({
        ...prev,
        investors: cachedInvestors
          ? JSON.parse(cachedInvestors)
          : prev.investors,
        projects: cachedProjects ? JSON.parse(cachedProjects) : prev.projects,
      }));
    }
  }, []);

  const fetchData = useCallback(
    async (
      month: string,
      investor: string,
      project: string,
      isSilent = false,
    ) => {
      if (!isSilent) setLoading(true);
      setError(null);

      try {
        const url = `/api/sheets?month=${encodeURIComponent(month)}&investor=${encodeURIComponent(investor)}&project=${encodeURIComponent(project)}`;
        const res = await fetch(url);
        const result = await res.json();

        if (res.ok) {
          setData((prev) => ({
            ...result,
            projectMetrics: result.projectMetrics || prev.projectMetrics,
          }));

          if (result.investors?.length > 0)
            localStorage.setItem(
              "cached_investors",
              JSON.stringify(result.investors),
            );
          if (result.projects?.length > 0)
            localStorage.setItem(
              "cached_projects",
              JSON.stringify(result.projects),
            );

          if (!isSilent) {
            sileo.success({
              title: "Datos cargados",
              description: `${project === "Total" ? (investor === "Total" ? "Consolidado" : investor) : project} • ${month}`,
            });
          }
        } else {
          const errorMsg = result.error || "Error al cargar datos.";
          setError(errorMsg);
          sileo.error({ title: "Error", description: errorMsg });
        }
      } catch (err) {
        console.error(err);
        setError("Error de conexión.");
      } finally {
        if (!isSilent) setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    fetchData(selectedMonth, selectedInvestor, selectedProject);
  }, [selectedMonth, selectedInvestor, selectedProject, fetchData]);

  // Reset project to "Total" when investor changes to ensure consistency
  const handleInvestorChange = (inv: string) => {
    setSelectedInvestor(inv);
    setSelectedProject("Total");
  };

  const value = {
    data,
    loading,
    error,
    selectedMonth,
    setSelectedMonth,
    selectedInvestor,
    setSelectedInvestor: handleInvestorChange,
    selectedProject,
    setSelectedProject,
    refetch: () =>
      fetchData(selectedMonth, selectedInvestor, selectedProject, false),
  };

  return (
    <SheetDataContext.Provider value={value}>
      {children}
    </SheetDataContext.Provider>
  );
}

export function useSheet() {
  const context = useContext(SheetDataContext);
  if (context === undefined)
    throw new Error("useSheet must be used within a SheetDataProvider");
  return context;
}

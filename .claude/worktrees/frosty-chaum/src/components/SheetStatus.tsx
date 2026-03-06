import { AlertCircle } from "lucide-react";
import { useSheet } from "@/context/SheetContext";

export default function SheetStatus() {
  const { data, loading, error, selectedMonths } = useSheet();

  if (error) {
    return (
      <div className="bg-red-500/10 backdrop-blur-md border border-red-500/20 p-4 rounded-2xl flex items-start gap-3 text-red-600 dark:text-red-400 shadow-sm">
        <AlertCircle className="w-5 h-5 flex-shrink-0" />
        <p className="text-xs font-bold leading-tight">{error}</p>
      </div>
    );
  }

  if (!data.sheetExists && !loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl rounded-[2.5rem] border-2 border-dashed border-white/40 dark:border-zinc-800/50">
        <AlertCircle className="w-10 h-10 text-zinc-300 mb-4" />
        <h3 className="text-lg font-bold">Hoja No Encontrada</h3>
        <p className="text-zinc-500 dark:text-zinc-400 max-w-sm text-center mt-1 text-sm font-medium">
          La pestaña{" "}
          <span className="text-zinc-900 dark:text-zinc-50 font-bold">
            "{selectedMonths.join(", ")}"
          </span>{" "}
          no existe.
        </p>
      </div>
    );
  }

  return null;
}

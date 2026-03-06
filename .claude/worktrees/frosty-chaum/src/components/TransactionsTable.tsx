import { AlertCircle, Layers } from "lucide-react";
import { useSheet } from "@/context/SheetContext";

export default function TransactionsTable() {
  const { data, loading } = useSheet();

  if (!data.sheetExists && !loading) return null;

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md overflow-hidden">
      <div className="px-6 py-4 border-b border-white/20 dark:border-zinc-800/30 flex justify-between items-center bg-white/20">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-400" />
          Transacciones
        </h2>
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100/50 dark:bg-zinc-800/50 px-3 py-1 rounded-full">
          {data.items.length} FILAS
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-widest">
            <tr>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Categoría</th>
              <th className="px-6 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-xs">
            {loading ? (
              [1, 2, 3].map((i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="px-6 py-4">
                    <div className="h-3 bg-zinc-200/50 rounded-lg w-20"></div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="h-3 bg-zinc-200/50 rounded-lg w-24"></div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="h-3 bg-zinc-200/50 rounded-lg w-16 ml-auto"></div>
                  </td>
                </tr>
              ))
            ) : data.items.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <AlertCircle className="w-8 h-8" />
                    <p className="font-bold">No hay registros financieros</p>
                  </div>
                </td>
              </tr>
            ) : (
              data.items.map((item, idx) => (
                <tr
                  key={`${item.date}-${item.category}-${idx}`}
                  className="group hover:bg-white/40 dark:hover:bg-zinc-800/40 transition-all"
                >
                  <td className="px-6 py-3 text-zinc-500 font-bold">
                    {item.date}
                  </td>
                  <td className="px-6 py-3">
                    <span className="bg-white/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm border border-white/30">
                      {item.category}
                    </span>
                  </td>
                  <td
                    className={`px-6 py-3 text-sm text-right font-black ${item.amount >= 0 ? "text-green-600 dark:text-green-400" : "text-red-500 dark:text-red-400"}`}
                  >
                    {item.amount >= 0 ? "+" : ""}$
                    {Math.abs(item.amount).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

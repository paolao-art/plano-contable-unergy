import { AlertCircle, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import { useEffect, useState } from "react";
import { useSheet } from "@/context/SheetContext";
import type { AsociadoInvoice } from "@/pages/api/odoo/invoices/asociados";

const ESTADO_LABEL: Record<string, { label: string; color: string }> = {
  posted: { label: "Confirmada", color: "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20" },
  draft: { label: "Borrador", color: "text-orange-500 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/20" },
  cancel: { label: "Cancelada", color: "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/20" },
};

const PAGE_SIZE = 15;

export default function TransactionsTable() {
  const { selectedInvestor, selectedMonths } = useSheet();
  const [invoices, setInvoices] = useState<AsociadoInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const year = new Date().getFullYear();
    const params = new URLSearchParams({
      months: selectedMonths.join(","),
      year: String(year),
    });
    if (selectedInvestor && selectedInvestor !== "Total") {
      params.set("investor", selectedInvestor);
    }

    fetch(`/api/odoo/invoices/asociados?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) { setInvoices(data.invoices); setPage(1); }
        else setError(data.error ?? "Error al cargar facturas Odoo.");
      })
      .catch(() => {
        if (!cancelled) setError("No se pudo conectar con Odoo.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [selectedInvestor, selectedMonths]);

  const totalPages = Math.max(1, Math.ceil(invoices.length / PAGE_SIZE));
  const paginated = invoices.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md overflow-hidden print-page-break print-no-break">
      <div className="px-6 py-4 border-b border-white/20 dark:border-zinc-800/30 flex justify-between items-center bg-white/20">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-400" />
          Facturas
        </h2>
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100/50 dark:bg-zinc-800/50 px-3 py-1 rounded-full">
          {loading ? "—" : invoices.length} FILAS
        </span>
      </div>

      {/* Table with max height + sticky header. print:max-h-none shows all rows */}
      <div className="overflow-x-auto overflow-y-auto max-h-[480px] print:max-h-none print:overflow-visible" data-print-table>
        <table className="w-full text-left">
          <thead className="bg-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Cliente</th>
              <th className="px-6 py-3">Factura</th>
              <th className="px-6 py-3">Estado</th>
              <th className="px-6 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-xs">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  <td className="px-6 py-4"><div className="h-3 bg-zinc-200/50 rounded-lg w-20" /></td>
                  <td className="px-6 py-4"><div className="h-3 bg-zinc-200/50 rounded-lg w-28" /></td>
                  <td className="px-6 py-4"><div className="h-3 bg-zinc-200/50 rounded-lg w-24" /></td>
                  <td className="px-6 py-4"><div className="h-3 bg-zinc-200/50 rounded-lg w-16" /></td>
                  <td className="px-6 py-4"><div className="h-3 bg-zinc-200/50 rounded-lg w-16 ml-auto" /></td>
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="font-bold text-red-500">{error}</p>
                  </div>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <AlertCircle className="w-8 h-8" />
                    <p className="font-bold">No hay facturas para este periodo</p>
                  </div>
                </td>
              </tr>
            ) : (
              // Render ALL rows; non-current-page rows are hidden on screen
              // but visible in print (print:table-row overrides hidden).
              invoices.map((inv, idx) => {
                const isVisible = idx >= (page - 1) * PAGE_SIZE && idx < page * PAGE_SIZE;
                const estado = ESTADO_LABEL[inv.estado] ?? { label: inv.estado, color: "text-zinc-400" };
                return (
                  <tr key={inv.id} className={`group hover:bg-white/40 dark:hover:bg-zinc-800/40 transition-all ${isVisible ? "" : "hidden print:table-row"}`}>
                    <td className="px-6 py-3 text-zinc-500 font-bold whitespace-nowrap">{inv.fecha}</td>
                    <td className="px-6 py-3 font-medium text-zinc-700 dark:text-zinc-300 max-w-[180px] truncate">{inv.cliente}</td>
                    <td className="px-6 py-3">
                      <span className="bg-white/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm border border-white/30 whitespace-nowrap">
                        {inv.factura}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${estado.color}`}>
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-sm text-right font-black text-green-600 dark:text-green-400 whitespace-nowrap">
                      ${inv.monto.toLocaleString("es-CO")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination — hidden in print */}
      {!loading && !error && totalPages > 1 && (
        <div data-no-print className="px-6 py-3 border-t border-white/20 dark:border-zinc-800/30 flex items-center justify-between bg-white/10">
          <span className="text-[10px] font-bold text-zinc-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, invoices.length)} de {invoices.length}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce<(number | "…")[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push("…");
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === "…" ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-[10px] text-zinc-400">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p as number)}
                    className={`min-w-[26px] h-[26px] rounded-lg text-[10px] font-black transition-all ${
                      page === p
                        ? "bg-blue-600 text-white shadow-sm"
                        : "hover:bg-white/60 dark:hover:bg-zinc-700/60 text-zinc-500"
                    }`}
                  >
                    {p}
                  </button>
                ),
              )}

            <button
              type="button"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg hover:bg-white/60 dark:hover:bg-zinc-700/60 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


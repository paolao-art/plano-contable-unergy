import { AlertCircle, ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, Layers, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { useSheet } from "@/context/SheetContext";
import type { PagoEntry } from "@/pages/api/odoo/pagos";

const PAGE_SIZE = 15;
const INVESTOR_ESPECIAL = "PATRIMONIOS AUTONOMOS FIDUCIARIA BANCOLOMBIA S A SOCIEDAD FIDUCIARIA";

const fmtDate = (d: string) => {
  if (!d || d === "—") return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export default function TransactionsTable() {
  const { data, selectedInvestor, selectedMonths } = useSheet();
  const [pagos, setPagos] = useState<PagoEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [cobrosUnergy, setCobrosUnergy] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    const year = new Date().getFullYear();
    const params = new URLSearchParams({ months: selectedMonths.join(","), year: String(year) });
    if (selectedInvestor && selectedInvestor !== "Total") {
      params.set("investor", selectedInvestor);
    }

    fetch(`/api/odoo/pagos?${params}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        if (data.success) { setPagos(data.pagos); setPage(1); }
        else setError(data.error ?? "Error al cargar pagos de Odoo.");
      })
      .catch(() => { if (!cancelled) setError("No se pudo conectar con Odoo."); })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [selectedInvestor, selectedMonths]);

  // Para el inversionista especial: fetch Cobros Unergy (facturas Odoo)
  useEffect(() => {
    if (selectedInvestor !== INVESTOR_ESPECIAL) { setCobrosUnergy(0); return; }
    let cancelled = false;
    const year = new Date().getFullYear();
    const params = new URLSearchParams({ months: selectedMonths.join(","), year: String(year), investor: selectedInvestor });
    fetch(`/api/odoo/invoices/asociados?${params}`)
      .then((r) => r.json())
      .then((res) => {
        if (cancelled || !res.success) return;
        setCobrosUnergy((res.invoices as { monto: number }[]).reduce((s, inv) => s + inv.monto, 0));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [selectedInvestor, selectedMonths]);

  const totalPages = Math.max(1, Math.ceil(pagos.length / PAGE_SIZE));

  const totalPagos = pagos.reduce((sum, p) => sum + p.monto, 0);
  const totalCobros = pagos.filter((p) => p.tipo === "cobro").reduce((sum, p) => sum + p.monto, 0);

  const esInversorEspecial = selectedInvestor === INVESTOR_ESPECIAL;
  const utilidad = esInversorEspecial
    ? (data.projectMetrics?.marketingCosts?.value ?? 0)
      + cobrosUnergy
      + (data.projectMetrics?.costs?.value ?? 0)
      - totalCobros
    : data.projectMetrics?.monthlyUtility?.value ?? 0;

  const resultado = utilidad - totalPagos;

  const fmt = (v: number) => `$${Math.round(Math.abs(v)).toLocaleString("es-CO")}`;

  return (
    <div className="space-y-4">
    {/* Resumen Pagos */}
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md p-5">
      <p className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-4 flex items-center gap-2">
        <TrendingUp className="w-3.5 h-3.5 text-[#915BD8]" />
        Resumen Pagos
      </p>
      <div className="grid grid-cols-3 gap-4">
        <div>
          <p className="text-[10px] font-bold text-zinc-400 mb-1">Utilidad</p>
          <p className="text-lg font-black text-zinc-900 dark:text-zinc-50">{fmt(utilidad)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-400 mb-1">Pagos</p>
          <p className="text-lg font-black text-red-600 dark:text-red-400">{fmt(totalPagos)}</p>
        </div>
        <div>
          <p className="text-[10px] font-bold text-zinc-400 mb-1">Resultado</p>
          <p className={`text-lg font-black ${resultado >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
            {resultado < 0 ? "-" : ""}{fmt(resultado)}
          </p>
        </div>
      </div>
    </div>

    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-2xl rounded-3xl border border-white/40 dark:border-zinc-800/50 shadow-md overflow-hidden print-page-break print-no-break">
      <div className="px-6 py-4 border-b border-white/20 dark:border-zinc-800/30 flex justify-between items-center bg-white/20">
        <h2 className="text-sm font-bold flex items-center gap-2">
          <Layers className="w-4 h-4 text-zinc-400" />
          Pagos
        </h2>
        <span className="text-[10px] font-bold text-zinc-400 bg-zinc-100/50 dark:bg-zinc-800/50 px-3 py-1 rounded-full">
          {loading ? "—" : pagos.length} FILAS
        </span>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[480px] print:max-h-none print:overflow-visible" data-print-table>
        <table className="w-full text-left">
          <thead className="bg-white/10 text-[9px] font-black text-zinc-400 uppercase tracking-widest sticky top-0 z-10 backdrop-blur-md">
            <tr>
              <th className="px-6 py-3">Fecha</th>
              <th className="px-6 py-3">Asiento</th>
              <th className="px-6 py-3">Socio</th>
              <th className="px-6 py-3">Descripción</th>
              <th className="px-6 py-3">Tipo</th>
              <th className="px-6 py-3 text-right">Monto</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200/50 dark:divide-zinc-800/50 text-xs">
            {loading ? (
              [1, 2, 3, 4, 5].map((i) => (
                <tr key={`skeleton-${i}`} className="animate-pulse">
                  {[20, 24, 28, 32, 16, 16].map((w, j) => (
                    <td key={j} className="px-6 py-4">
                      <div className={`h-3 bg-zinc-200/50 rounded-lg w-${w} ${j === 5 ? "ml-auto" : ""}`} />
                    </td>
                  ))}
                </tr>
              ))
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-40">
                    <AlertCircle className="w-8 h-8 text-red-400" />
                    <p className="font-bold text-red-500">{error}</p>
                  </div>
                </td>
              </tr>
            ) : pagos.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-10 text-center">
                  <div className="flex flex-col items-center gap-2 opacity-30">
                    <AlertCircle className="w-8 h-8" />
                    <p className="font-bold">No hay pagos para este periodo</p>
                  </div>
                </td>
              </tr>
            ) : (
              pagos.map((pago, idx) => {
                const isVisible = idx >= (page - 1) * PAGE_SIZE && idx < page * PAGE_SIZE;
                const esCobro = pago.tipo === "cobro";
                return (
                  <tr
                    key={pago.id}
                    className={`group hover:bg-white/40 dark:hover:bg-zinc-800/40 transition-all ${isVisible ? "" : "hidden print:table-row"}`}
                  >
                    <td className="px-6 py-3 text-zinc-500 font-bold whitespace-nowrap">
                      {fmtDate(pago.fecha)}
                    </td>
                    <td className="px-6 py-3 whitespace-nowrap">
                      <span className="bg-white/50 dark:bg-zinc-800/50 text-zinc-700 dark:text-zinc-200 px-3 py-1 rounded-lg text-[10px] font-bold uppercase shadow-sm border border-white/30">
                        {pago.referencia}
                      </span>
                    </td>
                    <td className="px-6 py-3 font-medium text-zinc-700 dark:text-zinc-300 max-w-[160px] truncate">
                      {pago.socio}
                    </td>
                    <td className="px-6 py-3 text-zinc-500 dark:text-zinc-400 max-w-[200px] truncate">
                      {pago.descripcion}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        esCobro
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300"
                          : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                      }`}>
                        {esCobro
                          ? <><ArrowUpRight className="w-3 h-3" /> Cobro</>
                          : <><ArrowDownLeft className="w-3 h-3" /> Pago</>
                        }
                      </span>
                    </td>
                    <td className={`px-6 py-3 text-sm text-right font-black whitespace-nowrap ${
                      esCobro ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                    }`}>
                      ${pago.monto.toLocaleString("es-CO")}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!loading && !error && totalPages > 1 && (
        <div data-no-print className="px-6 py-3 border-t border-white/20 dark:border-zinc-800/30 flex items-center justify-between bg-white/10">
          <span className="text-[10px] font-bold text-zinc-400">
            {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, pagos.length)} de {pagos.length}
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
    </div>
  );
}

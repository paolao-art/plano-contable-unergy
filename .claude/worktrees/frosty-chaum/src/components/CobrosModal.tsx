import { X } from "lucide-react";
import type { AsociadoInvoice } from "@/pages/api/odoo/invoices/asociados";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  invoices: AsociadoInvoice[];
  total: number;
  loading?: boolean;
}

const ESTADO_LABEL: Record<string, { label: string; className: string }> = {
  paid:       { label: "Pagada",    className: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  in_payment: { label: "En pago",   className: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  partial:    { label: "Parcial",   className: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300" },
  overdue:    { label: "Vencida",   className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  not_paid:   { label: "Pendiente", className: "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  reversed:   { label: "Reversada", className: "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-500" },
};

const fmt = (v: number) =>
  `$${Math.round(v).toLocaleString("es-CO")}`;

const fmtDate = (d: string) => {
  if (!d || d === "—") return "—";
  const [y, m, day] = d.split("-");
  return `${day}/${m}/${y}`;
};

export default function CobrosModal({ isOpen, onClose, invoices, total, loading }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <button
        type="button"
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative z-10 w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-3xl shadow-2xl border border-white/20 dark:border-zinc-800 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-base font-black tracking-tight">Cobros Unergy</h2>
            <p className="text-xs text-zinc-400 font-semibold mt-0.5">
              {invoices.length} pago{invoices.length !== 1 ? "s" : ""} · Total: {fmt(total)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <div className="w-6 h-6 border-2 border-[#915BD8] border-t-transparent rounded-full animate-spin" />
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex items-center justify-center h-40 text-sm text-zinc-400 font-semibold">
              Sin pagos publicadas para el periodo seleccionado
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-zinc-50 dark:bg-zinc-800/80">
                <tr>
                  {["Fecha", "N° de Facturas", "Cliente", "Monto", "Estado"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-zinc-400"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {invoices.map((inv) => {
                  const badge = ESTADO_LABEL[inv.estadoPago] ?? { label: inv.estadoPago, className: "bg-zinc-100 text-zinc-500" };
                  return (
                    <tr key={inv.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <td className="px-4 py-3 text-xs text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                        {fmtDate(inv.fecha)}
                      </td>
                      <td className="px-4 py-3 font-bold text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {inv.pago}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-600 dark:text-zinc-300 max-w-[180px] truncate">
                        {inv.cliente}
                      </td>
                      <td className="px-4 py-3 font-black text-xs text-zinc-900 dark:text-zinc-100 whitespace-nowrap">
                        {fmt(inv.monto)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wide ${badge.className}`}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer total */}
        <div className="px-6 py-3 border-t border-zinc-100 dark:border-zinc-800 flex justify-end">
          <span className="text-sm font-black text-zinc-900 dark:text-zinc-50">
            Total: {fmt(total)}
          </span>
        </div>
      </div>
    </div>
  );
}

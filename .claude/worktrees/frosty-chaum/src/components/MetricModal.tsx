import { Table as TableIcon, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MetricDetail } from "@/types/sheets";

interface MetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  detail: MetricDetail | null;
}

export default function MetricModal({
  isOpen,
  onClose,
  title,
  detail,
}: MetricModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !detail || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Botón invisible para cerrar al hacer clic fuera */}
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default border-none"
        onClick={onClose}
        aria-label="Cerrar modal"
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
        {/* Header Sólido */}
        <div className="px-8 py-6 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
              <TableIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 leading-none">
                {title}
              </h3>
              <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 mt-1">
                Trazabilidad de Datos
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabla sobre Fondo Sólido */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-zinc-950">
          {detail.sourceRows.length === 0 ? (
            <div className="p-12 text-center text-zinc-500 text-sm">
              No hay filas asociadas a este cálculo.
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-zinc-100 dark:bg-zinc-900 text-[10px] font-black text-zinc-500 dark:text-zinc-400 uppercase tracking-[0.2em] border-b border-zinc-200 dark:border-zinc-800 z-20">
                <tr>
                  {detail.sourceRows.some((r) => r.inversionista) && (
                    <th className="px-8 py-4">Inversionista</th>
                  )}
                  <th className="px-8 py-4">Proyecto</th>
                  <th className="px-8 py-4">Concepto</th>
                  <th className="px-8 py-4 text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800 text-xs">
                {detail.sourceRows.map((row, idx) => (
                  <tr
                    key={`${row.proyecto}-${row.concepto}-${idx}`}
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-900/80 transition-colors"
                  >
                    {detail.sourceRows.some((r) => r.inversionista) && (
                      <td className="px-8 py-4 font-medium text-zinc-500 dark:text-zinc-400">
                        {row.inversionista || "—"}
                      </td>
                    )}
                    <td className="px-8 py-4 font-medium text-zinc-600 dark:text-zinc-400">
                      {row.proyecto}
                    </td>
                    <td className="px-8 py-4 font-bold text-zinc-900 dark:text-zinc-100">
                      {row.concepto}
                    </td>
                    <td className="px-8 py-4 text-right font-black text-blue-600 dark:text-blue-400">
                      $
                      {(row.valor ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer Sólido */}
        <div className="px-8 py-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex-shrink-0 flex justify-between items-center">
          <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-widest">
            Total calculado:
          </span>
          <span className="text-xl font-black text-zinc-900 dark:text-zinc-50">
            $
            {(detail.value ?? 0).toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

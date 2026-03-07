import { Eye, Table as TableIcon, X } from "lucide-react";
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { MetricDetail } from "@/types/sheets";

interface MetricModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  detail: MetricDetail | null;
  showSoportes?: boolean;
}

const toProxyUrl = (url: string): string => {
  if (!url.includes("drive.google.com")) return url;
  // Format: /file/d/ID/...
  const fileMatch = url.match(/\/file\/d\/([^/?#]+)/);
  if (fileMatch) return `/api/drive/file?id=${fileMatch[1]}`;
  // Format: open?id=ID or export?id=ID
  const openMatch = url.match(/[?&]id=([^&]+)/);
  if (openMatch) return `/api/drive/file?id=${openMatch[1]}`;
  return url;
};

export default function MetricModal({
  isOpen,
  onClose,
  title,
  detail,
  showSoportes,
}: MetricModalProps) {
  const [mounted, setMounted] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
      setPreviewUrl(null);
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!isOpen || !detail || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <button
        type="button"
        className="absolute inset-0 w-full h-full cursor-default border-none"
        onClick={previewUrl ? () => setPreviewUrl(null) : onClose}
        aria-label="Cerrar modal"
      />

      {previewUrl ? (
        /* Vista previa del soporte */
        <div className="relative w-full max-w-4xl h-[90vh] bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-900 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-blue-500/10 rounded-xl text-blue-600">
                <Eye className="w-4 h-4" />
              </div>
              <span className="text-sm font-bold text-zinc-900 dark:text-zinc-50">Vista previa del soporte</span>
            </div>
            <button
              type="button"
              onClick={() => setPreviewUrl(null)}
              className="p-2 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full transition-colors text-zinc-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <iframe
              src={toProxyUrl(previewUrl)}
              className="w-full h-full border-0"
              title="Vista previa soporte"
            />
          </div>
        </div>
      ) : (
        /* Tabla principal */
        <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 rounded-[2.5rem] border border-zinc-200 dark:border-zinc-800 shadow-2xl overflow-hidden animate-in zoom-in duration-300 flex flex-col max-h-[90vh]">
          {/* Header */}
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

          {/* Tabla */}
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
                    {showSoportes && (
                      <th className="px-8 py-4">Soporte</th>
                    )}
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
                      {showSoportes && (
                        <td className="px-8 py-4">
                          {row.soporte?.startsWith("http") ? (
                            <button
                              type="button"
                              onClick={() => setPreviewUrl(row.soporte!)}
                              className="flex items-center gap-1.5 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span className="text-xs font-semibold">Ver</span>
                            </button>
                          ) : row.soporte ? (
                            <span className="text-xs text-zinc-500">{row.soporte}</span>
                          ) : (
                            <span className="text-zinc-300 dark:text-zinc-700">—</span>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Footer */}
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
      )}
    </div>
  );

  return createPortal(modalContent, document.body);
}

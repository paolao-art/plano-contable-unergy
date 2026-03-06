/**
 * POST /api/odoo/export
 *
 * Exporta registros de cualquier modelo de Odoo como archivo CSV descargable.
 * Compatible con Excel: separador ";", codificación UTF-8 BOM.
 *
 * Body:
 *   model     {string}    Nombre del modelo, e.g. "account.move"
 *   domain    {array}     Dominio de búsqueda, e.g. [["state", "=", "posted"]]
 *   fields    {string[]}  Campos a exportar, e.g. ["name", "partner_id", "amount_total"]
 *   filename  {string}    Nombre del archivo descargado, e.g. "facturas_2025.csv"
 *
 * Ejemplo:
 *   POST /api/odoo/export
 *   {
 *     "model": "account.move",
 *     "domain": [["move_type", "=", "in_invoice"], ["state", "=", "posted"]],
 *     "fields": ["name", "partner_id", "invoice_date", "amount_untaxed"],
 *     "filename": "facturas_proveedor.csv"
 *   }
 *
 * Respuesta: archivo CSV como descarga (Content-Disposition: attachment)
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { getOdooClient } from "@/lib/odoo";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Método no permitido. Usa POST." });
  }

  const { model, domain, fields, filename = "odoo_export.csv" } = req.body ?? {};

  if (!model || !Array.isArray(domain) || !Array.isArray(fields) || fields.length === 0) {
    return res.status(400).json({
      error: 'Se requieren "model" (string), "domain" (array) y "fields" (array no vacío).',
    });
  }

  try {
    const odoo = getOdooClient();

    const records = (await odoo.executeKw(
      model,
      "search_read",
      [domain],
      { fields },
    )) as Record<string, unknown>[];

    if (records.length === 0) {
      return res.status(200).json({
        success: true,
        count: 0,
        message: "No se encontraron registros con ese dominio.",
      });
    }

    // Construir CSV con separador ";" y UTF-8 BOM (para compatibilidad con Excel)
    const BOM = "\uFEFF";
    const header = fields.join(";");

    const rows = records.map((rec) =>
      fields
        .map((f) => {
          const val = rec[f];
          if (val === null || val === undefined || val === false) return "";
          // Many2one → [id, name] en Odoo devuelve un array; tomamos el nombre
          if (Array.isArray(val)) return csvCell(String(val[1] ?? val[0] ?? ""));
          return csvCell(String(val));
        })
        .join(";"),
    );

    const csv = BOM + [header, ...rows].join("\n");

    const safeFilename = filename.endsWith(".csv") ? filename : `${filename}.csv`;

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${safeFilename}"`,
    );
    return res.status(200).send(csv);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ success: false, error: message });
  }
}

/** Escapa una celda CSV: si contiene ; " o salto de línea, la encierra en comillas. */
function csvCell(value: string): string {
  if (value.includes(";") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

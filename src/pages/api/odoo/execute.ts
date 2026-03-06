/**
 * POST /api/odoo/execute
 *
 * Ejecuta cualquier método XML-RPC sobre cualquier modelo de Odoo.
 * Útil para operaciones no cubiertas por los endpoints especializados.
 *
 * Body:
 *   model   {string}  Nombre del modelo, e.g. "res.partner"
 *   method  {string}  Método a llamar, e.g. "search_read"
 *   args    {array}   Argumentos posicionales (opcional, default [])
 *   kwargs  {object}  Argumentos por nombre (opcional, default {})
 *
 * Ejemplo — listar los 5 primeros contactos empresa:
 *   POST /api/odoo/execute
 *   {
 *     "model": "res.partner",
 *     "method": "search_read",
 *     "args": [[["is_company", "=", true]]],
 *     "kwargs": { "fields": ["name", "email", "vat"], "limit": 5 }
 *   }
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

  const { model, method, args = [], kwargs = {} } = req.body ?? {};

  if (!model || !method) {
    return res
      .status(400)
      .json({ error: 'Se requieren los campos "model" y "method".' });
  }

  try {
    const odoo = getOdooClient();
    const result = await odoo.executeKw(model, method, args, kwargs);
    return res.status(200).json({ success: true, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ success: false, error: message });
  }
}

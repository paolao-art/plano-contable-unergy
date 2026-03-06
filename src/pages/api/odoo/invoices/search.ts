/**
 * POST /api/odoo/invoices/search
 *
 * Busca líneas de factura por palabra clave en el nombre del producto
 * o en la descripción de la línea. Devuelve proveedor, NIT, cuenta analítica
 * y subtotales.
 *
 * Body:
 *   product_keyword  {string}  Texto a buscar (case-insensitive)
 *   supplier_name    {string}  Filtrar por nombre de proveedor (opcional)
 *   move_type        {string}  "in_invoice" (proveedor) | "out_invoice" (cliente). Default: "in_invoice"
 *   limit            {number}  Máximo de filas a retornar. Default: 100
 *
 * Respuesta:
 *   { success: true, count: N, rows: [{ proveedor, nit, factura, descripcion_item, cuenta_analitica, subtotal_item, subtotal_factura }] }
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

  const {
    product_keyword,
    supplier_name,
    move_type = "in_invoice",
    limit = 100,
  } = req.body ?? {};

  if (!product_keyword) {
    return res
      .status(400)
      .json({ error: 'Se requiere el campo "product_keyword".' });
  }

  try {
    const odoo = getOdooClient();

    // 1. Resolver partner_id si se pasa supplier_name
    let partner_id: number | null = null;
    if (supplier_name) {
      const partners = (await odoo.executeKw(
        "res.partner",
        "search_read",
        [[["name", "ilike", supplier_name]]],
        { fields: ["id", "name"], limit: 1 },
      )) as Array<{ id: number; name: string }>;

      if (partners.length > 0) partner_id = partners[0].id;
    }

    // 2. Construir dominio de búsqueda en líneas de factura
    const domain: unknown[] = [
      ["move_id.move_type", "=", move_type],
      "|",
      ["product_id.name", "ilike", product_keyword],
      ["name", "ilike", product_keyword],
    ];
    if (partner_id !== null) {
      domain.unshift(["move_id.partner_id", "=", partner_id]);
    }

    const lines = (await odoo.executeKw(
      "account.move.line",
      "search_read",
      [domain],
      {
        fields: ["move_id", "product_id", "name", "price_subtotal", "analytic_distribution"],
        limit,
      },
    )) as Array<{
      move_id: [number, string];
      product_id: [number, string] | false;
      name: string;
      price_subtotal: number;
      analytic_distribution: Record<string, number> | false;
    }>;

    if (lines.length === 0) {
      return res.status(200).json({ success: true, count: 0, rows: [] });
    }

    // 3. Cargar facturas relacionadas
    const moveIds = [...new Set(lines.map((l) => l.move_id[0]))];
    const invoices = (await odoo.executeKw(
      "account.move",
      "search_read",
      [[["id", "in", moveIds]]],
      { fields: ["id", "name", "partner_id", "amount_untaxed"] },
    )) as Array<{
      id: number;
      name: string;
      partner_id: [number, string];
      amount_untaxed: number;
    }>;
    const invoiceMap = Object.fromEntries(invoices.map((inv) => [inv.id, inv]));

    // 4. Cargar partners
    const partnerIds = [...new Set(invoices.map((inv) => inv.partner_id[0]))];
    const partners = (await odoo.executeKw(
      "res.partner",
      "search_read",
      [[["id", "in", partnerIds]]],
      { fields: ["id", "name", "vat"] },
    )) as Array<{ id: number; name: string; vat: string | false }>;
    const partnerMap = Object.fromEntries(partners.map((p) => [p.id, p]));

    // 5. Cargar cuentas analíticas
    const analyticIds = new Set<number>();
    for (const l of lines) {
      if (l.analytic_distribution) {
        for (const k of Object.keys(l.analytic_distribution)) {
          analyticIds.add(parseInt(k, 10));
        }
      }
    }

    const analyticMap: Record<number, string> = {};
    if (analyticIds.size > 0) {
      const analytics = (await odoo.executeKw(
        "account.analytic.account",
        "search_read",
        [[["id", "in", [...analyticIds]]]],
        { fields: ["id", "name"] },
      )) as Array<{ id: number; name: string }>;
      for (const a of analytics) analyticMap[a.id] = a.name;
    }

    // 6. Construir filas de resultado
    const rows = lines.map((l) => {
      const inv = invoiceMap[l.move_id[0]];
      const partner = partnerMap[inv.partner_id[0]];

      let cuenta_analitica = "N/A";
      if (l.analytic_distribution) {
        const names = Object.keys(l.analytic_distribution).map(
          (k) => analyticMap[parseInt(k, 10)] ?? k,
        );
        cuenta_analitica = names.join(", ");
      }

      return {
        proveedor:        partner.name,
        nit:              partner.vat || "N/A",
        factura:          inv.name,
        descripcion_item: l.product_id ? l.product_id[1] : l.name,
        cuenta_analitica,
        subtotal_item:    l.price_subtotal,
        subtotal_factura: inv.amount_untaxed,
      };
    });

    return res.status(200).json({ success: true, count: rows.length, rows });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ success: false, error: message });
  }
}

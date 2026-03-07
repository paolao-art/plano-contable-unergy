/**
 * GET /api/odoo/invoices/asociados?investor=...&months=Enero,Marzo&year=2026
 *
 * Devuelve las facturas de cliente (out_invoice) de Odoo filtradas por periodo.
 *
 * Query params:
 *   investor  {string}  Nombre del inversionista. "Total" o ausente = todos.
 *   months    {string}  Meses en español separados por coma, e.g. "Enero,Febrero".
 *                       Si está ausente, usa el mes actual.
 *   year      {number}  Año. Si está ausente, usa el año actual.
 *
 * Respuesta:
 *   { success: true, count: N, invoices: [{ id, factura, cliente, fecha, monto, estado }] }
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { getOdooClient } from "@/lib/odoo";

const MONTH_NUMBER: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

/**
 * Construye la parte del dominio Odoo para filtrar por uno o varios meses.
 * Devuelve condiciones listas para concatenar al dominio principal.
 *
 * Odoo usa notación prefija para OR/AND:
 *   1 mes  → ['&', [date>=from], [date<=to]]
 *   N meses → [N-1 veces '|', '&', from1, to1, '&', from2, to2, ...]
 */
function buildDateDomain(months: string[], year: number): unknown[] {
  const ranges = months
    .map((m) => MONTH_NUMBER[m])
    .filter(Boolean)
    .map((n) => {
      const mm = String(n).padStart(2, "0");
      const lastDay = new Date(year, n, 0).getDate(); // día 0 del mes siguiente = último día del mes
      return {
        from: `${year}-${mm}-01`,
        to:   `${year}-${mm}-${lastDay}`,
      };
    });

  if (ranges.length === 0) return [];

  if (ranges.length === 1) {
    return [
      ["invoice_date", ">=", ranges[0].from],
      ["invoice_date", "<=", ranges[0].to],
    ];
  }

  // N meses: (N-1) operadores '|' seguidos de N bloques '&' + 2 condiciones cada uno
  const domain: unknown[] = [];
  for (let i = 0; i < ranges.length - 1; i++) domain.push("|");
  for (const r of ranges) {
    domain.push("&");
    domain.push(["invoice_date", ">=", r.from]);
    domain.push(["invoice_date", "<=", r.to]);
  }
  return domain;
}

export type AsociadoInvoice = {
  id: number;
  factura: string;        // Número de factura, e.g. "SUFV507"
  cliente: string;        // Cliente = Inversionista
  fecha: string;          // invoice_date, e.g. "2025-03-01"
  fechaVencimiento: string; // invoice_date_due
  monto: number;          // amount_total
  estado: string;         // "posted" | "draft" | "cancel"
  estadoPago: string;     // "paid" | "not_paid" | "in_payment" | "partial" | "reversed"
};

type OdooInvoiceRaw = {
  id: number;
  name: string;
  partner_id: [number, string] | false;
  invoice_date: string | false;
  invoice_date_due: string | false;
  amount_total: number;
  state: string;
  payment_state: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const investor = req.query.investor as string | undefined;
  const hasInvestorFilter = investor && investor !== "Total";

  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const months = req.query.months
    ? (req.query.months as string).split(",").map((m) => m.trim())
    : [Object.keys(MONTH_NUMBER)[new Date().getMonth()]]; // mes actual como fallback

  try {
    const odoo = getOdooClient();

    // Dominio base: facturas de cliente no canceladas
    const domain: unknown[] = [
      ["move_type", "=", "out_invoice"],
      ["state", "=", "posted"],
    ];

    // Filtro de periodo
    domain.push(...buildDateDomain(months, year));

    if (hasInvestorFilter) {
      domain.push(["partner_id.name", "ilike", investor]);
    }

    const raw = (await odoo.executeKw(
      "account.move",
      "search_read",
      [domain],
      {
        fields: ["name", "partner_id", "invoice_date", "invoice_date_due", "amount_total", "state", "payment_state"],
        order: "invoice_date desc",
        limit: 500,
      },
    )) as OdooInvoiceRaw[];

    const today = new Date().toISOString().slice(0, 10);
    const invoices: AsociadoInvoice[] = raw.map((inv) => ({
      id:               inv.id,
      factura:          inv.name,
      cliente:          inv.partner_id ? inv.partner_id[1] : "—",
      fecha:            inv.invoice_date || "—",
      fechaVencimiento: inv.invoice_date_due || "—",
      monto:            inv.amount_total,
      estado:           inv.state,
      estadoPago:       inv.payment_state === "not_paid" && inv.invoice_date_due && inv.invoice_date_due < today
                          ? "overdue"
                          : inv.payment_state,
    }));

    return res.status(200).json({ success: true, count: invoices.length, invoices });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ success: false, error: message });
  }
}

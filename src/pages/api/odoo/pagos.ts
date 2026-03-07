/**
 * GET /api/odoo/pagos?investor=...&months=Enero,Marzo&year=2026
 *
 * Devuelve líneas de asientos contables de Odoo filtradas por cuentas:
 *   110101 (débito)  → pago del inversionista a Unergy
 *   110102 (crédito) → pago de Unergy al inversionista
 *
 * Query params:
 *   investor  {string}  Nombre del inversionista. "Total" o ausente = todos.
 *   months    {string}  Meses en español separados por coma, e.g. "Enero,Febrero".
 *   year      {number}  Año. Si está ausente, usa el año actual.
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { getOdooClient } from "@/lib/odoo";

const MONTH_NUMBER: Record<string, number> = {
  Enero: 1, Febrero: 2, Marzo: 3, Abril: 4, Mayo: 5, Junio: 6,
  Julio: 7, Agosto: 8, Septiembre: 9, Octubre: 10, Noviembre: 11, Diciembre: 12,
};

export type PagoEntry = {
  id: number;
  fecha: string;
  referencia: string;   // Número del asiento (move_id name)
  descripcion: string;  // Nombre de la línea
  socio: string;        // Partner (inversionista)
  tipo: "cobro" | "pago"; // cobro=110101 (inv→Unergy), pago=110102 (Unergy→inv)
  monto: number;
};

type OdooMoveLine = {
  id: number;
  date: string | false;
  name: string | false;
  move_id: [number, string] | false;
  partner_id: [number, string] | false;
  account_id: [number, string] | false;
  debit: number;
  credit: number;
};

function buildDateDomain(months: string[], year: number): unknown[] {
  const ranges = months
    .map((m) => MONTH_NUMBER[m])
    .filter(Boolean)
    .map((n) => {
      const mm = String(n).padStart(2, "0");
      const lastDay = new Date(year, n, 0).getDate();
      return { from: `${year}-${mm}-01`, to: `${year}-${mm}-${lastDay}` };
    });

  if (ranges.length === 0) return [];
  if (ranges.length === 1) {
    return [
      ["date", ">=", ranges[0].from],
      ["date", "<=", ranges[0].to],
    ];
  }

  const domain: unknown[] = [];
  for (let i = 0; i < ranges.length - 1; i++) domain.push("|");
  for (const r of ranges) {
    domain.push("&");
    domain.push(["date", ">=", r.from]);
    domain.push(["date", "<=", r.to]);
  }
  return domain;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const investor = req.query.investor as string | undefined;
  const hasInvestorFilter = investor && investor !== "Total";
  const year = req.query.year ? parseInt(req.query.year as string, 10) : new Date().getFullYear();
  const months = req.query.months
    ? (req.query.months as string).split(",").map((m) => m.trim())
    : [Object.keys(MONTH_NUMBER)[new Date().getMonth()]];

  try {
    const odoo = getOdooClient();

    // Base: solo asientos publicados con cuentas 110101 o 110102
    const domain: unknown[] = [
      ["move_id.state", "=", "posted"],
      "|",
      ["account_id.code", "=", "110101"],
      ["account_id.code", "=", "110102"],
    ];

    domain.push(...buildDateDomain(months, year));

    if (hasInvestorFilter) {
      domain.push(["partner_id.name", "ilike", investor]);
    }

    const raw = (await odoo.executeKw(
      "account.move.line",
      "search_read",
      [domain],
      {
        fields: ["date", "name", "move_id", "partner_id", "account_id", "debit", "credit"],
        order: "date desc",
        limit: 1000,
      },
    )) as OdooMoveLine[];

    const pagos: PagoEntry[] = raw
      .filter((l) => {
        const code = l.account_id ? (l.account_id[1] ?? "").split(" ")[0] : "";
        // 110101 débito → cobro; 110102 crédito → pago
        if (code === "110101") return l.debit > 0;
        if (code === "110102") return l.credit > 0;
        return false;
      })
      .map((l) => {
        const code = l.account_id ? (l.account_id[1] ?? "").split(" ")[0] : "";
        return {
          id: l.id,
          fecha: l.date || "—",
          referencia: l.move_id ? l.move_id[1] : "—",
          descripcion: l.name || "—",
          socio: l.partner_id ? l.partner_id[1] : "—",
          tipo: code === "110101" ? "cobro" : "pago",
          monto: code === "110101" ? l.debit : l.credit,
        };
      });

    return res.status(200).json({ success: true, count: pagos.length, pagos });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ success: false, error: message });
  }
}

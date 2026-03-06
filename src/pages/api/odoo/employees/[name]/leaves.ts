/**
 * GET /api/odoo/employees/[name]/leaves
 *
 * Consulta las vacaciones de un empleado buscando por nombre (o parte del nombre).
 * Devuelve asignaciones, ausencias aprobadas y saldo disponible.
 *
 * Parámetro de ruta:
 *   name  {string}  Nombre o parte del nombre del empleado
 *
 * Ejemplo:
 *   GET /api/odoo/employees/Maria Garcia/leaves
 *
 * Respuesta:
 *   {
 *     success: true,
 *     employee: { id, name, job_title, department },
 *     assignments: [{ tipo, dias_asignados, desde, hasta }],
 *     leaves:      [{ tipo, dias_tomados, desde, hasta, descripcion }],
 *     total_asignado: N,
 *     total_tomado:   N,
 *     saldo_disponible: N
 *   }
 */
import type { NextApiRequest, NextApiResponse } from "next";
import { getOdooClient } from "@/lib/odoo";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Método no permitido. Usa GET." });
  }

  const employeeName = req.query.name as string;
  if (!employeeName) {
    return res.status(400).json({ error: "Se requiere el nombre del empleado en la ruta." });
  }

  try {
    const odoo = getOdooClient();

    // 1. Buscar empleado activo por nombre
    const employees = (await odoo.executeKw(
      "hr.employee",
      "search_read",
      [[["name", "ilike", employeeName], ["active", "=", true]]],
      { fields: ["id", "name", "job_title", "department_id"], limit: 5 },
    )) as Array<{
      id: number;
      name: string;
      job_title: string | false;
      department_id: [number, string] | false;
    }>;

    if (employees.length === 0) {
      return res.status(404).json({
        success: false,
        error: `No se encontró empleado activo con nombre "${employeeName}"`,
      });
    }

    const emp = employees[0];
    const empId = emp.id;

    // 2. Asignaciones de vacaciones validadas (hr.leave.allocation)
    const allocations = (await odoo.executeKw(
      "hr.leave.allocation",
      "search_read",
      [[
        ["employee_id", "=", empId],
        ["holiday_status_id.name", "ilike", "vacaci"],
        ["state", "=", "validate"],
      ]],
      { fields: ["holiday_status_id", "number_of_days", "date_from", "date_to"] },
    )) as Array<{
      holiday_status_id: [number, string];
      number_of_days: number;
      date_from: string | false;
      date_to: string | false;
    }>;

    const total_asignado = allocations.reduce(
      (sum, a) => sum + a.number_of_days,
      0,
    );

    // 3. Ausencias aprobadas de vacaciones (hr.leave)
    const leaves = (await odoo.executeKw(
      "hr.leave",
      "search_read",
      [[
        ["employee_id", "=", empId],
        ["holiday_status_id.name", "ilike", "vacaci"],
        ["state", "=", "validate"],
      ]],
      {
        fields: [
          "holiday_status_id",
          "number_of_days",
          "date_from",
          "date_to",
          "name",
        ],
      },
    )) as Array<{
      holiday_status_id: [number, string];
      number_of_days: number;
      date_from: string | false;
      date_to: string | false;
      name: string | false;
    }>;

    const total_tomado = leaves.reduce(
      (sum, l) => sum + Math.abs(l.number_of_days),
      0,
    );

    return res.status(200).json({
      success: true,
      employee: {
        id:        emp.id,
        name:      emp.name,
        job_title: emp.job_title || "",
        department: emp.department_id ? emp.department_id[1] : "",
      },
      assignments: allocations.map((a) => ({
        tipo:           a.holiday_status_id ? a.holiday_status_id[1] : "",
        dias_asignados: a.number_of_days,
        desde:          a.date_from || "",
        hasta:          a.date_to || "",
      })),
      leaves: leaves.map((l) => ({
        tipo:        l.holiday_status_id ? l.holiday_status_id[1] : "",
        dias_tomados: Math.abs(l.number_of_days),
        desde:       l.date_from || "",
        hasta:       l.date_to || "",
        descripcion: l.name || "",
      })),
      total_asignado,
      total_tomado,
      saldo_disponible: total_asignado - total_tomado,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return res.status(400).json({ success: false, error: message });
  }
}

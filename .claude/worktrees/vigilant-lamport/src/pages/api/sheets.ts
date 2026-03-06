import { google } from "googleapis";
import type { NextApiRequest, NextApiResponse } from "next";
import { SheetData, Transaction, MetricDetail, SourceRow } from "@/types/sheets";

// --- UTILITIES ---

const findRowsAndValuesByFilters = (
  rows: string[][],
  headers: string[],
  filters: Record<string, string | RegExp>,
  targetHeader: string,
): { values: number[]; sourceRows: SourceRow[] } => {
  const targetIdx = headers.indexOf(targetHeader);
  const conceptoIdx = headers.indexOf("Concepto");
  const proyectoIdx = headers.indexOf("Proyecto");
  
  if (targetIdx === -1) return { values: [0], sourceRows: [] };

  const matchedRows = rows.filter((row) => {
    return Object.entries(filters).every(([filterHeader, filterValue]) => {
      const colIdx = headers.indexOf(filterHeader);
      if (colIdx === -1) return true; 
      const cellValue = String(row[colIdx]).trim();
      
      if (filterValue instanceof RegExp) {
        return filterValue.test(cellValue);
      }
      return cellValue === filterValue;
    });
  });

  if (matchedRows.length === 0) return { values: [0], sourceRows: [] };
  
  const sourceRows: SourceRow[] = [];
  const values = matchedRows.map(row => {
    const cellValue = row[targetIdx];
    let val = 0;
    if (cellValue !== undefined && cellValue !== null && cellValue !== "") {
      val = parseFloat(String(cellValue).replace(/[^-0-9.]/g, "")) || 0;
    }
    
    // Create structured source row for the UI
    sourceRows.push({
      proyecto: proyectoIdx !== -1 ? String(row[proyectoIdx] || "").trim() : "Consolidado",
      concepto: conceptoIdx !== -1 ? String(row[conceptoIdx] || "").trim() : "N/A",
      valor: val
    });

    return val;
  });

  return { values, sourceRows };
};

const createCalculator = (dataRows: string[][], headers: string[], defaultTarget: string) => {
  return (formula: (get: (filters: Record<string, string | RegExp>, target?: string) => MetricDetail) => MetricDetail) => {
    const getter = (filters: Record<string, string | RegExp>, target?: string): MetricDetail => {
      const { values, sourceRows } = findRowsAndValuesByFilters(dataRows, headers, filters, target || defaultTarget);
      return {
        value: values.reduce((sum, v) => sum + v, 0),
        sourceRows: sourceRows
      };
    };
    return formula(getter);
  };
};

// --- HANDLER ---

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SheetData | { error: string; sheetExists?: boolean }>,
) {
  const { month, investor, project } = req.query;

  if (!month || typeof month !== "string") {
    return res.status(400).json({ error: "Month is required", sheetExists: false });
  }

  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const spreadsheetId = process.env.SPREADSHEET_ID;

  if (!email || !privateKey || !spreadsheetId) {
    const mockMetric = (val: number): MetricDetail => ({ 
      value: val, 
      sourceRows: [{ proyecto: "Mock Project", concepto: "Mock Concept", valor: val }] 
    });
    return res.status(200).json({
      income: 5000, expenses: 3000, items: [], sheetExists: true, 
      investors: ["Total", "Inversionista A"], 
      projects: ["Total", "Proyecto Solar 1"],
      projectMetrics: { 
        capex: mockMetric(150000), energyIncome: mockMetric(4500), 
        marketingCosts: mockMetric(800), monthlyUtility: mockMetric(3700), 
        roi: { value: 2.4, sourceRows: [] } 
      }
    });
  }

  try {
    const auth = new google.auth.JWT({
      email,
      key: privateKey.replace(/\\n/g, "\n"),
      scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
    });

    const sheets = google.sheets({ version: "v4", auth });
    const spreadsheet = await sheets.spreadsheets.get({ spreadsheetId, fields: "sheets.properties.title" });
    const sheetTitles = spreadsheet.data.sheets?.map((s) => s.properties?.title) || [];
    
    if (!sheetTitles.includes(month)) {
      return res.status(404).json({ error: `La hoja '${month}' no existe.`, sheetExists: false });
    }

    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: `${month}!A1:Z500`,
    });

    const allRows = (response.data.values as string[][]) || [];
    if (allRows.length === 0) {
      return res.status(200).json({ income: 0, expenses: 0, items: [], sheetExists: true, investors: [], projects: [] });
    }

    const headers = allRows[0].map((h) => String(h).trim());
    const dataRows = allRows.slice(1);

    const investorIdx = headers.indexOf("Inversionista");
    const projectIdx = headers.indexOf("Proyecto");

    const investors = investorIdx !== -1 
      ? Array.from(new Set(dataRows.map(r => String(r[investorIdx]).trim()).filter(Boolean)))
      : ["Total"];

    const currentInvestor = (investor as string) || "Total";
    const currentProject = (project as string) || "Total";

    const projects = projectIdx !== -1 
      ? Array.from(new Set(dataRows
          .filter(r => currentInvestor === "Total" || String(r[investorIdx]).trim() === currentInvestor)
          .map(r => String(r[projectIdx]).trim())
          .filter(Boolean)))
      : ["Total"];

    const compute = createCalculator(dataRows, headers, "Total");

    const baseFilter: Record<string, string> = {};
    if (currentInvestor !== "Total") baseFilter.Inversionista = currentInvestor;
    if (currentProject !== "Total") baseFilter.Proyecto = currentProject;

    const energyIncome = compute(get => {
      const ingresos = get({ ...baseFilter, Concepto: /^Ingreso/ });
      const despacho = get({ ...baseFilter, Concepto: "Despacho" });
      return {
        value: ingresos.value + despacho.value,
        sourceRows: [...ingresos.sourceRows, ...despacho.sourceRows]
      };
    });

    const marketingCosts = compute(get => get({ ...baseFilter, Concepto: "Costos de comercialización" }));
    const monthlyUtility = compute(get => get({ ...baseFilter, Concepto: "Utilidad del proyecto por mes" }));
    const capex = compute(get => get({ ...baseFilter, Concepto: "Inversion Inicial" }));
    const roi = compute(get => get({ ...baseFilter, Concepto: "% Rendimiento de la Inversion" }));

    const items: Transaction[] = dataRows
      .filter((row) => {
        const isTransaction = row[0] && row[1] && row[2];
        const matchesInvestor = currentInvestor === "Total" || String(row[investorIdx]).trim() === currentInvestor;
        const matchesProject = currentProject === "Total" || String(row[projectIdx]).trim() === currentProject;
        return isTransaction && matchesInvestor && matchesProject;
      })
      .map((row) => ({
        date: row[0] || "",
        category: row[1] || "",
        amount: parseFloat(String(row[2]).replace(/[^-0-9.]/g, "")) || 0,
      }));

    const income = items.reduce((sum, item) => (item.amount > 0 ? sum + item.amount : sum), 0);
    const expenses = items.reduce((sum, item) => (item.amount < 0 ? sum + Math.abs(item.amount) : sum), 0);

    return res.status(200).json({
      income,
      expenses,
      items,
      sheetExists: true,
      investors,
      projects,
      projectMetrics: {
        capex,
        energyIncome,
        marketingCosts,
        monthlyUtility,
        roi,
      },
    });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Error al conectar con Google Sheets.", sheetExists: false });
  }
}

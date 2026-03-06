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
  const inversionistaIdx = headers.indexOf("Inversionista");
  const consecutivoIdx = headers.indexOf("Consecutivo");

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
    const consecutivoRaw = consecutivoIdx !== -1 ? String(row[consecutivoIdx] || "").trim() : "";
    const isPdf = consecutivoRaw.toLowerCase().includes(".pdf") || consecutivoRaw.toLowerCase().includes("pdf");
    sourceRows.push({
      proyecto: proyectoIdx !== -1 ? String(row[proyectoIdx] || "").trim() : "Consolidado",
      concepto: conceptoIdx !== -1 ? String(row[conceptoIdx] || "").trim() : "N/A",
      inversionista: inversionistaIdx !== -1 ? String(row[inversionistaIdx] || "").trim() : undefined,
      soporte: isPdf ? consecutivoRaw : undefined,
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

// Bisection method to find monthly IRR, then annualize
const computeIRR = (capexValue: number, monthlyCashFlow: number, periods: number): number => {
  if (capexValue <= 0 || monthlyCashFlow <= 0) return 0;
  const npv = (r: number) =>
    Math.abs(r) < 1e-10
      ? -capexValue + monthlyCashFlow * periods
      : -capexValue + monthlyCashFlow * (1 - Math.pow(1 + r, -periods)) / r;

  let lo = -0.9999;
  let hi = 10.0;
  if (npv(lo) * npv(hi) > 0) return 0;
  for (let i = 0; i < 300; i++) {
    const mid = (lo + hi) / 2;
    if (npv(mid) > 0) lo = mid; else hi = mid;
    if (hi - lo < 1e-12) break;
  }
  const monthlyRate = (lo + hi) / 2;
  return (Math.pow(1 + monthlyRate, 384) - 1) * 100;
};

// --- HANDLER ---

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<SheetData | { error: string; sheetExists?: boolean }>,
) {
  const monthsParam = ((req.query.months || req.query.month) as string | undefined);
  const { investor, projects: projectsParam } = req.query;

  if (!monthsParam) {
    return res.status(400).json({ error: "Month is required", sheetExists: false });
  }

  const months = monthsParam.split(",").map((m) => m.trim()).filter(Boolean);
  if (months.length === 0) {
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
        roi: { value: 2.4, sourceRows: [] }, costs: mockMetric(0), tir: { value: 0.05, sourceRows: [] }
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

    const validMonths = months.filter((m) => sheetTitles.includes(m));
    if (validMonths.length === 0) {
      return res.status(404).json({ error: `La hoja '${months[0]}' no existe.`, sheetExists: false });
    }

    const currentInvestor = (investor as string) || "Total";
    const currentProjects = projectsParam
      ? (projectsParam as string).split(",").map((p) => p.trim()).filter(Boolean)
      : [];

    let allItems: Transaction[] = [];
    const allInvestorSet = new Set<string>();
    const allProjectSet = new Set<string>();
    let totalIncome = 0;
    let totalExpenses = 0;

    const aggEnergyIncome: MetricDetail = { value: 0, sourceRows: [] };
    const aggMarketingCosts: MetricDetail = { value: 0, sourceRows: [] };
    const aggCosts: MetricDetail = { value: 0, sourceRows: [] };

    for (const month of validMonths) {
      const response = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `${month}!A1:Z10000`,
      });

      const allRows = (response.data.values as string[][]) || [];
      if (allRows.length === 0) continue;

      const headers = allRows[0].map((h) => String(h).trim());
      const conceptoIdx = headers.indexOf("Concepto");
      const dataRows = allRows.slice(1).filter((row) =>
        conceptoIdx === -1 || String(row[conceptoIdx] || "").trim() !== "Valor a pagar"
      );

      const investorIdx = headers.indexOf("Inversionista");
      const projectIdx = headers.indexOf("Proyecto");

      if (investorIdx !== -1) {
        dataRows.forEach((r) => {
          const v = String(r[investorIdx]).trim();
          if (v) allInvestorSet.add(v);
        });
      }

      if (projectIdx !== -1) {
        dataRows
          .filter((r) => currentInvestor === "Total" || String(r[investorIdx]).trim() === currentInvestor)
          .forEach((r) => {
            const v = String(r[projectIdx]).trim();
            if (v) allProjectSet.add(v);
          });
      }

      const compute = createCalculator(dataRows, headers, "Total");
      const baseFilter: Record<string, string | RegExp> = {};
      if (currentInvestor !== "Total") baseFilter.Inversionista = currentInvestor;
      if (currentProjects.length === 1) {
        baseFilter.Proyecto = currentProjects[0];
      } else if (currentProjects.length > 1) {
        const escaped = currentProjects.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
        baseFilter.Proyecto = new RegExp(`^(${escaped.join("|")})$`);
      }

      const energyIncome = compute((get) => {
        const ingresos = get({ ...baseFilter, Concepto: /^Ingreso/ });
        const redistribucion = get({ ...baseFilter, Concepto: "Redistribución de ingresos de acuerdo al Protocolo" });
        const despacho = get({ ...baseFilter, Concepto: "Despacho" });
        const ventasBolsa = get({ ...baseFilter, Concepto: "Ventas en bolsa" });
        return {
          value: ingresos.value + redistribucion.value + despacho.value + ventasBolsa.value,
          sourceRows: [...ingresos.sourceRows, ...redistribucion.sourceRows, ...despacho.sourceRows, ...ventasBolsa.sourceRows],
        };
      });

      const marketingCosts = compute((get) => get({ ...baseFilter, Concepto: "Comercialización" }));
      const costs = compute((get) => get({ ...baseFilter, "Documento contable": "Costos" }));

      aggEnergyIncome.value += energyIncome.value;
      aggEnergyIncome.sourceRows.push(...energyIncome.sourceRows);
      aggMarketingCosts.value += marketingCosts.value;
      aggMarketingCosts.sourceRows.push(...marketingCosts.sourceRows);
      aggCosts.value += costs.value;
      aggCosts.sourceRows.push(...costs.sourceRows);

      const items: Transaction[] = dataRows
        .filter((row) => {
          const isTransaction = row[0] && row[1] && row[2];
          const matchesInvestor = currentInvestor === "Total" || String(row[investorIdx]).trim() === currentInvestor;
          const matchesProject = currentProjects.length === 0 || currentProjects.includes(String(row[projectIdx]).trim());
          return isTransaction && matchesInvestor && matchesProject;
        })
        .map((row) => ({
          date: row[0] || "",
          category: row[1] || "",
          amount: parseFloat(String(row[2]).replace(/[^-0-9.]/g, "")) || 0,
        }));

      totalIncome += items.reduce((sum, item) => (item.amount > 0 ? sum + item.amount : sum), 0);
      totalExpenses += items.reduce((sum, item) => (item.amount < 0 ? sum + Math.abs(item.amount) : sum), 0);
      allItems = allItems.concat(items);
    }

    const capex: MetricDetail = { value: 4300000000, sourceRows: [] };
    const monthlyUtility: MetricDetail = {
      value: aggEnergyIncome.value - aggMarketingCosts.value - aggCosts.value,
      sourceRows: [...aggEnergyIncome.sourceRows, ...aggMarketingCosts.sourceRows, ...aggCosts.sourceRows],
    };
    const roi: MetricDetail = {
      value: capex.value !== 0 ? ((monthlyUtility.value - capex.value) / capex.value) * 100 : 0,
      sourceRows: [...monthlyUtility.sourceRows],
    };
    const tir: MetricDetail = {
      value: computeIRR(capex.value, monthlyUtility.value, 360),
      sourceRows: [...capex.sourceRows, ...monthlyUtility.sourceRows],
    };

    const investors = allInvestorSet.size > 0 ? Array.from(allInvestorSet) : ["Total"];
    const projects = allProjectSet.size > 0 ? Array.from(allProjectSet) : ["Total"];

    return res.status(200).json({
      income: totalIncome,
      expenses: totalExpenses,
      items: allItems,
      sheetExists: true,
      investors,
      projects,
      projectMetrics: {
        capex,
        energyIncome: aggEnergyIncome,
        marketingCosts: aggMarketingCosts,
        monthlyUtility,
        roi,
        costs: aggCosts,
        tir,
      },
    });
  } catch (error: unknown) {
    console.error(error);
    return res.status(500).json({ error: "Error al conectar con Google Sheets.", sheetExists: false });
  }
}

export type Transaction = {
  date: string;
  category: string;
  amount: number;
  originalRow?: string[];
};

export type SourceRow = {
  proyecto: string;
  concepto: string;
  valor: number;
  inversionista?: string;
};

export type MetricDetail = {
  value: number;
  sourceRows: SourceRow[];
};

export interface ProjectMetrics {
  capex: MetricDetail;
  energyIncome: MetricDetail;
  marketingCosts: MetricDetail;
  monthlyUtility: MetricDetail;
  roi: MetricDetail;
  costs: MetricDetail;
  tir: MetricDetail;
}

export type SheetData = {
  income: number;
  expenses: number;
  items: Transaction[];
  sheetExists: boolean;
  investors: string[];
  projects: string[];
  projectMetrics?: ProjectMetrics;
};

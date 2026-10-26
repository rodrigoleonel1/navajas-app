import { api } from "./api";
import type { EarningsTotals } from "./earnings";

export type ReportIncomeBarber = EarningsTotals & {
  barberId: string;
  barberName: string;
};

export type ReportAbsenceBarber = {
  barberId: string;
  barberName: string;
  noShow: number;
  lateCancellations: number;
  total: number;
};

export type ReportAbsenceTotals = {
  noShow: number;
  lateCancellations: number;
  total: number;
};

export type ReportPopularRow = {
  label: string;
  count: number;
};

export type BusinessReport = {
  from: string;
  to: string;
  income: {
    totals: EarningsTotals;
    barbers: ReportIncomeBarber[];
  };
  absences: {
    totals: ReportAbsenceTotals;
    barbers: ReportAbsenceBarber[];
  };
  popular: {
    services: ReportPopularRow[];
    barbers: ReportPopularRow[];
    hours: ReportPopularRow[];
  };
};

export async function getBusinessReport(params: {
  from: string;
  to: string;
}): Promise<BusinessReport> {
  const res = await api.get<BusinessReport>("/reports", { params });
  return res.data;
}

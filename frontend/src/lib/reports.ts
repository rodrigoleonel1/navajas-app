import { api } from "./api";
import type { EarningsTotals } from "./earnings";

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

export type ReportRatingBarber = {
  barberId: string;
  barberName: string;
  average: number | null;
  count: number;
};

export type ReportRatingTotals = {
  average: number | null;
  count: number;
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
  };
  absences: {
    totals: ReportAbsenceTotals;
    barbers: ReportAbsenceBarber[];
  };
  ratings: ReportRatingTotals & {
    barbers: ReportRatingBarber[];
  };
  popular: {
    services: ReportPopularRow[];
    offers: ReportPopularRow[];
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

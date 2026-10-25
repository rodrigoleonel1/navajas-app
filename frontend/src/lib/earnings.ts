import { api } from "./api";

export type EarningsTotals = {
  completed: number;
  gross: number;
  commission: number;
  local: number;
};

export type EarningsDay = EarningsTotals & {
  date: string;
};

export type BarberEarnings = {
  from: string;
  to: string;
  totals: EarningsTotals;
  days: EarningsDay[];
};

export type DailyEarningsBarber = EarningsTotals & {
  barberId: string;
  barberName: string;
};

export type DailyEarnings = {
  date: string;
  barbers: DailyEarningsBarber[];
  totals: EarningsTotals;
};

export async function getMyEarnings(params: {
  from: string;
  to: string;
}): Promise<BarberEarnings> {
  const res = await api.get<BarberEarnings>("/barbers/me/earnings", {
    params,
  });
  return res.data;
}

export async function getDailyEarnings(date: string): Promise<DailyEarnings> {
  const res = await api.get<DailyEarnings>("/barbers/daily-earnings", {
    params: { date },
  });
  return res.data;
}

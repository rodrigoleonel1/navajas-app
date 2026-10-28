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

export type AdminEarningsBarber = EarningsTotals & {
  barberId: string;
  barberName: string;
};

export type AdminEarnings = {
  from: string;
  to: string;
  totals: EarningsTotals;
  days: EarningsDay[];
  barbers: AdminEarningsBarber[];
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

export async function getAdminEarnings(params: {
  from: string;
  to: string;
}): Promise<AdminEarnings> {
  const res = await api.get<AdminEarnings>("/barbers/earnings", { params });
  return res.data;
}

import { api } from "./api";

export type PenaltyStatus = {
  count: number;
  threshold: number;
  remaining: number;
  surchargePercent: number;
  windowMonths: number;
  willApply: boolean;
};

export async function getPenaltyStatus(): Promise<PenaltyStatus> {
  const res = await api.get<PenaltyStatus>("/penalties");
  return res.data;
}

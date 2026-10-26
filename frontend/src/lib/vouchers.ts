import { api } from "./api";

export type VoucherStatus = "active" | "used" | "expired";
export type VoucherSource = "admin_cancellation" | "fidelity";

export type Voucher = {
  id: string;
  source: VoucherSource;
  discountPercent: number;
  issuedAt: string;
  expiresAt: string;
  usedAt: string | null;
  status: VoucherStatus;
  sourceAppointmentId: string | null;
  usedAppointmentId: string | null;
};

export type VoucherConfig = {
  adminCancellationDays: number;
  fidelityDays: number;
};

export type FidelityProgress = {
  completed: number;
  target: number;
  inCycle: number;
  remaining: number;
  discountPercent: number;
};

export const VOUCHER_STATUS_LABELS: Record<VoucherStatus, string> = {
  active: "Vigente",
  used: "Usado",
  expired: "Vencido",
};

export const VOUCHER_STATUS_TONES: Record<
  VoucherStatus,
  "success" | "muted" | "danger"
> = {
  active: "success",
  used: "muted",
  expired: "danger",
};

export const VOUCHER_SOURCE_LABELS: Record<VoucherSource, string> = {
  admin_cancellation: "Cancelación del local",
  fidelity: "Fidelidad",
};

export async function listVouchers(): Promise<Voucher[]> {
  const res = await api.get<Voucher[]>("/vouchers");
  return res.data;
}

export async function getFidelityProgress(): Promise<FidelityProgress> {
  const res = await api.get<FidelityProgress>("/vouchers/fidelity");
  return res.data;
}

export async function getVoucherConfig(): Promise<VoucherConfig> {
  const res = await api.get<VoucherConfig>("/voucher-config");
  return res.data;
}

export async function updateVoucherConfig(input: {
  adminCancellationDays: number;
  fidelityDays: number;
}): Promise<VoucherConfig> {
  const res = await api.patch<VoucherConfig>("/voucher-config", input);
  return res.data;
}

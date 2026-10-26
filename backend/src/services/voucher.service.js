import { Appointment } from "../models/Appointment.js";
import { Voucher } from "../models/Voucher.js";
import { VoucherConfig } from "../models/VoucherConfig.js";
import { DAY_MS } from "../utils/businessTime.js";
import { createAppError } from "../utils/appError.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";

const CONFIG_KEY = "default";
export const ADMIN_CANCELLATION_DISCOUNT = 20;
export const DEFAULT_ADMIN_CANCELLATION_DAYS = 30;
// RN8: vale de fidelidad del 30% cada 10 turnos completados.
export const FIDELITY_DISCOUNT = 30;
export const FIDELITY_EVERY = 10;
export const DEFAULT_FIDELITY_DAYS = 30;

const STATUS_RANK = {
  active: 0,
  used: 1,
  expired: 2,
};

function toIdString(value) {
  if (!value) return null;
  return (value._id ?? value).toString();
}

function toVoucherConfigDTO(config) {
  return {
    adminCancellationDays:
      config?.admin_cancellation_days ?? DEFAULT_ADMIN_CANCELLATION_DAYS,
    fidelityDays: config?.fidelity_days ?? DEFAULT_FIDELITY_DAYS,
  };
}

function getVoucherStatus(voucher, now = new Date()) {
  if (voucher.used_at) return "used";
  if (new Date(voucher.expires_at).getTime() <= now.getTime()) {
    return "expired";
  }
  return "active";
}

function toVoucherDTO(voucher, now = new Date()) {
  return {
    id: voucher._id.toString(),
    source: voucher.source,
    discountPercent: voucher.discount_percent,
    issuedAt: new Date(voucher.issued_at).toISOString(),
    expiresAt: new Date(voucher.expires_at).toISOString(),
    usedAt: voucher.used_at ? new Date(voucher.used_at).toISOString() : null,
    status: getVoucherStatus(voucher, now),
    sourceAppointmentId: toIdString(voucher.source_appointment_id),
    usedAppointmentId: toIdString(voucher.used_appointment_id),
  };
}

// Lee la configuración vigente. Si todavía no existe, usa el default sin
// escribir: la creación/actualización se hace desde el panel admin.
async function readVoucherConfig({ session } = {}) {
  let query = VoucherConfig.findOne({ key: CONFIG_KEY }).lean();
  if (session) query = query.session(session);
  const config = await query;
  return (
    config ?? {
      admin_cancellation_days: DEFAULT_ADMIN_CANCELLATION_DAYS,
      fidelity_days: DEFAULT_FIDELITY_DAYS,
    }
  );
}

export async function getVoucherConfig() {
  const config = await readVoucherConfig();
  return toVoucherConfigDTO(config);
}

function parseDays(value, label) {
  const days = Number(value);
  if (!Number.isInteger(days) || days < 1 || days > 365) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      `La duración del vale ${label} debe ser un entero entre 1 y 365 días`,
    );
  }
  return days;
}

export async function updateVoucherConfig({
  adminCancellationDays,
  fidelityDays,
}) {
  const adminDays = parseDays(
    adminCancellationDays,
    "por cancelación del local",
  );
  const fidelity = parseDays(fidelityDays, "de fidelidad");

  const config = await VoucherConfig.findOneAndUpdate(
    { key: CONFIG_KEY },
    {
      $set: {
        admin_cancellation_days: adminDays,
        fidelity_days: fidelity,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
    },
  ).lean();

  return toVoucherConfigDTO(config);
}

// Emite el vale de RN7 dentro de la transacción de cancelación del admin.
// Es idempotente por turno de origen: si ya existe, devuelve el existente.
export async function issueAdminCancellationVoucher({
  appointment,
  session,
  now = new Date(),
}) {
  const config = await readVoucherConfig({ session });
  const expiresAt = new Date(
    now.getTime() + config.admin_cancellation_days * DAY_MS,
  );

  const voucher = await Voucher.findOneAndUpdate(
    {
      source_appointment_id: appointment._id,
      source: "admin_cancellation",
    },
    {
      $setOnInsert: {
        client_id: appointment.client_id,
        source: "admin_cancellation",
        source_appointment_id: appointment._id,
        discount_percent: ADMIN_CANCELLATION_DISCOUNT,
        issued_at: now,
        expires_at: expiresAt,
        used_at: null,
        used_appointment_id: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      session,
    },
  ).lean();

  return voucher;
}

// Emite el vale de RN8 cuando el cliente llega a un múltiplo de 10 turnos
// completados. Debe llamarse dentro de la transacción que completa el turno,
// para que el conteo incluya ese turno. Es idempotente por turno de origen.
export async function issueFidelityVoucherIfNeeded({
  appointment,
  session,
  now = new Date(),
}) {
  const completedCount = await Appointment.countDocuments({
    client_id: appointment.client_id,
    status: "completed",
  }).session(session);

  if (completedCount % FIDELITY_EVERY !== 0) return null;

  const config = await readVoucherConfig({ session });
  const expiresAt = new Date(now.getTime() + config.fidelity_days * DAY_MS);

  const voucher = await Voucher.findOneAndUpdate(
    {
      source_appointment_id: appointment._id,
      source: "fidelity",
    },
    {
      $setOnInsert: {
        client_id: appointment.client_id,
        source: "fidelity",
        source_appointment_id: appointment._id,
        discount_percent: FIDELITY_DISCOUNT,
        issued_at: now,
        expires_at: expiresAt,
        used_at: null,
        used_appointment_id: null,
      },
    },
    {
      upsert: true,
      returnDocument: "after",
      runValidators: true,
      setDefaultsOnInsert: true,
      session,
    },
  ).lean();

  return voucher;
}

// Progreso de fidelidad del cliente: turnos completados dentro del ciclo
// actual de 10 y cuántos faltan para el próximo vale.
export async function getFidelityProgress({ userId }) {
  const clientOid = toObjectIdOrThrow(userId, "ID de cliente inválido");
  const completed = await Appointment.countDocuments({
    client_id: clientOid,
    status: "completed",
  });

  const inCycle = completed % FIDELITY_EVERY;
  return {
    completed,
    target: FIDELITY_EVERY,
    inCycle,
    remaining: FIDELITY_EVERY - inCycle,
    discountPercent: FIDELITY_DISCOUNT,
  };
}

// Reserva atómicamente el próximo vale vigente del cliente. El orden por
// expires_at hace que se use primero el que está más cerca de vencer.
export async function claimActiveVoucherForBooking({
  clientId,
  session,
  now = new Date(),
}) {
  const clientOid = toObjectIdOrThrow(clientId, "ID de cliente inválido");

  return Voucher.findOneAndUpdate(
    {
      client_id: clientOid,
      used_at: null,
      expires_at: { $gt: now },
    },
    { $set: { used_at: now } },
    {
      sort: { expires_at: 1 },
      returnDocument: "after",
      session,
    },
  ).lean();
}

export async function attachVoucherToAppointment({
  voucherId,
  appointmentId,
  session,
}) {
  const voucherOid = toObjectIdOrThrow(voucherId, "ID de vale inválido");
  const appointmentOid = toObjectIdOrThrow(
    appointmentId,
    "ID de turno inválido",
  );

  const result = await Voucher.updateOne(
    {
      _id: voucherOid,
      used_at: { $ne: null },
      used_appointment_id: null,
    },
    { $set: { used_appointment_id: appointmentOid } },
    { session },
  );

  if (result.modifiedCount !== 1) {
    throw createAppError(
      409,
      "VOUCHER_UNAVAILABLE",
      "El vale ya no está disponible. Intentá reservar nuevamente.",
    );
  }
}

// Listado propio del cliente, con estado calculado al consultar (CA-12).
export async function listVouchers({ userId, now = new Date() }) {
  const clientOid = toObjectIdOrThrow(userId, "ID de cliente inválido");
  const vouchers = await Voucher.find({ client_id: clientOid }).lean();

  return vouchers
    .map((voucher) => toVoucherDTO(voucher, now))
    .sort((a, b) => {
      const byStatus = STATUS_RANK[a.status] - STATUS_RANK[b.status];
      if (byStatus !== 0) return byStatus;
      if (a.status === "active") {
        return new Date(a.expiresAt) - new Date(b.expiresAt);
      }
      return new Date(b.issuedAt) - new Date(a.issuedAt);
    });
}

import mongoose from "mongoose";
import { Appointment } from "../models/Appointment.js";
import { BookingLock } from "../models/BookingLock.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { createAppError } from "../utils/appError.js";
import {
  businessDayStartUtc,
  DAY_MS,
  dayKeyUTC,
  parseWorkHour,
  tzParts,
  utcDayStart,
} from "../utils/businessTime.js";
import {
  getCancellationPolicy,
  isNoShowEligible,
  twoMonthsAgo,
} from "../utils/cancellation.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";
import { loadHolidayKeys } from "./holiday.service.js";
import {
  createAppointmentNotifications,
  createStaffInAppNotifications,
  scheduleNotificationSend,
} from "./notification.service.js";
import { findMatchingOffer } from "./offer.service.js";
import {
  attachVoucherToAppointment,
  claimActiveVoucherForBooking,
  issueAdminCancellationVoucher,
  issueFidelityVoucherIfNeeded,
} from "./voucher.service.js";

const APPOINTMENT_FIELDS =
  "barber_id client_id service_ids start_at end_at status cancel_type extra price_snapshot voucher_id voucher_discount offer_id offer_discount duration_snapshot rating rated_at";

// Aviso interno que acompaña a cada evento del turno. La reserva se maneja
// aparte, en enqueueAppointmentConfirmation.
const STAFF_TYPES = {
  cancelacion_turno: "cancelacion_turno_staff",
  inasistencia_turno: "inasistencia_turno_staff",
};

// Un turno ocupa la agenda si está pendiente, si el cliente no se presentó
// o si canceló con menos de 4 h (cancel_type blocked).
function blockingAppointmentFilter(extra = {}) {
  return {
    ...extra,
    $or: [
      { status: "pending" },
      { status: "no_show" },
      { status: "cancelled", cancel_type: "blocked" },
    ],
  };
}

// RN5: al reservar se cuentan las inasistencias no usadas de los últimos
// 2 meses. Con 3 o más se aplica el recargo y se marcan como usadas.
async function applyPenaltyIfNeeded({ clientOid, basePrice, session, now }) {
  const cutoff = twoMonthsAgo(now);
  const noShows = await Appointment.find({
    client_id: clientOid,
    penalty_used: false,
    start_at: { $gte: cutoff },
    $or: [
      { status: "no_show" },
      { status: "cancelled", cancel_type: { $in: ["late", "blocked"] } },
    ],
  })
    .select("_id")
    .session(session)
    .lean();

  if (noShows.length < 3) {
    return { extra: 0, price: basePrice };
  }

  await Appointment.updateMany(
    { _id: { $in: noShows.map((item) => item._id) } },
    { $set: { penalty_used: true } },
    { session },
  );

  const extra = Math.round(basePrice * 0.2);
  return { extra, price: basePrice + extra };
}

// Parsea un ISO8601 UTC o tira 400 VALIDATION_ERROR si es inválido.
function parseISODate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw createAppError(400, "VALIDATION_ERROR", "Fecha inválida, use ISO8601 UTC");
  }
  return date;
}

// RN10: el turno debe caer dentro de la jornada del barbero y en un día
// que no sea franco, franco semanal ni feriado global. Todo en zona comercial.
// Devuelve el motivo del bloqueo o null si el día es laborable.
function getNonWorkingReason(parts, barberProfile, holidayKeys = new Set()) {
  if (holidayKeys.has(parts.dayKey)) {
    return "holiday";
  }
  const weeklyDaysOff = barberProfile?.weeklyDaysOff ?? [];
  if (weeklyDaysOff.includes(parts.weekday)) {
    return "weekly";
  }
  const daysOff = barberProfile?.daysOff ?? [];
  if (
    daysOff.some((dayOff) => dayKeyUTC(new Date(dayOff)) === parts.dayKey)
  ) {
    return "one-off";
  }
  return null;
}

function assertWithinBarberAvailability(
  start,
  end,
  barberProfile,
  holidayKeys = new Set(),
) {
  const workingHours = barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);

  const startParts = tzParts(start);
  const endParts = tzParts(end);
  if (startParts.dayKey !== endParts.dayKey) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno debe empezar y terminar el mismo día",
    );
  }

  if (startParts.minutes < open || endParts.minutes > close) {
    throw createAppError(
      400,
      "OUT_OF_WORKING_HOURS",
      "El turno está fuera de la jornada laboral del barbero",
    );
  }

  const nonWorkingReason = getNonWorkingReason(
    startParts,
    barberProfile,
    holidayKeys,
  );
  if (nonWorkingReason === "holiday") {
    throw createAppError(
      400,
      "HOLIDAY",
      "El negocio no trabaja ese día",
    );
  }
  if (nonWorkingReason) {
    throw createAppError(
      400,
      "BARBER_DAY_OFF",
      "El barbero no trabaja ese día",
    );
  }
}

// RN2: resuelve duración total y precio base desde los servicios elegidos.
async function resolveDurationAndPrice(serviceIds) {
  const serviceOids = serviceIds.map((id) =>
    toObjectIdOrThrow(id, "ID de servicio inválido"),
  );
  const services = await Service.find({
    _id: { $in: serviceOids },
    active: true,
  })
    .select("name duration price active")
    .lean();
  const servicesById = new Map(
    services.map((service) => [service._id.toString(), service]),
  );
  for (const id of serviceIds) {
    if (!servicesById.has(id)) {
      throw createAppError(
        404,
        "NOT_FOUND",
        "Servicio no encontrado o inactivo",
      );
    }
  }
  const duration = serviceIds.reduce(
    (total, id) => total + servicesById.get(id).duration,
    0,
  );
  const price = serviceIds.reduce(
    (total, id) => total + servicesById.get(id).price,
    0,
  );
  const orderedServices = serviceIds.map((id) => servicesById.get(id));
  return { serviceOids, services: orderedServices, duration, price };
}

async function getBarberOrThrow(barberId) {
  const barberOid = toObjectIdOrThrow(barberId, "ID de barbero inválido");
  const barber = await User.findById(barberOid)
    .select("role name email active barberProfile")
    .lean();
  if (!barber || barber.role !== "barber" || !barber.active) {
    throw createAppError(404, "NOT_FOUND", "Barbero no encontrado");
  }
  return { barber, barberOid };
}

function overlaps(candidateStart, candidateEnd, bookings) {
  return bookings.some(
    (booking) => candidateStart < booking.end && candidateEnd > booking.start,
  );
}

// Genera slots libres de un día (UTC) dentro de [open, close] con paso step.
function generateDaySlots({ dayStart, open, close, duration, step, bookings, now }) {
  const slots = [];
  for (
    let offset = open;
    offset + duration <= close;
    offset += step
  ) {
    const slotStart = new Date(dayStart.getTime() + offset * 60 * 1000);
    const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
    if (slotEnd <= now) continue;
    if (overlaps(slotStart, slotEnd, bookings)) continue;
    slots.push({
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
    });
  }
  return slots;
}

// Busca el próximo slot libre desde `from` (inclusive, redondeado al step)
// recorriendo el día actual y los siguientes hasta horizonDays.
function findNextAvailable({
  from,
  duration,
  barberProfile,
  holidayKeys = new Set(),
  bookings,
  step,
  horizonDays,
}) {
  const workingHours = barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);
  const now = new Date();

  const fromParts = tzParts(from);
  const baseDay = businessDayStartUtc(fromParts.dayKey);

  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayStart = new Date(baseDay.getTime() + dayOffset * DAY_MS);
    const dayParts = tzParts(dayStart);
    if (getNonWorkingReason(dayParts, barberProfile, holidayKeys)) continue;

    let startOffset = open;
    if (dayOffset === 0) {
      const fromMin =
        fromParts.dayKey === dayParts.dayKey ? fromParts.minutes : open;
      // Redondea hacia arriba al múltiplo de step desde open.
      startOffset = Math.max(
        open,
        open + Math.ceil((fromMin - open) / step) * step,
      );
    }

    for (
      let offset = startOffset;
      offset + duration <= close;
      offset += step
    ) {
      const slotStart = new Date(dayStart.getTime() + offset * 60 * 1000);
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);
      if (slotStart < from || slotEnd <= now) continue;
      const slotParts = tzParts(slotStart);
      const slotEndParts = tzParts(slotEnd);
      if (
        slotParts.dayKey !== slotEndParts.dayKey ||
        slotParts.dayKey !== dayParts.dayKey
      ) {
        continue;
      }
      if (overlaps(slotStart, slotEnd, bookings)) continue;
      return {
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
      };
    }
  }
  return null;
}

// YYYY-MM-DD nombra un día comercial; un datetime toma su día comercial.
function toBusinessDayKey(date) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (match) {
    const key = `${match[1]}-${match[2]}-${match[3]}`;
    const probe = new Date(`${key}T00:00:00Z`);
    if (
      Number.isNaN(probe.getTime()) ||
      probe.toISOString().slice(0, 10) !== key
    ) {
      throw createAppError(
        400,
        "VALIDATION_ERROR",
        "Fecha inválida, use YYYY-MM-DD o ISO8601 UTC",
      );
    }
    return key;
  }
  return tzParts(parseISODate(date)).dayKey;
}

function toAppointmentDTO(doc, { now = new Date() } = {}) {
  const barber =
    doc.barber_id && typeof doc.barber_id === "object"
      ? {
          id: doc.barber_id._id.toString(),
          name: doc.barber_id.name,
        }
      : { id: doc.barber_id.toString() };
  const client =
    doc.client_id && typeof doc.client_id === "object"
      ? {
          id: doc.client_id._id.toString(),
          name: doc.client_id.name,
        }
      : { id: doc.client_id.toString() };
  const services = Array.isArray(doc.service_ids)
    ? doc.service_ids.map((service) =>
        service && typeof service === "object"
          ? {
              id: service._id.toString(),
              name: service.name,
              price: service.price,
              duration: service.duration,
            }
          : { id: service.toString() },
      )
    : [];

  const cancelType =
    doc.status === "cancelled"
      ? doc.cancel_type ?? null
      : doc.status === "pending"
        ? getCancellationPolicy(doc.start_at, now)?.kind ?? null
        : null;

  const voucherId = doc.voucher_id
    ? (doc.voucher_id._id ?? doc.voucher_id).toString()
    : null;

  const offerId = doc.offer_id
    ? (doc.offer_id._id ?? doc.offer_id).toString()
    : null;
  const offer =
    doc.offer_id && typeof doc.offer_id === "object" && doc.offer_id.name
      ? {
          id: doc.offer_id._id.toString(),
          name: doc.offer_id.name,
          discountPercent: doc.offer_id.discount_percent,
        }
      : null;

  return {
    id: doc._id.toString(),
    barber,
    client,
    services,
    startAt: new Date(doc.start_at).toISOString(),
    endAt: new Date(doc.end_at).toISOString(),
    status: doc.status,
    cancelType,
    extra: doc.extra ?? 0,
    priceSnapshot: doc.price_snapshot,
    voucherId,
    voucherDiscount: doc.voucher_discount ?? 0,
    offerId,
    offer,
    offerDiscount: doc.offer_discount ?? 0,
    durationSnapshot: doc.duration_snapshot,
    // EP-7 / CA-21: la nota viaja en el turno para que admin y barbero la vean.
    rating: doc.rating ?? null,
    ratedAt: doc.rated_at ? new Date(doc.rated_at).toISOString() : null,
  };
}

// Destinatarios internos de un turno: el barbero asignado y todos los admins
// activos. Se excluye a quien hizo la acción para no auto-notificarse.
async function getStaffTargets({ barber, actorId }) {
  if (!barber || typeof barber !== "object") return [];

  const admins = await User.find({ role: "admin", active: { $ne: false } })
    .select("_id email")
    .lean();

  return [
    { id: barber._id, email: barber.email },
    ...admins.map((admin) => ({ id: admin._id, email: admin.email })),
  ].filter((user) => String(user.id) !== String(actorId ?? ""));
}

// Encola la confirmación por email + in-app (RN0) después de crear el turno.
// El envío no bloquea la respuesta: si falla, queda registrado en la
// notificación para poder reintentarlo más adelante.
async function enqueueAppointmentConfirmation({
  appointment,
  client,
  barber,
  services,
}) {
  const payload = {
    clientName: client.name,
    barberName: barber.name,
    services: services.map((service) => service.name),
    startAt: new Date(appointment.start_at).toISOString(),
    endAt: new Date(appointment.end_at).toISOString(),
    duration: appointment.duration_snapshot,
    price: appointment.price_snapshot,
    extra: appointment.extra ?? 0,
    voucherDiscount: appointment.voucher_discount ?? 0,
    offerDiscount: appointment.offer_discount ?? 0,
  };

  try {
    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type: "confirmacion_turno",
      payload,
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // Un fallo al encolar tampoco debe afectar la reserva.
    console.error(
      "[appointment] no se pudo crear la notificación",
      err?.code || "",
      err?.message || err,
    );
  }

  // Aviso interno para el barbero y los admins (solo in-app).
  try {
    const targets = await getStaffTargets({ barber });
    await createStaffInAppNotifications({
      appointmentId: appointment._id,
      targets,
      type: "nuevo_turno_staff",
      payload,
    });
  } catch (err) {
    console.error(
      "[appointment] no se pudo avisar al staff del turno nuevo",
      err?.code || "",
      err?.message || err,
    );
  }
}

// Encola el email de cancelación o inasistencia. El turno debe venir
// populado con client_id (name, email), barber_id (name, email) y
// service_ids (name).
async function enqueueStatusNotification({
  appointment,
  type,
  cancelType = null,
  cancelledByAdmin = false,
  actorId = null,
}) {
  const client = appointment.client_id;
  const payload = {
    clientName: client.name,
    barberName: appointment.barber_id?.name ?? "",
    services: (appointment.service_ids ?? [])
      .map((service) => service?.name)
      .filter(Boolean),
    startAt: new Date(appointment.start_at).toISOString(),
    endAt: new Date(appointment.end_at).toISOString(),
    price: appointment.price_snapshot,
    extra: appointment.extra ?? 0,
    voucherDiscount: appointment.voucher_discount ?? 0,
    cancelType,
    cancelledByAdmin,
  };

  try {
    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type,
      payload,
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // El cambio de estado ya quedó guardado; un fallo de email no lo revierte.
    console.error(
      "[appointment] no se pudo crear la notificación de estado",
      err?.code || "",
      err?.message || err,
    );
  }

  // Aviso interno para el barbero y los admins (solo in-app).
  const staffType = STAFF_TYPES[type];
  if (staffType) {
    try {
      const targets = await getStaffTargets({
        barber: appointment.barber_id,
        actorId,
      });
      await createStaffInAppNotifications({
        appointmentId: appointment._id,
        targets,
        type: staffType,
        payload,
      });
    } catch (err) {
      console.error(
        "[appointment] no se pudo avisar al staff del cambio de estado",
        err?.code || "",
        err?.message || err,
      );
    }
  }
}

// RN7/RN8: avisa al cliente que se le emitió un vale (cancelación del admin o
// fidelidad). El turno debe venir populado con client_id (name, email) y
// barber_id (name).
async function enqueueVoucherNotification({ appointment, voucher }) {
  if (!voucher) return;

  try {
    const client = appointment.client_id;
    const { email } = await createAppointmentNotifications({
      appointmentId: appointment._id,
      targetUser: { id: client._id, email: client.email },
      type: "vale_emitido",
      payload: {
        clientName: client.name,
        barberName: appointment.barber_id?.name ?? "",
        discountPercent: voucher.discount_percent,
        issuedAt: new Date(voucher.issued_at).toISOString(),
        expiresAt: new Date(voucher.expires_at).toISOString(),
        startAt: new Date(appointment.start_at).toISOString(),
        source: voucher.source,
      },
    });

    if (email) scheduleNotificationSend(email._id, "appointment");
  } catch (err) {
    // La cancelación y el vale ya quedaron guardados; el email es best-effort.
    console.error(
      "[appointment] no se pudo crear la notificación del vale",
      err?.code || "",
      err?.message || err,
    );
  }
}

// Arma el 409 con la sugerencia de próximo horario libre. Se usa después de
// que la transacción detecta el solapamiento, para no hacer queries extra
// mientras la transacción está abierta.
async function buildConflictError({ barberOid, start, duration, barberProfile }) {
  let suggestedStartAt;
  try {
    const horizonEnd = new Date(start.getTime() + 14 * DAY_MS);
    const startDay = utcDayStart(tzParts(start).dayKey);
    const [upcoming, holidayKeys] = await Promise.all([
      Appointment.find(
        blockingAppointmentFilter({
          barber_id: barberOid,
          start_at: { $lt: horizonEnd },
          end_at: { $gt: start },
        }),
      )
        .select("start_at end_at")
        .lean(),
      loadHolidayKeys({
        from: startDay,
        to: new Date(startDay.getTime() + 14 * DAY_MS),
      }),
    ]);
    const bookings = upcoming.map((booking) => ({
      start: new Date(booking.start_at),
      end: new Date(booking.end_at),
    }));
    const next = findNextAvailable({
      from: start,
      duration,
      barberProfile,
      holidayKeys,
      bookings,
      step: 30,
      horizonDays: 14,
    });
    suggestedStartAt = next?.startAt;
  } catch {
    suggestedStartAt = undefined;
  }

  return createAppError(
    409,
    "CONFLICT",
    "Horario no disponible para ese barbero",
    suggestedStartAt ? { suggestedStartAt } : undefined,
  );
}

export async function createAppointment({
  clientId,
  barberId,
  serviceIds,
  startAt,
}) {
  const clientOid = toObjectIdOrThrow(clientId, "ID de cliente inválido");
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Debe seleccionar al menos un servicio",
    );
  }

  const client = await User.findById(clientOid)
    .select("name email role active")
    .lean();
  if (!client || client.role !== "client" || client.active === false) {
    throw createAppError(404, "NOT_FOUND", "Cliente no encontrado");
  }

  const start = parseISODate(startAt);

  // RN2: duración total y precio base = suma de los servicios elegidos.
  const {
    serviceOids,
    services,
    duration,
    price: basePrice,
  } = await resolveDurationAndPrice(serviceIds);
  const end = new Date(start.getTime() + duration * 60 * 1000);

  const { barber, barberOid } = await getBarberOrThrow(barberId);

  // RN10: jornada + francos + feriados globales del negocio.
  const startDay = utcDayStart(tzParts(start).dayKey);
  const holidayKeys = await loadHolidayKeys({
    from: startDay,
    to: new Date(startDay.getTime() + DAY_MS),
  });
  assertWithinBarberAvailability(
    start,
    end,
    barber.barberProfile,
    holidayKeys,
  );

  const session = await mongoose.startSession();
  let created;
  try {
    const runTransaction = () =>
      session.withTransaction(async () => {
        // Lock por barbero: dos transacciones del mismo barbero no pueden
        // incrementar este documento a la vez. La que pierde se reintenta.
        await BookingLock.findOneAndUpdate(
          { barber_id: barberOid },
          { $inc: { version: 1 } },
          { upsert: true, session },
        );

        // RN1: la verificación definitiva va dentro de la transacción.
        const overlap = await Appointment.exists(
          blockingAppointmentFilter({
            barber_id: barberOid,
            start_at: { $lt: end },
            end_at: { $gt: start },
          }),
        ).session(session);

        if (overlap) {
          throw createAppError(
            409,
            "CONFLICT",
            "Horario no disponible para ese barbero",
          );
        }

        // RN5: si el cliente tiene 3 inasistencias recientes sin usar,
        // esta reserva lleva el recargo del 20%.
        const now = new Date();

        // RN11: si los servicios elegidos coinciden exactamente con una oferta
        // activa, el descuento se aplica sobre el precio base antes de RN5.
        const offer = await findMatchingOffer({ serviceOids, session });
        const offerDiscount = offer
          ? Math.round((basePrice * offer.discount_percent) / 100)
          : 0;
        const discountedBase = Math.max(basePrice - offerDiscount, 0);

        const penalty = await applyPenaltyIfNeeded({
          clientOid,
          basePrice: discountedBase,
          session,
          now,
        });

        // RN7: si el cliente tiene un vale vigente, se aplica uno solo sobre
        // el precio con recargo. El más próximo a vencer se usa primero.
        const voucher = await claimActiveVoucherForBooking({
          clientId: clientOid,
          session,
          now,
        });
        const voucherDiscount = voucher
          ? Math.round((penalty.price * voucher.discount_percent) / 100)
          : 0;
        const finalPrice = Math.max(penalty.price - voucherDiscount, 0);

        const docs = await Appointment.create(
          [
            {
              barber_id: barberOid,
              client_id: clientOid,
              service_ids: serviceOids,
              start_at: start,
              end_at: end,
              status: "pending",
              extra: penalty.extra,
              price_snapshot: finalPrice,
              voucher_id: voucher?._id ?? null,
              voucher_discount: voucherDiscount,
              offer_id: offer?._id ?? null,
              offer_discount: offerDiscount,
              duration_snapshot: duration,
            },
          ],
          { session },
        );
        created = docs[0];

        if (voucher) {
          await attachVoucherToAppointment({
            voucherId: voucher._id,
            appointmentId: created._id,
            session,
          });
        }
      });

    try {
      await runTransaction();
    } catch (err) {
      // Dos primeras reservas del mismo barbero pueden chocar al crear el
      // lock con upsert. Se reintenta una vez; el resto de errores sigue.
      if (
        err?.code === 11000 &&
        (err?.keyPattern?.barber_id || err?.keyValue?.barber_id)
      ) {
        await runTransaction();
      } else {
        throw err;
      }
    }
  } catch (err) {
    if (err?.statusCode === 409 && err?.code === "CONFLICT") {
      throw await buildConflictError({
        barberOid,
        start,
        duration,
        barberProfile: barber.barberProfile,
      });
    }
    throw err;
  } finally {
    await session.endSession();
  }

  const appointmentDTO = toAppointmentDTO(created.toObject());

  // RN0: confirmación por email. La reserva ya está confirmada; un fallo de
  // email no la afecta.
  await enqueueAppointmentConfirmation({
    appointment: created,
    client,
    barber,
    services,
  });

  return appointmentDTO;
}

export async function listAppointments({
  requester,
  barberId,
  date,
  status,
  limit,
  cursor,
  order,
  page,
}) {
  const filter = {};

  // Filtrado obligatorio por identidad (excepción: admin).
  if (requester.role === "client") {
    filter.client_id = toObjectIdOrThrow(
      requester.id,
      "ID de cliente inválido",
    );
  } else if (requester.role === "barber") {
    filter.barber_id = toObjectIdOrThrow(
      requester.id,
      "ID de barbero inválido",
    );
  } else if (barberId) {
    filter.barber_id = toObjectIdOrThrow(barberId, "ID de barbero inválido");
  }

  if (date) {
    const dayStart = businessDayStartUtc(toBusinessDayKey(date));
    filter.start_at = {
      $gte: dayStart,
      $lt: new Date(dayStart.getTime() + DAY_MS),
    };
  }

  if (status) {
    filter.status = status;
  }

  // Cursor excluyente sobre start_at (paginación). Se combina con el rango de
  // `date` si lo hay: el más restrictivo de los dos límites gana.
  if (cursor) {
    const cursorDate = new Date(cursor);
    const isDesc = order === "desc";
    const bound = { ...(filter.start_at ?? {}) };
    const key = isDesc ? "$lt" : "$gt";
    const previous = bound[key];
    bound[key] =
      previous instanceof Date
        ? new Date(
            isDesc
              ? Math.min(previous.getTime(), cursorDate.getTime())
              : Math.max(previous.getTime(), cursorDate.getTime()),
          )
        : cursorDate;
    filter.start_at = bound;
  }

  // Sin limit no hay tope: admin y barbero listan el día completo como siempre.
  // El total es del filtro completo (sin skip/limit) y solo se cuenta al paginar.
  const total = limit ? await Appointment.countDocuments(filter) : null;

  const query = Appointment.find(filter)
    .select(APPOINTMENT_FIELDS)
    .sort({ start_at: order === "desc" ? -1 : 1 })
    .populate("barber_id", "name")
    .populate("client_id", "name")
    .populate("service_ids", "name price duration")
    .populate("offer_id", "name discount_percent")
    .lean();

  if (limit) {
    query.limit(limit);
    if (page && page > 1) query.skip((page - 1) * limit);
  }

  const appointments = await query;

  return { appointments: appointments.map(toAppointmentDTO), total };
}

// El admin pasa un turno pendiente a completado o cancelado.
// La cancelación admin libera el horario, no cuenta inasistencia y emite el
// vale del 20% de RN7 dentro de la misma transacción.
export async function updateAppointmentStatus({ id, status, requester }) {
  if (!["completed", "cancelled"].includes(status)) {
    throw createAppError(400, "VALIDATION_ERROR", "Estado inválido");
  }
  const appointmentOid = toObjectIdOrThrow(id, "ID de turno inválido");

  const existing = await Appointment.findById(appointmentOid)
    .select("status")
    .lean();
  if (!existing) {
    throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
  }
  if (existing.status !== "pending") {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Solo se puede cambiar un turno pendiente",
    );
  }

  if (status === "completed") {
    let voucher = null;
    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        const updated = await Appointment.findOneAndUpdate(
          { _id: appointmentOid, status: "pending" },
          { $set: { status: "completed" } },
          { returnDocument: "after", session },
        );

        if (!updated) {
          throw createAppError(
            400,
            "VALIDATION_ERROR",
            "Solo se puede cambiar un turno pendiente",
          );
        }

        // RN8: al completar el 10°, 20°... turno se emite el vale de fidelidad.
        voucher = await issueFidelityVoucherIfNeeded({
          appointment: updated,
          session,
        });
      });
    } finally {
      await session.endSession();
    }

    const populated = await Appointment.findById(appointmentOid)
      .select(APPOINTMENT_FIELDS)
      .populate("barber_id", "name")
      .populate("client_id", "name email")
      .populate("service_ids", "name price duration")
      .populate("offer_id", "name discount_percent")
      .lean();

    if (!populated) {
      throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
    }

    await enqueueVoucherNotification({ appointment: populated, voucher });
    return toAppointmentDTO(populated);
  }

  let voucher = null;
  const session = await mongoose.startSession();
  try {
    await session.withTransaction(async () => {
      const cancelled = await Appointment.findOneAndUpdate(
        { _id: appointmentOid, status: "pending" },
        { $set: { status: "cancelled", cancel_type: "free" } },
        { returnDocument: "after", session },
      );

      if (!cancelled) {
        throw createAppError(
          400,
          "VALIDATION_ERROR",
          "Solo se puede cambiar un turno pendiente",
        );
      }

      voucher = await issueAdminCancellationVoucher({
        appointment: cancelled,
        session,
      });
    });
  } finally {
    await session.endSession();
  }

  const populated = await Appointment.findById(appointmentOid)
    .select(APPOINTMENT_FIELDS)
    .populate("barber_id", "name email")
    .populate("client_id", "name email")
    .populate("service_ids", "name price duration")
    .populate("offer_id", "name discount_percent")
    .lean();

  if (!populated) {
    throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
  }

  await enqueueStatusNotification({
    appointment: populated,
    type: "cancelacion_turno",
    cancelType: "free",
    cancelledByAdmin: true,
    actorId: requester?.id ?? null,
  });
  await enqueueVoucherNotification({ appointment: populated, voucher });

  return toAppointmentDTO(populated);
}

// RN3: cancelación del cliente. El backend decide la ventana y libera o no
// el horario según corresponda.
export async function cancelAppointment({ id, requester }) {
  const appointmentOid = toObjectIdOrThrow(id, "ID de turno inválido");
  const appointment = await Appointment.findById(appointmentOid)
    .select(APPOINTMENT_FIELDS)
    .populate("client_id", "name email")
    .populate("barber_id", "name email")
    .populate("service_ids", "name")
    .populate("offer_id", "name discount_percent")
    .lean();

  if (!appointment) {
    throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
  }

  const clientId =
    appointment.client_id?._id?.toString() ??
    appointment.client_id?.toString();
  if (requester.role === "client" && clientId !== requester.id) {
    throw createAppError(403, "FORBIDDEN", "No podés cancelar este turno");
  }
  if (appointment.status !== "pending") {
    throw createAppError(
      400,
      "APPOINTMENT_NOT_PENDING",
      "Solo se puede cancelar un turno pendiente",
    );
  }

  const now = new Date();
  const policy = getCancellationPolicy(appointment.start_at, now);
  if (!policy) {
    throw createAppError(
      400,
      "APPOINTMENT_ALREADY_STARTED",
      "El turno ya comenzó y no se puede cancelar",
    );
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: appointmentOid, status: "pending" },
    { $set: { status: "cancelled", cancel_type: policy.kind } },
    { returnDocument: "after" },
  )
    .select(APPOINTMENT_FIELDS)
    .populate("client_id", "name email")
    .populate("barber_id", "name email")
    .populate("service_ids", "name")
    .populate("offer_id", "name discount_percent")
    .lean();

  if (!updated) {
    throw createAppError(
      400,
      "APPOINTMENT_NOT_PENDING",
      "Solo se puede cancelar un turno pendiente",
    );
  }

  await enqueueStatusNotification({
    appointment: updated,
    type: "cancelacion_turno",
    cancelType: policy.kind,
    actorId: requester.id,
  });

  return toAppointmentDTO(updated, { now });
}

// RN4: el admin marca inasistencia después de la tolerancia de 15 minutos.
export async function markNoShow({ id, requester }) {
  const appointmentOid = toObjectIdOrThrow(id, "ID de turno inválido");
  const appointment = await Appointment.findById(appointmentOid)
    .select(APPOINTMENT_FIELDS)
    .lean();

  if (!appointment) {
    throw createAppError(404, "NOT_FOUND", "Turno no encontrado");
  }
  if (appointment.status !== "pending") {
    throw createAppError(
      400,
      "APPOINTMENT_NOT_PENDING",
      "Solo se puede marcar inasistencia en un turno pendiente",
    );
  }

  const now = new Date();
  if (!isNoShowEligible(appointment.start_at, now)) {
    throw createAppError(
      400,
      "NO_SHOW_TOO_EARLY",
      "Todavía no pasaron los 15 minutos de tolerancia",
    );
  }

  const updated = await Appointment.findOneAndUpdate(
    { _id: appointmentOid, status: "pending" },
    { $set: { status: "no_show" } },
    { returnDocument: "after" },
  )
    .select(APPOINTMENT_FIELDS)
    .populate("client_id", "name email")
    .populate("barber_id", "name email")
    .populate("service_ids", "name")
    .populate("offer_id", "name discount_percent")
    .lean();

  if (!updated) {
    throw createAppError(
      400,
      "APPOINTMENT_NOT_PENDING",
      "Solo se puede marcar inasistencia en un turno pendiente",
    );
  }

  await enqueueStatusNotification({
    appointment: updated,
    type: "inasistencia_turno",
    actorId: requester?.id ?? null,
  });

  return toAppointmentDTO(updated, { now });
}

export async function getAvailability({
  barberId,
  date,
  serviceIds,
  durationMinutes,
  step = 30,
  horizonDays = 14,
}) {
  const { barber, barberOid } = await getBarberOrThrow(barberId);

  let duration = durationMinutes;
  if (serviceIds?.length) {
    const resolved = await resolveDurationAndPrice(serviceIds);
    duration = resolved.duration;
  }
  if (!Number.isInteger(duration) || duration < 1) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Debe enviar serviceIds o durationMinutes",
    );
  }

  const requestedKey = toBusinessDayKey(date);
  const baseDay = businessDayStartUtc(requestedKey);
  const horizonEnd = new Date(baseDay.getTime() + horizonDays * DAY_MS);
  const holidayStart = utcDayStart(requestedKey);
  const holidayEnd = new Date(holidayStart.getTime() + horizonDays * DAY_MS);

  const [upcoming, holidayKeys] = await Promise.all([
    Appointment.find(
      blockingAppointmentFilter({
        barber_id: barberOid,
        start_at: { $lt: horizonEnd },
        end_at: { $gt: baseDay },
      }),
    )
      .select("start_at end_at")
      .lean(),
    loadHolidayKeys({ from: holidayStart, to: holidayEnd }),
  ]);
  const bookings = upcoming.map((booking) => ({
    start: new Date(booking.start_at),
    end: new Date(booking.end_at),
  }));

  const workingHours = barber.barberProfile?.workingHours ?? {};
  const open = parseWorkHour(workingHours.start, 9 * 60);
  const close = parseWorkHour(workingHours.end, 18 * 60);
  const now = new Date();

  let slots = [];
  if (
    !getNonWorkingReason(
      tzParts(baseDay),
      barber.barberProfile,
      holidayKeys,
    )
  ) {
    slots = generateDaySlots({
      dayStart: baseDay,
      open,
      close,
      duration,
      step,
      bookings,
      now,
    });
  }

  const nextAvailable = findNextAvailable({
    from: new Date(Math.max(baseDay.getTime(), now.getTime())),
    duration,
    barberProfile: barber.barberProfile,
    holidayKeys,
    bookings,
    step,
    horizonDays,
  });

  // Días no laborables del horizonte (francos + feriados globales) para que
  // el front deshabilite esos días sin pedir availability por día.
  const nonWorkingDays = [];
  for (let dayOffset = 0; dayOffset < horizonDays; dayOffset += 1) {
    const dayStart = new Date(baseDay.getTime() + dayOffset * DAY_MS);
    const dayParts = tzParts(dayStart);
    if (
      getNonWorkingReason(dayParts, barber.barberProfile, holidayKeys)
    ) {
      nonWorkingDays.push(dayParts.dayKey);
    }
  }

  return {
    barberId: barberOid.toString(),
    date: requestedKey,
    duration,
    workingHours: {
      start: workingHours.start ?? "09:00",
      end: workingHours.end ?? "18:00",
    },
    slots,
    nextAvailable,
    nonWorkingDays,
  };
}

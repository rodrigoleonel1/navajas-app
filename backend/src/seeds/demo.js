// Seed de datos para demostración: cuentas demo, turnos históricos y futuros,
// vales, notificaciones y ofertas vigentes. Es idempotente: solo borra y
// recrea los datos de los usuarios @demo.navajas.com, sin tocar los reales.
//
// Uso:
//   pnpm --prefix backend seed:demo
//
// Credenciales de las cuentas demo (todas): contra123
import mongoose from "mongoose";
import { connectDB } from "../db.js";
import { Appointment } from "../models/Appointment.js";
import { BookingLock } from "../models/BookingLock.js";
import { ClientBookingLock } from "../models/ClientBookingLock.js";
import { Holiday } from "../models/Holiday.js";
import { Notification } from "../models/Notification.js";
import { Offer } from "../models/Offer.js";
import { Service } from "../models/Service.js";
import { User } from "../models/User.js";
import { Voucher } from "../models/Voucher.js";
import {
  getNonWorkingReason,
  getWorkingBounds,
} from "../services/availability.service.js";
import { createHash } from "../utils/bcrypt.js";
import {
  businessDayStartUtc,
  dayKeyUTC,
  shiftDayKey,
  tzParts,
} from "../utils/businessTime.js";

const DEMO_PASSWORD = "contra123";
const DEMO_DOMAIN = "demo.navajas.com";
const PAST_DAYS = 60;
const FUTURE_DAYS = 14;
const MINUTE_MS = 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

const DEMO_BARBERS = [
  {
    slug: "nico",
    name: "Nico",
    workingHours: { start: "10:00", end: "21:00" },
    weeklyDaysOff: [0],
  },
  {
    slug: "tomi",
    name: "Tomi",
    workingHours: { start: "09:00", end: "20:00" },
    weeklyDaysOff: [0, 2],
  },
];

const DEMO_CLIENTS = [
  { slug: "bruno", name: "Bruno Sosa" },
  { slug: "camila", name: "Camila Duarte" },
  { slug: "lucas", name: "Lucas Ferreyra" },
  { slug: "mateo", name: "Mateo Giménez" },
  { slug: "valentina", name: "Valentina Ríos" },
];

const SERVICE_PLAN = [
  {
    name: "Corte clásico",
    description: "Fade, taper o tijera",
    duration: 60,
    price: 15000,
  },
  {
    name: "Corte + Barba",
    description: "Ritual completo",
    duration: 90,
    price: 20000,
  },
  {
    name: "Barba",
    description: "Perfilado y toalla caliente",
    duration: 20,
    price: 8000,
  },
  {
    name: "Afeitado a navaja",
    description: "Navaja y toalla caliente",
    duration: 30,
    price: 12000,
  },
  {
    name: "Color / Decoloración",
    description: "Color y decoloración",
    duration: 120,
    price: 45000,
  },
];

const RATINGS = [5, 5, 4, 5, 4, 3, 5, 4, 5];
const CANCEL_TYPES = ["free", "late", "blocked"];

const demoEmail = (slug) => `${slug}@${DEMO_DOMAIN}`;

function at(dayKey, minutes) {
  return new Date(businessDayStartUtc(dayKey).getTime() + minutes * MINUTE_MS);
}

function weekdayOf(dayKey) {
  return new Date(`${dayKey}T12:00:00-03:00`).getDay();
}

function overlapsAny(intervals, start, end) {
  return intervals.some((it) => start < it.end && end > it.start);
}

async function upsertUsers(password_hash) {
  const barbers = [];
  for (const spec of DEMO_BARBERS) {
    const user = await User.findOneAndUpdate(
      { email: demoEmail(spec.slug) },
      {
        $set: {
          email: demoEmail(spec.slug),
          password_hash,
          role: "barber",
          name: spec.name,
          active: true,
          barberProfile: {
            workingHours: spec.workingHours,
            daysOff: [],
            weeklyDaysOff: spec.weeklyDaysOff,
          },
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
    barbers.push(user.toObject());
  }

  const clients = [];
  for (const spec of DEMO_CLIENTS) {
    const user = await User.findOneAndUpdate(
      { email: demoEmail(spec.slug) },
      {
        $set: {
          email: demoEmail(spec.slug),
          password_hash,
          role: "client",
          name: spec.name,
          active: true,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
    clients.push(user.toObject());
  }

  return { barbers, clients };
}

async function upsertServices() {
  const byName = new Map();
  for (const spec of SERVICE_PLAN) {
    const service = await Service.findOneAndUpdate(
      { name: spec.name },
      {
        $set: {
          description: spec.description,
          duration: spec.duration,
          price: spec.price,
          active: true,
        },
      },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
    byName.set(spec.name, service.toObject());
  }
  return byName;
}

async function upsertOffers(services) {
  const now = new Date();
  const day = 24 * 60 * 60 * 1000;
  const offers = [
    {
      name: "Corte 25%",
      discount_percent: 25,
      service_ids: [services.get("Corte clásico")._id],
      valid_from: new Date(now.getTime() - 7 * day),
      valid_to: new Date(now.getTime() + 30 * day),
      active: true,
    },
    {
      name: "Combo clásico",
      discount_percent: 15,
      service_ids: [
        services.get("Corte clásico")._id,
        services.get("Barba")._id,
      ],
      valid_from: new Date(now.getTime() - 30 * day),
      valid_to: new Date(now.getTime() + 60 * day),
      active: true,
    },
    {
      name: "Semana del clásico",
      discount_percent: 10,
      service_ids: [services.get("Corte + Barba")._id],
      valid_from: new Date(now.getTime() - 40 * day),
      valid_to: new Date(now.getTime() - 10 * day),
      active: false,
    },
  ];

  for (const offer of offers) {
    await Offer.findOneAndUpdate(
      { name: offer.name },
      { $set: offer },
      {
        upsert: true,
        returnDocument: "after",
        setDefaultsOnInsert: true,
        runValidators: true,
      },
    );
  }
}

async function loadHolidayKeys() {
  const holidays = await Holiday.find().select("date").lean();
  return new Set(holidays.map((holiday) => dayKeyUTC(new Date(holiday.date))));
}

async function cleanupDemoData(userIds) {
  const demoAppointments = await Appointment.find({
    $or: [
      { client_id: { $in: userIds } },
      { barber_id: { $in: userIds } },
    ],
  })
    .select("_id")
    .lean();
  const appointmentIds = demoAppointments.map((appointment) => appointment._id);

  await Notification.deleteMany({
    $or: [
      { target_user_id: { $in: userIds } },
      { appointment_id: { $in: appointmentIds } },
    ],
  });
  await Voucher.deleteMany({
    $or: [
      { client_id: { $in: userIds } },
      { source_appointment_id: { $in: appointmentIds } },
    ],
  });
  await BookingLock.deleteMany({ barber_id: { $in: userIds } });
  await ClientBookingLock.deleteMany({ client_id: { $in: userIds } });
  await Appointment.deleteMany({ _id: { $in: appointmentIds } });

  return appointmentIds.length;
}

async function normalizeExistingData(realBarberIds) {
  const now = new Date();

  // 1. Jornada hasta 21:00 para que los turnos futuros que ya existían a las
  //    19:00–20:30 queden dentro del horario laboral.
  if (realBarberIds.length > 0) {
    await User.updateMany(
      { _id: { $in: realBarberIds } },
      {
        $set: {
          "barberProfile.workingHours.start": "09:00",
          "barberProfile.workingHours.end": "21:00",
        },
      },
    );
  }

  // 2. Pendientes vencidos: se cierran como completados para que no queden
  //    como deuda en la agenda.
  const stale = await Appointment.updateMany(
    { status: "pending", end_at: { $lt: now } },
    { $set: { status: "completed", rating: 4, rated_at: now } },
  );

  // 3. Feriado de prueba cargado con nombre raro.
  const holidays = await Holiday.deleteMany({ name: /papa León|Visita del papa/i });

  return {
    staleClosed: stale.modifiedCount ?? 0,
    holidaysRemoved: holidays.deletedCount ?? 0,
  };
}

async function loadBusyRegistry(appointments) {
  const byBarber = new Map();
  const byClient = new Map();

  function push(map, id, start, end) {
    const key = String(id);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push({ start, end });
  }

  for (const appointment of appointments) {
    push(byBarber, appointment.barber_id, appointment.start_at, appointment.end_at);
    push(byClient, appointment.client_id, appointment.start_at, appointment.end_at);
  }

  return { byBarber, byClient, push };
}

async function seedDemo() {
  const password_hash = await createHash(DEMO_PASSWORD);
  const { barbers: demoBarbers, clients: demoClients } =
    await upsertUsers(password_hash);
  const demoUserIds = [...demoBarbers, ...demoClients].map((user) => user._id);

  const removedAppointments = await cleanupDemoData(demoUserIds);

  const realBarbers = await User.find({
    role: "barber",
    email: { $not: /@demo\.navajas\.com$/i },
  }).lean();
  const normalized = await normalizeExistingData(
    realBarbers.map((barber) => barber._id),
  );

  const services = await upsertServices();
  await upsertOffers(services);
  const holidayKeys = await loadHolidayKeys();

  const allBarbers = [...realBarbers, ...demoBarbers];
  const existing = await Appointment.find()
    .select("barber_id client_id start_at end_at")
    .lean();
  const { byBarber, byClient, push } = await loadBusyRegistry(existing);

  function barberWorks(barber, dayKey, minutes, duration) {
    const profile = barber.barberProfile ?? {};
    const { open, close } = getWorkingBounds(profile);
    if (minutes < open || minutes + duration > close) return false;
    const start = at(dayKey, minutes);
    return !getNonWorkingReason(tzParts(start), profile, holidayKeys);
  }

  function canBook(barberId, clientId, start, end) {
    return (
      !overlapsAny(byBarber.get(String(barberId)) ?? [], start, end) &&
      !overlapsAny(byClient.get(String(clientId)) ?? [], start, end)
    );
  }

  const docs = [];
  const meta = [];

  function buildAppointment({
    barber,
    client,
    dayKey,
    minutes,
    service,
    status,
    cancelType,
    rating,
  }) {
    const start = at(dayKey, minutes);
    const end = new Date(start.getTime() + service.duration * MINUTE_MS);
    if (!barberWorks(barber, dayKey, minutes, service.duration)) return false;
    if (!canBook(barber._id, client._id, start, end)) return false;

    const doc = {
      barber_id: barber._id,
      client_id: client._id,
      service_ids: [service._id],
      start_at: start,
      end_at: end,
      status,
      price_snapshot: service.price,
      duration_snapshot: service.duration,
      extra: 0,
    };

    if (status === "cancelled") {
      doc.cancel_type = cancelType;
      doc.cancel_reason = null;
    } else if (status === "completed") {
      doc.rating = rating;
      doc.rated_at = new Date(end.getTime() + 3 * 60 * 60 * 1000);
    }

    docs.push(doc);
    meta.push({
      barberSlug: barber.email,
      barberName: barber.name,
      clientSlug: client.email,
      serviceName: service.name,
      status,
    });
    push(byBarber, barber._id, start, end);
    push(byClient, client._id, start, end);
    return true;
  }

  function tryCreate({ dayKey, minutes, service, client, status, cancelType, rating, barberOffset = 0 }) {
    for (let i = 0; i < allBarbers.length; i += 1) {
      const barber = allBarbers[(barberOffset + i) % allBarbers.length];
      if (
        buildAppointment({
          barber,
          client,
          dayKey,
          minutes,
          service,
          status: status ?? "completed",
          cancelType,
          rating,
        })
      ) {
        return true;
      }
    }
    return false;
  }

  const todayKey = tzParts(new Date()).dayKey;
  const allServices = [...services.values()];
  let index = 0;
  let brunoNoShows = 0;
  let cancelTypeIndex = 0;

  // Histórico: 60 días hacia atrás, 1 turno por día y 2 los viernes/sábados.
  for (let offset = -PAST_DAYS; offset <= -1; offset += 1) {
    const dayKey = shiftDayKey(todayKey, offset);
    const weekday = weekdayOf(dayKey);
    if (weekday === 0 || holidayKeys.has(dayKey)) continue;

    const times =
      weekday === 5 || weekday === 6 ? [11 * 60, 16 * 60] : [15 * 60];
    for (const minutes of times) {
      const service = allServices[index % allServices.length];
      const client = demoClients[index % demoClients.length];
      const isBruno = client.email === demoEmail("bruno");

      let status = "completed";
      let cancelType;
      let rating = RATINGS[index % RATINGS.length];
      let forceBrunoNoShow = false;

      if (isBruno && brunoNoShows < 3) {
        status = "no_show";
        forceBrunoNoShow = true;
      } else if (index % 13 === 4) {
        status = "cancelled";
        cancelType = CANCEL_TYPES[cancelTypeIndex % CANCEL_TYPES.length];
        cancelTypeIndex += 1;
      } else if (index % 11 === 6) {
        status = "no_show";
      }

      const created = tryCreate({
        dayKey,
        minutes,
        service,
        client,
        status,
        cancelType,
        rating,
        barberOffset: index,
      });
      if (created && forceBrunoNoShow) brunoNoShows += 1;
      index += 1;
    }
  }

  // Hoy: turnos pendientes en horarios futuros, dejando huecos para reservar.
  const now = new Date();
  const todayStart = businessDayStartUtc(todayKey);
  const nowMinutes = Math.floor(
    (now.getTime() - todayStart.getTime()) / MINUTE_MS,
  );
  const firstSlot = Math.max(9 * 60, Math.ceil((nowMinutes + 45) / 30) * 30);
  for (let i = 0; i < 6; i += 1) {
    const minutes = firstSlot + i * 60;
    const service = allServices[i % allServices.length];
    const client = demoClients[(i + 1) % demoClients.length];
    tryCreate({
      dayKey: todayKey,
      minutes,
      service,
      client,
      status: "pending",
      barberOffset: i,
    });
  }

  // Próximos 14 días: 3 pendientes por día (dos a la misma hora en barberos
  // distintos) para que se vea ocupación en paralelo.
  for (let offset = 1; offset <= FUTURE_DAYS; offset += 1) {
    const dayKey = shiftDayKey(todayKey, offset);
    const weekday = weekdayOf(dayKey);
    if (weekday === 0 || holidayKeys.has(dayKey)) continue;

    const plan = [
      { minutes: 11 * 60, service: allServices[(offset + 1) % allServices.length] },
      { minutes: 11 * 60, service: allServices[(offset + 3) % allServices.length] },
      { minutes: 16 * 60, service: allServices[offset % allServices.length] },
    ];
    plan.forEach((item, planIndex) => {
      const client = demoClients[(offset + planIndex) % demoClients.length];
      tryCreate({
        dayKey,
        minutes: item.minutes,
        service: item.service,
        client,
        status: "pending",
        barberOffset: offset + planIndex,
      });
    });
  }

  const inserted =
    docs.length > 0
      ? await Appointment.insertMany(docs, { ordered: false })
      : [];
  inserted.forEach((doc, i) => {
    meta[i].id = doc._id;
    meta[i].startAt = doc.start_at;
    meta[i].barberId = doc.barber_id;
  });

  // Vales: dos activos y uno usado para mostrar la pantalla de vales.
  const brunoCompleted = meta.filter(
    (item) =>
      item.clientSlug === demoEmail("bruno") && item.status === "completed",
  );
  const camilaCompleted = meta.filter(
    (item) =>
      item.clientSlug === demoEmail("camila") && item.status === "completed",
  );
  const nowDate = new Date();
  const days = (n) => new Date(nowDate.getTime() + n * DAY_MS);

  const vouchers = [];
  if (brunoCompleted[0]) {
    vouchers.push({
      client_id: demoClients.find((c) => c.email === demoEmail("bruno"))._id,
      source: "admin_cancellation",
      source_appointment_id: brunoCompleted[0].id,
      discount_percent: 20,
      issued_at: days(-3),
      expires_at: days(30),
      used_at: null,
      used_appointment_id: null,
    });
  }
  if (brunoCompleted[1]) {
    vouchers.push({
      client_id: demoClients.find((c) => c.email === demoEmail("bruno"))._id,
      source: "fidelity",
      source_appointment_id: brunoCompleted[1].id,
      discount_percent: 30,
      issued_at: days(-1),
      expires_at: days(45),
      used_at: null,
      used_appointment_id: null,
    });
  }
  if (camilaCompleted[0]) {
    vouchers.push({
      client_id: demoClients.find((c) => c.email === demoEmail("camila"))._id,
      source: "admin_cancellation",
      source_appointment_id: camilaCompleted[0].id,
      discount_percent: 20,
      issued_at: days(-20),
      expires_at: days(10),
      used_at: days(-8),
      used_appointment_id: camilaCompleted[1]?.id ?? null,
    });
  }
  if (vouchers.length > 0) await Voucher.insertMany(vouchers, { ordered: false });

  // Notificaciones in-app para el cliente principal (Bruno): 3 sin leer y 3
  // leídas, para que la campanita tenga contenido.
  const bruno = demoClients.find((c) => c.email === demoEmail("bruno"));
  const brunoUpcoming = meta.filter(
    (item) => item.clientSlug === demoEmail("bruno") && item.status === "pending",
  );
  const brunoHistory = meta.filter(
    (item) => item.clientSlug === demoEmail("bruno") && item.status === "completed",
  );

  const notifications = [];
  brunoUpcoming.slice(0, 3).forEach((item) => {
    notifications.push({
      appointment_id: item.id,
      target_user_id: bruno._id,
      target_email: bruno.email,
      channel: "in_app",
      type: "confirmacion_turno",
      status: "sent",
      payload: {
        startAt: item.startAt,
        barberName: item.barberName,
        services: [item.serviceName],
      },
      read_at: null,
    });
  });
  brunoHistory.slice(0, 3).forEach((item) => {
    notifications.push({
      appointment_id: item.id,
      target_user_id: bruno._id,
      target_email: bruno.email,
      channel: "in_app",
      type: "turno_completado",
      status: "sent",
      payload: {
        startAt: item.startAt,
        barberName: item.barberName,
        services: [item.serviceName],
      },
      read_at: days(-1),
    });
  });
  if (notifications.length > 0) {
    await Notification.insertMany(notifications, { ordered: false });
  }

  const counts = {
    barbers: demoBarbers.length,
    clients: demoClients.length,
    appointmentsCreated: inserted.length,
    past: meta.filter((item) => item.status !== "pending").length,
    upcoming: meta.filter((item) => item.status === "pending").length,
    vouchers: vouchers.length,
    notifications: notifications.length,
  };

  console.log("[demo] datos listos");
  console.log(
    `[demo] cuentas: ${counts.barbers} barberos + ${counts.clients} clientes (clave: ${DEMO_PASSWORD})`,
  );
  console.log(
    `[demo] turnos: ${counts.appointmentsCreated} (${counts.past} históricos, ${counts.upcoming} pendientes)`,
  );
  console.log(
    `[demo] vales: ${counts.vouchers} · notificaciones: ${counts.notifications}`,
  );
  console.log(
    `[demo] limpieza: ${removedAppointments} turnos demo previos, ${normalized.staleClosed} pendientes vencidos cerrados, ${normalized.holidaysRemoved} feriados de prueba`,
  );
  console.log("[demo] logins:");
  console.log(`  barbero: ${demoEmail("nico")} / ${DEMO_PASSWORD}`);
  console.log(`  cliente: ${demoEmail("bruno")} / ${DEMO_PASSWORD}`);
  console.log(`  admin:   admin@navajas.com (sin cambios)`);
}

export async function runDemoSeed() {
  try {
    await connectDB();
    await seedDemo();
  } finally {
    if (mongoose.connection.readyState === 1) await mongoose.disconnect();
  }
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("seeds/demo.js")) {
  runDemoSeed().catch((err) => {
    console.error("[demo] error", err);
    process.exit(1);
  });
}

import { Appointment } from "../models/Appointment.js";
import { Service } from "../models/Service.js";
import { createAppError } from "../utils/appError.js";
import { assertObjectId } from "../utils/objectId.js";

// Estados que representan demanda real (mismo criterio que Reportes): los
// turnos cancelados no cuentan porque liberaron la agenda.
const REQUESTED_STATUSES = ["pending", "completed", "no_show"];

function toServiceDTO(doc) {
  return {
    id: doc._id.toString(),
    name: doc.name,
    duration: doc.duration,
    price: doc.price,
    active: doc.active,
  };
}

export async function listServices({ includeInactive = false } = {}) {
  const services = await Service.find(includeInactive ? {} : { active: true })
    .select("name duration price active")
    .sort({ name: 1 })
    .lean();
  return services.map(toServiceDTO);
}

// Servicios activos ordenados por cantidad de turnos históricos. Lo usa la
// landing pública para mostrar los más pedidos.
export async function listPopularServices({ limit = 3 } = {}) {
  const counts = await Appointment.aggregate([
    { $match: { status: { $in: REQUESTED_STATUSES } } },
    { $unwind: "$service_ids" },
    { $group: { _id: "$service_ids", count: { $sum: 1 } } },
  ]);
  const countByServiceId = new Map(
    counts.map((row) => [row._id.toString(), row.count]),
  );

  const services = await Service.find({ active: true })
    .select("name duration price active")
    .lean();

  return services
    .map((service) => ({
      service,
      count: countByServiceId.get(service._id.toString()) ?? 0,
    }))
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.service.name.localeCompare(b.service.name, "es"),
    )
    .slice(0, limit)
    .map(({ service }) => toServiceDTO(service));
}

export async function getServiceById(id) {
  assertObjectId(id, "ID de servicio inválido");

  const service = await Service.findById(id)
    .select("name duration price active")
    .lean();
  if (!service) {
    throw createAppError(404, "NOT_FOUND", "Servicio no encontrado");
  }

  return toServiceDTO(service);
}

export async function createService({ name, duration, price }) {
  const normalizedName = name.trim();
  if (!normalizedName) {
    throw createAppError(400, "VALIDATION_ERROR", "Nombre requerido");
  }

  const service = await Service.create({
    name: normalizedName,
    duration,
    price,
    active: true,
  });

  return toServiceDTO(service.toObject());
}

export async function updateService(id, patch) {
  assertObjectId(id, "ID de servicio inválido");

  const update = {};
  if (patch.name !== undefined) {
    const normalizedName = patch.name.trim();
    if (!normalizedName) {
      throw createAppError(400, "VALIDATION_ERROR", "Nombre requerido");
    }
    update.name = normalizedName;
  }
  if (patch.duration !== undefined) update.duration = patch.duration;
  if (patch.price !== undefined) update.price = patch.price;
  if (patch.active !== undefined) update.active = patch.active;

  const service = await Service.findByIdAndUpdate(id, update, {
    returnDocument: "after",
    runValidators: true,
  })
    .select("name duration price active")
    .lean();

  if (!service) {
    throw createAppError(404, "NOT_FOUND", "Servicio no encontrado");
  }

  return toServiceDTO(service);
}

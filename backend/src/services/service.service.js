import mongoose from "mongoose";
import { createAppError } from "../utils/appError.js";
import { Service } from "../models/Service.js";

function assertObjectId(id) {
  if (!mongoose.isValidObjectId(id)) {
    throw createAppError(400, "INVALID_ID", "ID de servicio inválido");
  }
}

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

export async function getServiceById(id) {
  assertObjectId(id);

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
  assertObjectId(id);

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
    new: true,
    runValidators: true,
  })
    .select("name duration price active")
    .lean();

  if (!service) {
    throw createAppError(404, "NOT_FOUND", "Servicio no encontrado");
  }

  return toServiceDTO(service);
}

export async function deactivateService(id) {
  assertObjectId(id);

  const service = await Service.findByIdAndUpdate(
    id,
    { active: false },
    { new: true },
  )
    .select("name duration price active")
    .lean();

  if (!service) {
    throw createAppError(404, "NOT_FOUND", "Servicio no encontrado");
  }

  return toServiceDTO(service);
}

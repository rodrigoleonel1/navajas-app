import { createAppError } from "../utils/appError.js";
import {
  createService as createServiceFn,
  deactivateService as deactivateServiceFn,
  getServiceById as getServiceByIdFn,
  listServices as listServicesFn,
  updateService as updateServiceFn,
} from "../services/service.service.js";

export async function listServices(req, res, next) {
  try {
    // ?all=1 incluye inactivos, solo admin. Sin flag: solo activos (público).
    const includeInactive = req.query.all === "1";
    if (includeInactive && req.user?.role !== "admin") {
      throw createAppError(
        req.user ? 403 : 401,
        req.user ? "FORBIDDEN" : "UNAUTHORIZED",
        req.user ? "Permisos insuficientes" : "Autenticación requerida",
      );
    }
    const services = await listServicesFn({ includeInactive });
    res.json(services);
  } catch (err) {
    next(err);
  }
}

export async function createService(req, res, next) {
  try {
    const service = await createServiceFn(req.body);
    res.status(201).json(service);
  } catch (err) {
    next(err);
  }
}

export async function getServiceById(req, res, next) {
  try {
    const service = await getServiceByIdFn(req.params.id);
    res.json(service);
  } catch (err) {
    next(err);
  }
}

export async function updateService(req, res, next) {
  try {
    const service = await updateServiceFn(req.params.id, req.body);
    res.json(service);
  } catch (err) {
    next(err);
  }
}

export async function removeService(req, res, next) {
  try {
    const service = await deactivateServiceFn(req.params.id);
    res.json(service);
  } catch (err) {
    next(err);
  }
}

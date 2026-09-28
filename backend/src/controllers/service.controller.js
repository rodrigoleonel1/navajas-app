import {
  createService as createServiceFn,
  deactivateService as deactivateServiceFn,
  listServices as listServicesFn,
  updateService as updateServiceFn,
} from "../services/service.service.js";

export async function listServices(req, res, next) {
  try {
    const services = await listServicesFn();
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

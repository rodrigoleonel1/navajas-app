import {
  createBarber as createBarberService,
  getBarberById as getBarberByIdService,
  listBarbers as listBarbersService,
  updateBarberProfile as updateBarberProfileService,
} from "../services/barber.service.js";
import { createAppError } from "../utils/appError.js";

export async function createBarber(req, res, next) {
  try {
    const barber = await createBarberService(req.body);
    res.status(201).json({ user: barber });
  } catch (err) {
    next(err);
  }
}

export async function listBarbers(req, res, next) {
  try {
    // ?all=1 incluye inactivos, solo admin. Sin flag: solo activos (público).
    const includeInactive = req.query.all === "1";
    if (includeInactive && req.user?.role !== "admin") {
      throw createAppError(
        req.user ? 403 : 401,
        req.user ? "FORBIDDEN" : "UNAUTHORIZED",
        req.user ? "Permisos insuficientes." : "Autenticación requerida.",
      );
    }
    const barbers = await listBarbersService({
      includeInactive,
      // EP-7: el promedio es interno; el cliente no lo recibe en la reserva.
      includeRating: req.user?.role === "admin",
    });
    res.json(barbers);
  } catch (err) {
    next(err);
  }
}

export async function getBarberById(req, res, next) {
  try {
    const barber = await getBarberByIdService(req.params.id);
    res.json(barber);
  } catch (err) {
    next(err);
  }
}

export async function updateBarberProfile(req, res, next) {
  try {
    const barber = await updateBarberProfileService(req.params.id, req.body);
    res.json(barber);
  } catch (err) {
    next(err);
  }
}

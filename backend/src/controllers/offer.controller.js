import {
  createOffer as createOfferService,
  listOffers as listOffersService,
  updateOffer as updateOfferService,
} from "../services/offer.service.js";
import { createAppError } from "../utils/appError.js";

export async function listOffers(req, res, next) {
  try {
    // ?all=1 incluye inactivas, solo admin. Sin flag: solo activas.
    const includeInactive = req.query.all === "1";
    if (includeInactive && req.user?.role !== "admin") {
      throw createAppError(
        req.user ? 403 : 401,
        req.user ? "FORBIDDEN" : "UNAUTHORIZED",
        req.user ? "Permisos insuficientes" : "Autenticación requerida",
      );
    }
    const offers = await listOffersService({ includeInactive });
    res.json(offers);
  } catch (err) {
    next(err);
  }
}

export async function createOffer(req, res, next) {
  try {
    const offer = await createOfferService(req.body);
    res.status(201).json(offer);
  } catch (err) {
    next(err);
  }
}

export async function updateOffer(req, res, next) {
  try {
    const offer = await updateOfferService(req.params.id, req.body);
    res.json(offer);
  } catch (err) {
    next(err);
  }
}

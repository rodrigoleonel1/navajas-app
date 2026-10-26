import { Offer } from "../models/Offer.js";
import { Service } from "../models/Service.js";
import { createAppError } from "../utils/appError.js";
import { toObjectIdOrThrow } from "../utils/objectId.js";

const SERVICE_POPULATE = "name price duration active";

function toDayKey(date) {
  if (!date) return null;
  return new Date(date).toISOString().slice(0, 10);
}

function toOfferDTO(doc) {
  const populated = (doc.service_ids ?? []).filter(
    (service) => service && typeof service === "object" && service.name,
  );
  const services = populated
    .map((service) => ({
      id: service._id.toString(),
      name: service.name,
      price: service.price,
      duration: service.duration,
      active: service.active,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));

  return {
    id: doc._id.toString(),
    name: doc.name,
    serviceIds: (doc.service_ids ?? []).map((service) =>
      (service._id ?? service).toString(),
    ),
    services,
    discountPercent: doc.discount_percent,
    validFrom: toDayKey(doc.valid_from),
    validTo: toDayKey(doc.valid_to),
    active: doc.active,
  };
}

// Fecha calendario YYYY-MM-DD normalizada a UTC 00:00, igual que los feriados.
function parseOfferDate(value, label) {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const key = String(value);
  const date = new Date(`${key}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== key) {
    throw createAppError(400, "VALIDATION_ERROR", `Fecha ${label} inválida`);
  }
  return date;
}

function assertDateOrder(validFrom, validTo) {
  if (validFrom && validTo && validTo < validFrom) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "La fecha de fin no puede ser anterior a la de inicio",
    );
  }
}

function parseDiscount(value) {
  const discount = Number(value);
  if (!Number.isInteger(discount) || discount < 1 || discount > 100) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "El descuento debe ser un entero entre 1 y 100",
    );
  }
  return discount;
}

function parseName(value) {
  const name = String(value ?? "").trim();
  if (name.length < 2 || name.length > 50) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "El nombre debe tener entre 2 y 50 caracteres",
    );
  }
  return name;
}

// Valida que los servicios existan, estén activos y no se repitan. Los deja
// ordenados por _id para que la coincidencia exacta al reservar sea estable.
async function normalizeServiceIds(serviceIds) {
  if (!Array.isArray(serviceIds) || serviceIds.length === 0) {
    throw createAppError(
      400,
      "VALIDATION_ERROR",
      "Debe seleccionar al menos un servicio",
    );
  }

  const uniqueIds = [
    ...new Set(
      serviceIds.map((id) =>
        toObjectIdOrThrow(id, "ID de servicio inválido").toString(),
      ),
    ),
  ];
  const ordered = uniqueIds
    .sort()
    .map((id) => toObjectIdOrThrow(id, "ID de servicio inválido"));

  const found = await Service.find({
    _id: { $in: ordered },
    active: true,
  })
    .select("_id")
    .lean();

  if (found.length !== ordered.length) {
    throw createAppError(
      404,
      "NOT_FOUND",
      "Servicio no encontrado o inactivo",
    );
  }

  return ordered;
}

export async function listOffers({ includeInactive = false } = {}) {
  const offers = await Offer.find(includeInactive ? {} : { active: true })
    .sort({ active: -1, name: 1 })
    .populate("service_ids", SERVICE_POPULATE)
    .lean();

  return offers.map(toOfferDTO);
}

export async function createOffer({
  name,
  serviceIds,
  discountPercent,
  validFrom,
  validTo,
  active,
}) {
  const normalizedServices = await normalizeServiceIds(serviceIds);
  const from = parseOfferDate(validFrom, "de inicio");
  const to = parseOfferDate(validTo, "de fin");
  assertDateOrder(from, to);

  const offer = await Offer.create({
    name: parseName(name),
    service_ids: normalizedServices,
    discount_percent: parseDiscount(discountPercent),
    valid_from: from ?? null,
    valid_to: to ?? null,
    active: active ?? true,
  });

  const populated = await Offer.findById(offer._id)
    .populate("service_ids", SERVICE_POPULATE)
    .lean();

  return toOfferDTO(populated);
}

export async function updateOffer(id, patch) {
  const offerOid = toObjectIdOrThrow(id, "ID de oferta inválido");
  const existing = await Offer.findById(offerOid).lean();
  if (!existing) {
    throw createAppError(404, "NOT_FOUND", "Oferta no encontrada");
  }

  const update = {};

  if (patch.name !== undefined) update.name = parseName(patch.name);
  if (patch.serviceIds !== undefined) {
    update.service_ids = await normalizeServiceIds(patch.serviceIds);
  }
  if (patch.discountPercent !== undefined) {
    update.discount_percent = parseDiscount(patch.discountPercent);
  }

  const from =
    patch.validFrom !== undefined
      ? parseOfferDate(patch.validFrom, "de inicio")
      : existing.valid_from;
  const to =
    patch.validTo !== undefined
      ? parseOfferDate(patch.validTo, "de fin")
      : existing.valid_to;

  if (patch.validFrom !== undefined) update.valid_from = from ?? null;
  if (patch.validTo !== undefined) update.valid_to = to ?? null;
  assertDateOrder(from, to);

  if (patch.active !== undefined) update.active = patch.active;

  const offer = await Offer.findByIdAndUpdate(offerOid, update, {
    returnDocument: "after",
    runValidators: true,
  })
    .populate("service_ids", SERVICE_POPULATE)
    .lean();

  if (!offer) {
    throw createAppError(404, "NOT_FOUND", "Oferta no encontrada");
  }

  return toOfferDTO(offer);
}

// Busca una oferta activa cuyo conjunto de servicios coincida exactamente con
// el de la reserva. Si hubiera más de una, gana la de mayor descuento. Se usa
// dentro de la transacción de createAppointment.
export async function findMatchingOffer({ serviceOids, session } = {}) {
  if (!Array.isArray(serviceOids) || serviceOids.length === 0) return null;

  const ordered = [...serviceOids].sort((a, b) => {
    const left = a.toString();
    const right = b.toString();
    if (left === right) return 0;
    return left < right ? -1 : 1;
  });

  let query = Offer.findOne({
    active: true,
    service_ids: ordered,
  }).sort({ discount_percent: -1, updated_at: -1 });

  if (session) query = query.session(session);

  return query.lean();
}

import mongoose from "mongoose";
import { createAppError } from "./appError.js";

// Valida el id y devuelve un ObjectId listo para usar en queries.
export function toObjectIdOrThrow(id, message = "ID inválido") {
  if (!mongoose.isValidObjectId(id)) {
    throw createAppError(400, "INVALID_ID", message);
  }
  return new mongoose.Types.ObjectId(id);
}

// Variante para lugares donde solo se valida (el ObjectId no se usa).
export function assertObjectId(id, message = "ID inválido") {
  toObjectIdOrThrow(id, message);
}

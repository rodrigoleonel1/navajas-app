import { Router } from "express";
import {
  createBarber,
  getBarberById,
  listBarbers,
  updateBarberProfile,
} from "../controllers/barber.controller.js";
import {
  getAdminEarnings,
  getMyEarnings,
} from "../controllers/earnings.controller.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { createBarberSchema } from "../schemas/auth.schema.js";
import { updateBarberProfileSchema } from "../schemas/barber.schema.js";
import { earningsQuerySchema } from "../schemas/earnings.schema.js";

const router = Router();

router.get("/", optionalAuthenticate, listBarbers);

// Rutas de reportes antes de /:id para que no se interpreten como IDs.
router.get(
  "/me/earnings",
  authenticate,
  requireRole("barber"),
  validateQuery(earningsQuerySchema),
  getMyEarnings,
);
router.get(
  "/earnings",
  authenticate,
  requireRole("admin"),
  validateQuery(earningsQuerySchema),
  getAdminEarnings,
);

router.get("/:id", authenticate, requireRole("admin"), getBarberById);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validateBody(createBarberSchema),
  createBarber,
);
router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateBarberProfileSchema),
  updateBarberProfile,
);

export default router;

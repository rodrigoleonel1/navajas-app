import { Router } from "express";
import {
  createBarber,
  getBarberById,
  listBarbers,
  updateBarberProfile,
} from "../controllers/barber.controller.js";
import {
  getDailyEarnings,
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
import {
  dailyEarningsQuerySchema,
  earningsQuerySchema,
} from "../schemas/earnings.schema.js";

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
  "/daily-earnings",
  authenticate,
  requireRole("admin"),
  validateQuery(dailyEarningsQuerySchema),
  getDailyEarnings,
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

import { Router } from "express";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  availabilityQuerySchema,
  updateAppointmentStatusSchema,
} from "../schemas/appointment.schema.js";
import {
  createAppointment,
  listAppointments,
  getAvailability,
  updateAppointmentStatus,
} from "../controllers/appointment.controller.js";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("client"),
  validateBody(createAppointmentSchema),
  createAppointment,
);

router.get(
  "/availability",
  authenticate,
  validateQuery(availabilityQuerySchema),
  getAvailability,
);

router.get(
  "/",
  authenticate,
  validateQuery(listAppointmentsQuerySchema),
  listAppointments,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateAppointmentStatusSchema),
  updateAppointmentStatus,
);

export default router;

import { Router } from "express";
import {
  cancelAppointment,
  createAppointment,
  getAvailability,
  listAppointments,
  markNoShow,
  updateAppointmentStatus,
} from "../controllers/appointment.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import {
  availabilityQuerySchema,
  createAppointmentSchema,
  listAppointmentsQuerySchema,
  updateAppointmentStatusSchema,
} from "../schemas/appointment.schema.js";

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
  "/:id/cancel",
  authenticate,
  requireRole("client"),
  cancelAppointment,
);

router.patch(
  "/:id/no-show",
  authenticate,
  requireRole("admin"),
  markNoShow,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateAppointmentStatusSchema),
  updateAppointmentStatus,
);

export default router;

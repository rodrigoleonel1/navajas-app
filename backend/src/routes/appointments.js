import { Router } from "express";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import {
  createAppointmentSchema,
  listAppointmentsQuerySchema,
} from "../schemas/appointment.schema.js";
import {
  createAppointment,
  listAppointments,
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
  "/",
  authenticate,
  validateQuery(listAppointmentsQuerySchema),
  listAppointments,
);

export default router;

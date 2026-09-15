import { Router } from "express";
import { validateBody } from "../middlewares/validateBody.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { createBarberSchema } from "../schemas/auth.schema.js";
import { createBarber, listBarbers } from "../controllers/barber.controller.js";

const router = Router();

router.get("/", listBarbers);
router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validateBody(createBarberSchema),
  createBarber,
);

export default router;

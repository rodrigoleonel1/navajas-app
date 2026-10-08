import { Router } from "express";
import { validateBody } from "../middlewares/validateBody.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { createBarberSchema } from "../schemas/auth.schema.js";
import { updateBarberProfileSchema } from "../schemas/barber.schema.js";
import {
  createBarber,
  getBarberById,
  listBarbers,
  updateBarberProfile,
} from "../controllers/barber.controller.js";

const router = Router();

router.get("/", listBarbers);
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

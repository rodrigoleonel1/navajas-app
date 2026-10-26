import { Router } from "express";
import { createRating } from "../controllers/rating.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { createRatingSchema } from "../schemas/rating.schema.js";

const router = Router();

// EP-7 / CA-21: solo el cliente califica, y solo sus propios turnos.
router.post(
  "/",
  authenticate,
  requireRole("client"),
  validateBody(createRatingSchema),
  createRating,
);

export default router;

import { Router } from "express";
import { getClientPenaltyStatus } from "../controllers/penalty.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

// El cliente solo puede ver sus propias penalizaciones: el service usa
// req.user.id.
router.get("/", authenticate, requireRole("client"), getClientPenaltyStatus);

export default router;

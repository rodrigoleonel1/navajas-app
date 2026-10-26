import { Router } from "express";
import {
  getFidelityProgress,
  listVouchers,
} from "../controllers/voucher.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

// El cliente solo puede ver sus propios vales: el service usa req.user.id.
router.get("/", authenticate, requireRole("client"), listVouchers);
// Progreso de fidelidad (RN8): turnos completados dentro del ciclo de 10.
router.get(
  "/fidelity",
  authenticate,
  requireRole("client"),
  getFidelityProgress,
);

export default router;

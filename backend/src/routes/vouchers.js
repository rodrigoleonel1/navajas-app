import { Router } from "express";
import { listVouchers } from "../controllers/voucher.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";

const router = Router();

// El cliente solo puede ver sus propios vales: el service usa req.user.id.
router.get("/", authenticate, requireRole("client"), listVouchers);

export default router;

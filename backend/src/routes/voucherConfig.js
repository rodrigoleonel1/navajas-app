import { Router } from "express";
import {
  getVoucherConfig,
  updateVoucherConfig,
} from "../controllers/voucher.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { updateVoucherConfigSchema } from "../schemas/voucher.schema.js";

const router = Router();

// La duración de los vales es configuración global del negocio: solo admin.
router.use(authenticate, requireRole("admin"));

router.get("/", getVoucherConfig);
router.patch("/", validateBody(updateVoucherConfigSchema), updateVoucherConfig);

export default router;

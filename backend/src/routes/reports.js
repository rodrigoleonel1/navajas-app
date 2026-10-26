import { Router } from "express";
import { getBusinessReport } from "../controllers/report.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { reportQuerySchema } from "../schemas/report.schema.js";

const router = Router();

// Los reportes del negocio son exclusivos del admin.
router.use(authenticate, requireRole("admin"));

router.get("/", validateQuery(reportQuerySchema), getBusinessReport);

export default router;

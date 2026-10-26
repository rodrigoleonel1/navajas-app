import { Router } from "express";
import {
  createService,
  getServiceById,
  listPopularServices,
  listServices,
  updateService,
} from "../controllers/service.controller.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import {
  createServiceSchema,
  listPopularServicesQuerySchema,
  updateServiceSchema,
} from "../schemas/service.schema.js";

const router = Router();

router.get("/", optionalAuthenticate, listServices);
// Antes de /:id para que "popular" no se interprete como un ID.
router.get(
  "/popular",
  validateQuery(listPopularServicesQuerySchema),
  listPopularServices,
);
router.get("/:id", authenticate, requireRole("admin"), getServiceById);

router.post(
  "/",
  authenticate,
  requireRole("admin"),
  validateBody(createServiceSchema),
  createService,
);

router.patch(
  "/:id",
  authenticate,
  requireRole("admin"),
  validateBody(updateServiceSchema),
  updateService,
);

export default router;

import { Router } from "express";
import {
  createService,
  getServiceById,
  listServices,
  updateService,
} from "../controllers/service.controller.js";
import {
  authenticate,
  optionalAuthenticate,
  requireRole,
} from "../middlewares/auth.js";
import { validateBody } from "../middlewares/validateBody.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../schemas/service.schema.js";

const router = Router();

router.get("/", optionalAuthenticate, listServices);
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

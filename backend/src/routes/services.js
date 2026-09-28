import { Router } from "express";
import { validateBody } from "../middlewares/validateBody.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import {
  createServiceSchema,
  updateServiceSchema,
} from "../schemas/service.schema.js";
import {
  createService,
  listServices,
  removeService,
  updateService,
} from "../controllers/service.controller.js";

const router = Router();

router.get("/", listServices);

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

router.delete("/:id", authenticate, requireRole("admin"), removeService);

export default router;

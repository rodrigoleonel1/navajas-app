import { Router } from "express";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { authenticate, requireRole } from "../middlewares/auth.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { listNotificationsQuerySchema } from "../schemas/notification.schema.js";

const router = Router();

router.get(
  "/",
  authenticate,
  requireRole("client"),
  validateQuery(listNotificationsQuerySchema),
  listNotifications,
);

// Antes de /:id/read para que "read-all" no se interprete como un ID.
router.patch(
  "/read-all",
  authenticate,
  requireRole("client"),
  markAllNotificationsRead,
);

router.patch(
  "/:id/read",
  authenticate,
  requireRole("client"),
  markNotificationRead,
);

export default router;

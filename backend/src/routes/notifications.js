import { Router } from "express";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "../controllers/notification.controller.js";
import { authenticate } from "../middlewares/auth.js";
import { validateQuery } from "../middlewares/validateQuery.js";
import { listNotificationsQuerySchema } from "../schemas/notification.schema.js";

const router = Router();

// La bandeja es por usuario (target_user_id = req.user.id), así que sirve para
// cualquier rol autenticado: cliente, barbero o admin.
router.get(
  "/",
  authenticate,
  validateQuery(listNotificationsQuerySchema),
  listNotifications,
);

// Antes de /:id/read para que "read-all" no se interprete como un ID.
router.patch("/read-all", authenticate, markAllNotificationsRead);

router.patch("/:id/read", authenticate, markNotificationRead);

export default router;

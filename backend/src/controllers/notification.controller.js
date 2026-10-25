import {
  listInAppNotifications,
  markAllInAppNotificationsRead,
  markInAppNotificationRead,
} from "../services/notification.service.js";

// GET /api/notifications?limit=20
export async function listNotifications(req, res, next) {
  try {
    const query = req.validatedQuery ?? req.query;
    const result = await listInAppNotifications({
      userId: req.user.id,
      limit: query.limit,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/:id/read
export async function markNotificationRead(req, res, next) {
  try {
    const result = await markInAppNotificationRead({
      userId: req.user.id,
      notificationId: req.params.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/notifications/read-all
export async function markAllNotificationsRead(req, res, next) {
  try {
    const result = await markAllInAppNotificationsRead({
      userId: req.user.id,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
}

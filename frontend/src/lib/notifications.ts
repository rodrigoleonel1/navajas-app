import { api } from "./api";

export type InAppNotification = {
  id: string;
  appointmentId: string | null;
  type: string;
  title: string;
  message: string;
  link: string;
  createdAt: string;
  readAt: string | null;
};

export type NotificationsResponse = {
  items: InAppNotification[];
  unread: number;
};

export type MarkReadResponse = {
  notification: InAppNotification;
  unread: number;
};

export type MarkAllReadResponse = {
  updated: number;
  unread: number;
};

export async function listNotifications(
  limit = 20,
): Promise<NotificationsResponse> {
  const res = await api.get<NotificationsResponse>("/notifications", {
    params: { limit },
  });
  return res.data;
}

export async function markNotificationRead(
  id: string,
): Promise<MarkReadResponse> {
  const res = await api.patch<MarkReadResponse>(`/notifications/${id}/read`);
  return res.data;
}

export async function markAllNotificationsRead(): Promise<MarkAllReadResponse> {
  const res = await api.patch<MarkAllReadResponse>("/notifications/read-all");
  return res.data;
}

// Avisa al panel que hubo una acción propia (reservar, cancelar) para que
// vuelva a pedir la bandeja sin esperar al polling.
const listeners = new Set<() => void>();

export function onNotificationsChanged(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyNotificationsChanged() {
  for (const listener of listeners) listener();
}

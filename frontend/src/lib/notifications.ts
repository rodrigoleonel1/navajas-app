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

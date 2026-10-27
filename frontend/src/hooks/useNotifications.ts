import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "../lib/api";
import {
  listNotifications,
  markAllNotificationsRead as markAllNotificationsReadApi,
  markNotificationRead as markNotificationReadApi,
  onNotificationsChanged,
  type InAppNotification,
} from "../lib/notifications";

const POLL_MS = 10_000;

export function useNotifications(enabled = true) {
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState("");
  const refreshRef = useRef<() => Promise<void>>(async () => {});

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    async function load(showLoading: boolean) {
      if (showLoading) setLoading(true);
      try {
        const data = await listNotifications();
        if (cancelled) return;
        setNotifications(data.items);
        setUnread(data.unread);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(getErrorMessage(err, "No se pudieron cargar los avisos"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    refreshRef.current = () => load(false);
    void load(true);

    const unsubscribe = onNotificationsChanged(() => {
      void load(false);
    });

    const interval = window.setInterval(() => {
      if (document.visibilityState === "visible") void load(false);
    }, POLL_MS);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      cancelled = true;
      unsubscribe();
      refreshRef.current = async () => {};
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enabled]);

  const refresh = useCallback(async () => {
    await refreshRef.current();
  }, []);

  const markRead = useCallback(async (id: string) => {
    const data = await markNotificationReadApi(id);
    setNotifications((prev) =>
      prev.map((item) =>
        item.id === data.notification.id ? data.notification : item,
      ),
    );
    setUnread(data.unread);
  }, []);

  const markAllRead = useCallback(async () => {
    const data = await markAllNotificationsReadApi();
    const now = new Date().toISOString();
    setNotifications((prev) =>
      prev.map((item) => (item.readAt ? item : { ...item, readAt: now })),
    );
    setUnread(data.unread);
  }, []);

  return {
    notifications,
    unread,
    loading,
    error,
    refresh,
    markRead,
    markAllRead,
  };
}

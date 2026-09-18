import axios from "axios";

const baseURL = (import.meta.env.API_URL as string) || "/api";

export const api = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export function getErrorMessage(err: unknown, fallback: string) {
  if (axios.isAxiosError(err)) {
    return (
      (err.response?.data as { error?: { message?: string } })?.error
        ?.message || fallback
    );
  }
  return fallback;
}

api.interceptors.response.use(undefined, (err) => {
  if (axios.isAxiosError(err) && err.response?.status === 401) {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    if (window.location.pathname.startsWith("/app")) {
      window.location.href = "/login";
    }
  }
  return Promise.reject(err);
});

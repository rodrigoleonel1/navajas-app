export type StoredUser = { id: string; role: string; email: string; name?: string };

export function getUser(): StoredUser | null {
  try {
    return JSON.parse(localStorage.getItem("user") || "null");
  } catch {
    return null;
  }
}

export function getRole(): string | null {
  return getUser()?.role || null;
}

export function clearAuth() {
  localStorage.removeItem("token");
  localStorage.removeItem("user");
}

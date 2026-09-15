import { AdminPage } from "./AdminPage";
import { BarberPage } from "./BarberPage";
import { ClientPage } from "./ClientPage";

function getRole(): string | null {
  try {
    return JSON.parse(localStorage.getItem("user") || "null")?.role || null;
  } catch {
    return null;
  }
}

export function AgendaPage() {
  const role = getRole();
  if (role === "admin") return <AdminPage />;
  if (role === "barber") return <BarberPage />;
  return <ClientPage />;
}

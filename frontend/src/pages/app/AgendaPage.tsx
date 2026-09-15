import { AdminPage } from "./AdminPage";
import { BarberPage } from "./BarberPage";
import { ClientPage } from "./ClientPage";
import { getRole } from "../../lib/auth";

export function AgendaPage() {
  const role = getRole();
  if (role === "admin") return <AdminPage />;
  if (role === "barber") return <BarberPage />;
  return <ClientPage />;
}

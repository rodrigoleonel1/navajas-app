import { Outlet } from "react-router-dom";
import { AppNavbar } from "../components/AppNavbar";

export function AppLayout() {
  return (
    <div className="min-h-dvh flex flex-col bg-background">
      <AppNavbar />
      <main className="flex-1 py-8">
        <Outlet />
      </main>
    </div>
  );
}

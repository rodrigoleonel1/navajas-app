import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRedirect } from "./components/RoleRedirect";
import { ClientPage } from "./pages/app/ClientPage";
import { ClientTurnosPage } from "./pages/app/ClientTurnosPage";
import { BarberPage } from "./pages/app/BarberPage";
import { BarberIngresosPage } from "./pages/app/BarberIngresosPage";
import { AdminPage } from "./pages/app/AdminPage";
import { AgendaPage } from "./pages/app/AgendaPage";
import { BarbersPage } from "./pages/app/BarbersPage";
import { BarberDetailPage } from "./pages/app/BarberDetailPage";
import { ServicesPage } from "./pages/app/ServicesPage";
import { ServiceDetailPage } from "./pages/app/ServiceDetailPage";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<RoleRedirect />} />
          <Route path="agenda" element={<AgendaPage />} />
          <Route path="client" element={<ClientPage />} />
          <Route path="client/turnos" element={<ClientTurnosPage />} />
          <Route path="barber" element={<BarberPage />} />
          <Route path="barber/ingresos" element={<BarberIngresosPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route
            path="barbers"
            element={
              <ProtectedRoute roles={["admin"]}>
                <BarbersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="barbers/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <BarberDetailPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="services"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ServicesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="services/:id"
            element={
              <ProtectedRoute roles={["admin"]}>
                <ServiceDetailPage />
              </ProtectedRoute>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

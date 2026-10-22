import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRedirect } from "./components/RoleRedirect";
import { ConfirmProvider } from "./components/ui/ConfirmModal";
import { ToastProvider } from "./components/ui/Toast";
import { AppLayout } from "./layouts/AppLayout";
import { AgendaPage } from "./pages/app/AgendaPage";
import { BarberDetailPage } from "./pages/app/BarberDetailPage";
import { BarberIngresosPage } from "./pages/app/BarberIngresosPage";
import { BarbersPage } from "./pages/app/BarbersPage";
import { ClientTurnosPage } from "./pages/app/ClientTurnosPage";
import { ServiceDetailPage } from "./pages/app/ServiceDetailPage";
import { ServicesPage } from "./pages/app/ServicesPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
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
          <Route
            path="client/turnos"
            element={
              <ProtectedRoute roles={["client"]}>
                <ClientTurnosPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="barber/ingresos"
            element={
              <ProtectedRoute roles={["barber"]}>
                <BarberIngresosPage />
              </ProtectedRoute>
            }
          />
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
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;

import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRedirect } from "./components/RoleRedirect";
import { ConfirmProvider } from "./components/ui/ConfirmModal";
import { Loader } from "./components/ui/Loader";
import { ToastProvider } from "./components/ui/Toast";
import { AppLayout } from "./layouts/AppLayout";
import { AgendaPage } from "./pages/app/AgendaPage";
import { BarberDetailPage } from "./pages/app/BarberDetailPage";
import { BarbersPage } from "./pages/app/BarbersPage";
import { ClientTurnosPage } from "./pages/app/ClientTurnosPage";
import { ClientVouchersPage } from "./pages/app/ClientVouchersPage";
import { HolidaysPage } from "./pages/app/HolidaysPage";
import { OfferFormPage } from "./pages/app/OfferFormPage";
import { OffersPage } from "./pages/app/OffersPage";
import { ReportsPage } from "./pages/app/ReportsPage";
import { ServiceDetailPage } from "./pages/app/ServiceDetailPage";
import { ServicesPage } from "./pages/app/ServicesPage";
import { VoucherConfigPage } from "./pages/app/VoucherConfigPage";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";

// Las páginas que importan recharts se cargan aparte: el gráfico no viaja en el
// bundle de la landing ni del panel, y las dos comparten el mismo chunk.
const BarberIngresosPage = lazy(() =>
  import("./pages/app/BarberIngresosPage").then((module) => ({
    default: module.BarberIngresosPage,
  })),
);

const AdminEarningsPage = lazy(() =>
  import("./pages/app/AdminEarningsPage").then((module) => ({
    default: module.AdminEarningsPage,
  })),
);

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

              <Route element={<ProtectedRoute roles={["client"]} />}>
                <Route path="client/turnos" element={<ClientTurnosPage />} />
                <Route path="client/vales" element={<ClientVouchersPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={["barber"]} />}>
                <Route
                  path="barber/ingresos"
                  element={
                    <Suspense
                      fallback={
                        <Loader label="Cargando ingresos..." height="page" />
                      }
                    >
                      <BarberIngresosPage />
                    </Suspense>
                  }
                />
              </Route>

              <Route element={<ProtectedRoute roles={["admin"]} />}>
                <Route
                  path="voucher-config"
                  element={<VoucherConfigPage />}
                />
                <Route
                  path="earnings"
                  element={
                    <Suspense
                      fallback={
                        <Loader label="Cargando ingresos..." height="page" />
                      }
                    >
                      <AdminEarningsPage />
                    </Suspense>
                  }
                />
                {/* Ruta vieja de los ingresos del admin. */}
                <Route
                  path="daily-earnings"
                  element={<Navigate to="/app/earnings" replace />}
                />
                <Route path="reports" element={<ReportsPage />} />
                <Route path="barbers" element={<BarbersPage />} />
                <Route path="barbers/:id" element={<BarberDetailPage />} />
                <Route path="services" element={<ServicesPage />} />
                <Route
                  path="services/:id"
                  element={<ServiceDetailPage />}
                />
                <Route path="offers" element={<OffersPage />} />
                <Route path="offers/new" element={<OfferFormPage />} />
                <Route path="offers/:id/edit" element={<OfferFormPage />} />
                <Route path="holidays" element={<HolidaysPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;

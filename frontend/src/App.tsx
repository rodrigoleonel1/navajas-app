import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
            <Route path="/ingresar" element={<LoginPage />} />
            <Route path="/registro" element={<SignupPage />} />

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
                <Route path="turnos" element={<ClientTurnosPage />} />
                <Route path="vales" element={<ClientVouchersPage />} />
              </Route>

              <Route element={<ProtectedRoute roles={["barber"]} />}>
                <Route
                  path="barbero/ingresos"
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
                  path="admin/config-vales"
                  element={<VoucherConfigPage />}
                />
                <Route
                  path="admin/ingresos"
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
                <Route path="admin/reportes" element={<ReportsPage />} />
                <Route path="admin/barberos" element={<BarbersPage />} />
                <Route
                  path="admin/barberos/:id"
                  element={<BarberDetailPage />}
                />
                <Route path="admin/servicios" element={<ServicesPage />} />
                <Route
                  path="admin/servicios/:id"
                  element={<ServiceDetailPage />}
                />
                <Route path="admin/ofertas" element={<OffersPage />} />
                <Route
                  path="admin/ofertas/nueva"
                  element={<OfferFormPage />}
                />
                <Route
                  path="admin/ofertas/:id/editar"
                  element={<OfferFormPage />}
                />
                <Route path="admin/feriados" element={<HolidaysPage />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </ConfirmProvider>
    </ToastProvider>
  );
}

export default App;

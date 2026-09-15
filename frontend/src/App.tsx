import { BrowserRouter, Routes, Route } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { LoginPage } from "./pages/LoginPage";
import { SignupPage } from "./pages/SignupPage";
import { AppLayout } from "./layouts/AppLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { RoleRedirect } from "./components/RoleRedirect";
import { ClientPage } from "./pages/app/ClientPage";
import { BarberPage } from "./pages/app/BarberPage";
import { AdminPage } from "./pages/app/AdminPage";
import { AgendaPage } from "./pages/app/AgendaPage";
import { BarbersPage } from "./pages/app/BarbersPage";

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
          <Route path="barber" element={<BarberPage />} />
          <Route path="admin" element={<AdminPage />} />
          <Route path="barbers" element={<BarbersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;

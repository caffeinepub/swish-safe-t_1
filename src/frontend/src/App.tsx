import { Toaster } from "@/components/ui/sonner";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import { RoleGuard } from "./components/RoleGuard";
import { AuthProvider } from "./contexts/AuthContext";
import { AdminPage } from "./pages/AdminPage";
import { ClientsPage } from "./pages/ClientsPage";
import { ConfigPage } from "./pages/ConfigPage";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { QuestionnairePage } from "./pages/QuestionnairePage";
import { SetupPage } from "./pages/SetupPage";
import { SitesPage } from "./pages/SitesPage";
import { TaskListPage } from "./pages/TaskListPage";
import { TemplatePage } from "./pages/TemplatePage";

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/setup" element={<SetupPage />} />

          {/* Protected routes inside layout */}
          <Route
            element={
              <RoleGuard>
                <Layout />
              </RoleGuard>
            }
          >
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/clients" element={<ClientsPage />} />
            <Route path="/clients/:clientId/sites" element={<SitesPage />} />
            <Route path="/tasks" element={<TaskListPage />} />
            <Route
              path="/questionnaire/:siteId"
              element={<QuestionnairePage />}
            />
            <Route
              path="/config/:clientId"
              element={
                <RoleGuard roles={["Admin", "Manager"]}>
                  <ConfigPage />
                </RoleGuard>
              }
            />
            <Route
              path="/templates"
              element={
                <RoleGuard roles={["Admin", "Manager"]}>
                  <TemplatePage />
                </RoleGuard>
              }
            />
            <Route
              path="/admin"
              element={
                <RoleGuard roles={["Admin", "Manager"]}>
                  <AdminPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Default redirect */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}

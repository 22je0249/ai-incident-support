import { Routes, Route, Navigate } from "react-router-dom";
import Shell from "./components/layout/Shell";
import DashboardPage from "./pages/DashboardPage";
import IncidentsPage from "./pages/IncidentsPage";
import IncidentDetailPage from "./pages/IncidentDetailPage";
import KnowledgeBasePage from "./pages/KnowledgeBasePage";
import RepositoriesPage from "./pages/RepositoriesPage";
import SettingsPage from "./pages/SettingsPage";
import LoginPage from "./pages/LoginPage";

function App() {
  const token = localStorage.getItem("aiops_token");

  // Store token from OAuth callback
  if (window.location.pathname === "/auth/callback") {
    const params = new URLSearchParams(window.location.search);
    const cbToken = params.get("token");
    if (cbToken) {
      localStorage.setItem("aiops_token", cbToken);
      window.location.href = "/";
      return null;
    }
  }

  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  return (
    <Shell>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/incidents" element={<IncidentsPage />} />
        <Route path="/incidents/:id" element={<IncidentDetailPage />} />
        <Route path="/knowledge" element={<KnowledgeBasePage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Shell>
  );
}

export default App;

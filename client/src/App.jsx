import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { LoginPage } from './pages/LoginPage.jsx';
import { RegisterPage } from './pages/RegisterPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { BeneficiariesPage } from './pages/BeneficiariesPage.jsx';
import { AttestationTypesPage } from './pages/AttestationTypesPage.jsx';
import { RequestsPage } from './pages/RequestsPage.jsx';
import { ArchivePage } from './pages/ArchivePage.jsx';
import { VerifyPage } from './pages/VerifyPage.jsx';
import { AuditPage } from './pages/AuditPage.jsx';
import { SettingsPage } from './pages/SettingsPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/verify/:token" element={<VerifyPage />} />

      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route
          path="/beneficiaries"
          element={
            <ProtectedRoute roles={['administrator', 'administrative_agent']}>
              <BeneficiariesPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/attestation-types"
          element={
            <ProtectedRoute roles={['administrator', 'administrative_agent']}>
              <AttestationTypesPage />
            </ProtectedRoute>
          }
        />
        <Route path="/requests" element={<RequestsPage />} />
        <Route
          path="/archive"
          element={
            <ProtectedRoute roles={['administrator', 'administrative_agent', 'external_verifier']}>
              <ArchivePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/audit"
          element={
            <ProtectedRoute roles={['administrator', 'administrative_agent']}>
              <AuditPage />
            </ProtectedRoute>
          }
        />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

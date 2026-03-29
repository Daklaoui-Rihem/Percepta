import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import ForgotPasswordPage from './Pages/ForgotPasswordPage';
import LoginPage from './Pages/LoginPage';
import DashboardPage from './Pages/DashboardPage';
import UsersPage from './Pages/UsersPage';
import ReportsPage from './Pages/ReportsPage';
import AnalysesPage from './Pages/AnalysesPage';
import ClientDashboardPage from './Pages/ClientDashboardPage';
import NewTranscriptionPage from './Pages/NewTranscriptionPage';
import NewVideoAnalysisPage from './Pages/NewVideoAnalysisPage';
import AudioHistoryPage from './Pages/Audiohistorypage';
import SuperAdminDashboardPage from './Pages/SuperAdminDashboardPage';
import ClientProfilePage from './Pages/ClientProfilePage';
import AdminProfilePage from './Pages/AdminProfilePage';
import SuperAdminProfilePage from './Pages/SuperAdminProfilePage';
import ProtectedRoute from './components/Guards/ProtectedRoute';
import TenantManagementPage from './Pages/TenantManagementPage';
import SettingsPage from './Pages/SettingsPage';
import ForcePasswordChangePage from './Pages/ForcePasswordChangePage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/settings" element={
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <SettingsPage />
          </ProtectedRoute>
        } />

        {/* Public */}
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/force-password-change" element={
          <ProtectedRoute allowedRoles={['Client', 'Admin', 'SuperAdmin']}>
            <ForcePasswordChangePage />
          </ProtectedRoute>
        } />

        {/* Admin routes */}
        <Route path="/dashboard" element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <DashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/users" element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <UsersPage />
          </ProtectedRoute>
        } />
        <Route path="/reports" element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <ReportsPage />
          </ProtectedRoute>
        } />
        <Route path="/analyses" element={
          <ProtectedRoute allowedRoles={['Admin', 'SuperAdmin']}>
            <AnalysesPage />
          </ProtectedRoute>
        } />
        <Route path="/admin/profile" element={
          <ProtectedRoute allowedRoles={['Admin']}>
            <AdminProfilePage />
          </ProtectedRoute>
        } />

        {/* Client routes */}
        <Route path="/client/dashboard" element={
          <ProtectedRoute allowedRoles={['Client']}>
            <ClientDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/client/transcriptions" element={<Navigate to="/client/transcriptions/new" replace />} />
        <Route path="/client/video-analysis" element={<Navigate to="/client/video-analysis/new" replace />} />
        <Route path="/client/transcriptions/new" element={
          <ProtectedRoute allowedRoles={['Client']}>
            <NewTranscriptionPage />
          </ProtectedRoute>
        } />
        <Route path="/client/video-analysis/new" element={
          <ProtectedRoute allowedRoles={['Client']}>
            <NewVideoAnalysisPage />
          </ProtectedRoute>
        } />

        {/* Audio history + PDF reports */}
        <Route path="/client/history" element={
          <ProtectedRoute allowedRoles={['Client']}>
            <AudioHistoryPage />
          </ProtectedRoute>
        } />

        <Route path="/client/profile" element={
          <ProtectedRoute allowedRoles={['Client']}>
            <ClientProfilePage />
          </ProtectedRoute>
        } />

        {/* SuperAdmin routes */}
        <Route path="/superadmin/dashboard" element={
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminDashboardPage />
          </ProtectedRoute>
        } />
        <Route path="/superadmin/profile" element={
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <SuperAdminProfilePage />
          </ProtectedRoute>
        } />
        <Route path="/superadmin/tenants" element={
          <ProtectedRoute allowedRoles={['SuperAdmin']}>
            <TenantManagementPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}
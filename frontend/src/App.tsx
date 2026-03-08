import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';

import LoginPage from './Pages/LoginPage';
import DashboardPage from './Pages/DashboardPage';
import UsersPage from './Pages/UsersPage';
import ReportsPage from './Pages/ReportsPage';
import AnalysesPage from './Pages/AnalysesPage';
import ClientDashboardPage from './Pages/ClientDashboardPage'; //
import NewTranscriptionPage from './Pages/NewTranscriptionPage';    // ← add
import NewVideoAnalysisPage from './Pages/NewVideoAnalysisPage'; 
import SuperAdminDashboardPage from './Pages/SuperAdminDashboardPage'; // ← add
import ClientProfilePage from './Pages/ClientProfilePage'; // ← add
import AdminProfilePage from './Pages/AdminProfilePage';           // ← add
import SuperAdminProfilePage from './Pages/SuperAdminProfilePage'; // ← add




export default function App() {
  return (
  
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/login" />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/users" element={<UsersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/analyses" element={<AnalysesPage />} />
          <Route path="/client/dashboard" element={<ClientDashboardPage />} />
          <Route path="/client/transcriptions/new" element={<NewTranscriptionPage />} />   {/* ← add */}
          <Route path="/client/video-analysis/new" element={<NewVideoAnalysisPage />} />
          <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />   {/* ← add */}
          <Route path="/client/profile" element={<ClientProfilePage />} />
          
            <Route path="/admin/profile" element={<AdminProfilePage />} />
            <Route path="/superadmin/profile" element={<SuperAdminProfilePage />} />
           
        </Routes>
      </BrowserRouter>
 
  );
}
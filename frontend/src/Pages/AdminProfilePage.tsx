import { useState } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import AdminProfileForm from '../components/Organisms/AdminProfileForm';

export default function AdminProfilePage() {
  const [activePage, setActivePage] = useState('');
  // empty string = no sidebar item highlighted
  // because Profile is not in the sidebar

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <AdminProfileForm role="Admin" />
      {/*
        role="Admin" → AdminInfoSection shows
        Administrator level dropdown (not read-only)
      */}
    </DashboardTemplate>
  );
}
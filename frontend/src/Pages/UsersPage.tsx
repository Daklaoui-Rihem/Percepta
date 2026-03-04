import { useState } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import UsersTable from '../components/Organisms/UsersTable';

export default function UsersPage() {
  const [activePage, setActivePage] = useState('Users');

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24 }}>Users</h2>
      <UsersTable />
    </DashboardTemplate>
  );
}
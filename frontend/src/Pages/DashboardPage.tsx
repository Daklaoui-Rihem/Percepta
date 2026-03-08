import { useState } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import StatsRow from '../components/Organisms/StatsRow';
import WeeklyChart from '../components/Organisms/WeeklyChart';
import RecentActivities from '../components/Organisms/RecentActivities'; 



export default function DashboardPage() {
  const [activePage, setActivePage] = useState('Dashboard');

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24 }}>Dashboard Overview</h2>
      <StatsRow />
      <WeeklyChart />
      <RecentActivities />  {/* ← add */}
    </DashboardTemplate>
  );
}
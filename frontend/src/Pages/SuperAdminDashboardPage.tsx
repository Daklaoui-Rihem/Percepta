import { useState, useEffect } from 'react';
import SuperAdminTemplate from '../components/Templates/SuperAdminTemplate';
import SuperStatsRow from '../components/Organisms/SuperStatsRow';
import ActiveTenantsList from '../components/Organisms/ActiveTenantsList';
import RecentActivityList from '../components/Organisms/RecentActivityList';
import { dashboardApi } from '../services/api';
import type { DashboardStats } from '../services/api';
import { Loader2 } from 'lucide-react';

export default function SuperAdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getStats()
      .then(data => {
        setStats(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch dashboard stats', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <SuperAdminTemplate>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 size={48} color="#3b82f6" className="spin-animation" />
        </div>
        <style>{`
          .spin-animation { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </SuperAdminTemplate>
    );
  }

  return (
    <SuperAdminTemplate>
      <SuperStatsRow stats={stats} />
      <ActiveTenantsList tenants={stats?.activeTenants || []} />
      <RecentActivityList activities={stats?.recentActivities || []} />
    </SuperAdminTemplate>
  );
}
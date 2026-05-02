import { useState, useEffect } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import StatsRow from '../components/Organisms/StatsRow';
import WeeklyChart from '../components/Organisms/WeeklyChart';
import RecentActivities from '../components/Organisms/RecentActivities';
import { useTranslation } from '../context/TranslationContext';
import { dashboardApi } from '../services/api';
import type { DashboardStats } from '../services/api';
import { Loader2 } from 'lucide-react';

export default function DashboardPage() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState('Dashboard');
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
      <DashboardTemplate active={activePage} onNavigate={setActivePage}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 size={48} color="#3b82f6" className="spin-animation" />
        </div>
        <style>{`
          .spin-animation { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </DashboardTemplate>
    );
  }

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24 }}>{t('dashboardOverview')}</h2>
      <StatsRow stats={stats} />
      <WeeklyChart />
      <RecentActivities activities={stats?.recentActivities || []} />
    </DashboardTemplate>
  );
}
import { Building2, Users, HardDrive, AlertCircle, BarChart3 } from 'lucide-react';
import SuperStatCard from '../Molecules/SuperStatCard';
import { useTranslation } from '../../context/TranslationContext';
import type { DashboardStats } from '../../services/api';

interface SuperStatsRowProps {
  stats: DashboardStats | null;
}

export default function SuperStatsRow({ stats }: SuperStatsRowProps) {
  const { t } = useTranslation();

  const statCards = [
    { icon: Building2,   label: t('totalTenants'),    value: stats?.totalTenants?.toString() || '0',     change: '',       changeColor: '#22c55e' },
    { icon: Users,       label: t('totalUsers'),       value: stats?.totalUsers?.toString() || '0',   change: '',       changeColor: '#22c55e' },
    { icon: HardDrive,   label: t('analyses'),       value: stats?.totalAnalysesCount?.toString() || '0',   change: `${stats?.activeAnalysesCount || 0} ${t('active') || 'actifs'}`,     changeColor: '#f97316' },
    { icon: AlertCircle, label: t('errorRate'),        value: `${stats?.errorRate || 0}%`, change: '', changeColor: '#ef4444' },
    { icon: BarChart3,   label: t('reportsGenerated'), value: stats?.reportsCount?.toString() || '0', change: '',       changeColor: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      {statCards.map(s => <SuperStatCard key={s.label} {...s} />)}
    </div>
  );
}
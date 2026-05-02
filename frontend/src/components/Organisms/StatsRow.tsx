import { Users, Zap, FileText, AlertTriangle } from 'lucide-react';
import StatCard from '../Molecules/StatCard';
import { useTranslation } from '../../context/TranslationContext';
import type { DashboardStats } from '../../services/api';

interface StatsRowProps {
  stats: DashboardStats | null;
}

export default function StatsRow({ stats }: StatsRowProps) {
  const { t } = useTranslation();

  const statCards = [
    { icon: Users,         value: stats?.totalUsers?.toLocaleString() || '0', label: t('activeUsers'),      change: '', borderColor: '#60a5fa' },
    { icon: Zap,           value: stats?.activeAnalysesCount?.toString() || '0',    label: t('runningAnalyses'),   change: '',     borderColor: '#1a3a9f' },
    { icon: FileText,      value: stats?.reportsCount?.toLocaleString() || '0', label: t('reportsGenerated'),  change: '', borderColor: '#22c55e' },
    { icon: AlertTriangle, value: `${stats?.errorRate || 0}%`,  label: t('errorRate'),         change: '',  borderColor: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
      {statCards.map(s => <StatCard key={s.label} {...s} />)}
    </div>
  );
}
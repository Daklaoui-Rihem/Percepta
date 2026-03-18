import { Building2, Users, HardDrive, AlertCircle, BarChart3 } from 'lucide-react';
import SuperStatCard from '../Molecules/SuperStatCard';
import { useTranslation } from '../../context/TranslationContext';

export default function SuperStatsRow() {
  const { t } = useTranslation();

  const stats = [
    { icon: Building2,   label: t('totalTenants'),    value: '5',     change: `+2 ${t('thisMonth')}`,       changeColor: '#22c55e' },
    { icon: Users,       label: t('totalUsers'),       value: '534',   change: `+47 ${t('thisWeek')}`,       changeColor: '#22c55e' },
    { icon: HardDrive,   label: t('systemLoad'),       value: '72%',   change: t('cpuRamAverage'),     changeColor: '#f97316' },
    { icon: AlertCircle, label: t('errorRate'),        value: '0.12%', change: `-0.03% ${t('vsYesterday')}`, changeColor: '#22c55e' },
    { icon: BarChart3,   label: t('reportsGenerated'), value: '1,247', change: `+89 ${t('thisWeek')}`,       changeColor: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      {stats.map(s => <SuperStatCard key={s.label} {...s} />)}
    </div>
  );
}
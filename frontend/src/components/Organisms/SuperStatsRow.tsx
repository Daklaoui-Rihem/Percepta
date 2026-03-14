import { Building2, Users, HardDrive, AlertCircle, BarChart3 } from 'lucide-react';
import SuperStatCard from '../Molecules/SuperStatCard';
import { useTranslation } from '../../context/TranslationContext';

export default function SuperStatsRow() {
  const { t } = useTranslation();

  const stats = [
    { icon: Building2,   label: t('totalTenants'),    value: '5',     change: '+2 this month',       changeColor: '#22c55e' },
    { icon: Users,       label: t('totalUsers'),       value: '534',   change: '+47 this week',       changeColor: '#22c55e' },
    { icon: HardDrive,   label: t('systemLoad'),       value: '72%',   change: 'CPU/RAM average',     changeColor: '#f97316' },
    { icon: AlertCircle, label: t('errorRate'),        value: '0.12%', change: '-0.03% vs yesterday', changeColor: '#22c55e' },
    { icon: BarChart3,   label: t('reportsGenerated'), value: '1,247', change: '+89 this week',       changeColor: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      {stats.map(s => <SuperStatCard key={s.label} {...s} />)}
    </div>
  );
}
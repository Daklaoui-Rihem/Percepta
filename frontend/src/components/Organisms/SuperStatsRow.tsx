import { Building2, Users, HardDrive, AlertCircle, BarChart3 } from 'lucide-react';
import SuperStatCard from '../Molecules/SuperStatCard';

export default function SuperStatsRow() {
  const stats = [
    { icon: Building2, label: 'Total Tenants', value: '5', change: '+2 this month', changeColor: '#22c55e' },
    { icon: Users, label: 'Total Users', value: '534', change: '+47 this week', changeColor: '#22c55e' },
    { icon: HardDrive, label: 'System Load', value: '72%', change: 'CPU/RAM average', changeColor: '#f97316' },
    { icon: AlertCircle, label: 'Error Rate', value: '0.12%', change: '-0.03% vs yesterday', changeColor: '#22c55e' },
    { icon: BarChart3, label: 'Reports Generated', value: '1,247', change: '+89 this week', changeColor: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      {stats.map(s => <SuperStatCard key={s.label} {...s} />)}
    </div>
  );
}
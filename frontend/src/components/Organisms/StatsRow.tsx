import { Users, Zap, FileText, AlertTriangle } from 'lucide-react';
import StatCard from '../Molecules/StatCard';

export default function StatsRow() {
  const stats = [
    { icon: Users, value: '1,234', label: 'Active Users', change: '+12.5%', borderColor: '#60a5fa' },
    { icon: Zap, value: '42', label: 'Running Analyses', change: '+8', borderColor: '#1a3a9f' },
    { icon: FileText, value: '3,567', label: 'Reports Generated', change: '+23.8%', borderColor: '#22c55e' },
    { icon: AlertTriangle, value: '2.3%', label: 'Error Rate', change: '-0.5%', borderColor: '#f59e0b' },
  ];

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
      {stats.map(s => <StatCard key={s.label} {...s} />)}
    </div>
  );
}
import { FileText, Video, BarChart3, Briefcase } from 'lucide-react';
import ClientStatCard from '../Molecules/ClientStatCard';

export default function ClientStatsRow() {
  const stats = [
    { icon: FileText, value: '156', label: 'Total Transcriptions', change: '+12%' },
    { icon: Video, value: '89', label: 'Videos Analyzed', change: '+8%' },
    { icon: BarChart3, value: '234', label: 'Reports Generated', change: '+15%' },
    { icon: Briefcase, value: '12', label: 'Active Projects', change: '+3%' },
  ];

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
      {stats.map(s => (
        <ClientStatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
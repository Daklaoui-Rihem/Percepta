import { FileText, Video, BarChart3, Briefcase } from 'lucide-react';
import ClientStatCard from '../Molecules/ClientStatCard';
import { useTranslation } from '../../context/TranslationContext';

export default function ClientStatsRow() {
  const { t } = useTranslation(); // ← seul ajout

  const stats = [
    { icon: FileText,  value: '156', label: t('totalTranscriptions'), change: '+12%' },
    { icon: Video,     value: '89',  label: t('videosAnalyzed'),       change: '+8%'  },
    { icon: BarChart3, value: '234', label: t('reportsGenerated'),     change: '+15%' },
    { icon: Briefcase, value: '12',  label: t('activeProjects'),       change: '+3%'  },
  ];

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
      {stats.map(s => (
        <ClientStatCard key={s.label} {...s} />
      ))}
    </div>
  );
}
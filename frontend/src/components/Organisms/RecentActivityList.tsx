import { FileAudio, FileVideo, Clock, AlertCircle } from 'lucide-react';
import ActivityItem from '../Molecules/ActivityItem';
import { useTranslation } from '../../context/TranslationContext';
import type { AnalysisRecord } from '../../services/api';

interface RecentActivityListProps {
  activities: AnalysisRecord[];
}

export default function RecentActivityList({ activities }: RecentActivityListProps) {
  const { t } = useTranslation();

  const getIcon = (type: string, status: string) => {
    if (status === 'error') return AlertCircle;
    return type === 'video' ? FileVideo : FileAudio;
  };

  const getTitle = (analysis: AnalysisRecord) => {
    if (analysis.status === 'error') return t('analysisFailed');
    if (analysis.status === 'done') return t('analysisCompleted');
    return t('analysisStarted');
  };

  const getTimeAgo = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffInMs = now.getTime() - date.getTime();
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    
    if (diffInHours < 1) return t('justNow');
    if (diffInHours < 24) return t('hoursAgo', { count: diffInHours });
    return date.toLocaleDateString();
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 20, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700 }}>
        <Clock size={16} /> {t('recentActivity')}
      </h3>

      {activities.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '20px', color: '#64748b' }}>
          {t('noRecentActivities')}
        </div>
      ) : (
        activities.map((a) => (
          <ActivityItem 
            key={a._id}
            icon={getIcon(a.type, a.status)}
            title={getTitle(a)}
            tenant={a.originalName}
            time={getTimeAgo(a.createdAt)}
          />
        ))
      )}
    </div>
  );
}
import { useNavigate } from 'react-router-dom';
import {  Clock, AlertOctagon, AlertTriangle, Activity, ShieldCheck  } from 'lucide-react';
import type { ExtractedEntities } from '../../services/api';
import ActivityTypeBadge from '../Molecules/ActivityTypeBadge';
import { useTranslation } from '../../context/TranslationContext';
import type { AnalysisRecord } from '../../services/api';

interface RecentActivitiesProps {
  activities: AnalysisRecord[];
}

export default function RecentActivities({ activities }: RecentActivitiesProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const getActionLabel = (analysis: AnalysisRecord) => {
    if (analysis.status === 'error') return t('failedToProcess', { filename: analysis.originalName });
    if (analysis.type === 'audio') return t('completedTranscription');
    if (analysis.type === 'video') return t('completedVideoAnalysis');
    if (analysis.type === 'groupActivity') return t('completedGroupActivity');
    return t('processedFile', { filename: analysis.originalName });
  };

  const getBadgeType = (analysis: AnalysisRecord) => {
    if (analysis.status === 'error') return 'error';
    if (analysis.status === 'processing') return 'analysis';
    if (analysis.type === 'audio') return 'transcription';
    if (analysis.type === 'video') return 'analysis';
    return 'upload';
  };

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#1a3a6b', margin: 0, fontWeight: 700 }}>{t('recentActivities')}</h3>
        <span 
          style={{ color: '#1a3a6b', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
          onClick={() => navigate('/analyses')}
        >
          {t('viewAll')}
        </span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#dbeafe' }}>
            {[t('timestamp'), t('user'), t('action'), t('type')].map(col => (
              <th key={col} style={{ padding: '12px 16px', textAlign: 'left', color: '#1a3a6b', fontSize: 14, fontWeight: 700 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.length === 0 ? (
            <tr>
              <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#64748b' }}>
                {t('noRecentActivities')}
              </td>
            </tr>
          ) : (
            activities.map((a) => (
              <tr key={a._id} style={{ borderBottom: '1px solid #f0f4f8' }}>
                <td style={{ padding: '16px', fontSize: 14, color: '#555' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Clock size={14} color="#64748b" />
                    {new Date(a.createdAt).toLocaleString()}
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: '#1a3a6b' }}>
                  {/* @ts-ignore */}
                  {a.userId?.name || 'User'}
                </td>
                <td style={{ padding: '16px', fontSize: 14, color: '#555' }}>
                  {getActionLabel(a)}
                </td>
                <td style={{ padding: '16px' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <ActivityTypeBadge type={getBadgeType(a) as any} />
        {a.type === 'audio' && a.status === 'done' && (a as any).extractedEntities?.severity && (() => {
            const sev = (a as any).extractedEntities.severity as string;
            const iconMap: Record<string, React.ReactNode> = {
              critical: <AlertTriangle size={12} />,
              meduim : <Activity size={12} />,
              low:      <ShieldCheck size={12} />,
            };
            const cfg: Record<string, { bg: string; color: string; border: string }> = {
              critical: { bg: '#fff1f2', color: '#dc2626', border: '#fecaca' },
               high:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa' },
               medium:   { bg: '#fefce8', color: '#ca8a04', border: '#fde68a' },
               low:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0' },
            };
            const s = cfg[sev];
            if (!s) return null;
            return (
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              background: s.bg, color: s.color,
              border: `1px solid ${s.border}`,
              padding: '3px 8px', borderRadius: 20,
              fontSize: 11, fontWeight: 700,
    }}>
        {iconMap[sev]} {sev.toUpperCase()}
    </span>
);

          



              

        })()}
    </div>
</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
import { useTranslation } from '../../context/TranslationContext';

const analyses = [
  { name: 'Client Meeting Q4',    type: 'transcription', date: '2026-02-20', status: 'completed'  },
  { name: 'Product Demo Video',   type: 'video',         date: '2026-02-20', status: 'inProgress' },
  { name: 'Training Session',     type: 'transcription', date: '2026-02-19', status: 'completed'  },
  { name: 'Q1 Review Meeting',    type: 'video',         date: '2026-02-18', status: 'pending'    },
  { name: 'Sales Presentation',   type: 'transcription', date: '2026-02-17', status: 'completed'  },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  completed:  { bg: '#dcfce7', color: '#16a34a' },
  inProgress: { bg: '#fef9c3', color: '#ca8a04' },
  pending:    { bg: '#f3f4f6', color: '#6b7280' },
};

export default function RecentAnalysesTable() {
  const { t, isRTL } = useTranslation();

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Section title */}
      <h3 style={{ color: '#1a3a6b', marginBottom: 20, fontSize: 18, fontWeight: 700 }}>
        {t('recentAnalyses')}
      </h3>

      {/* Column headers */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr',
        padding: '10px 0',
        borderBottom: '2px solid #f0f4f8',
        marginBottom: 4,
      }}>
        {[
          t('name'), t('type'), t('date'), t('status')
        ].map(header => (
          <span key={header} style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>
            {header}
          </span>
        ))}
      </div>

      {/* Rows */}
      {analyses.map((row, i) => {
        const s = statusStyle[row.status];
        // Translate the type label
        const typeLabel = row.type === 'transcription'
          ? t('transcription')
          : t('videoAnalysisType');
        // Translate the status label
        const statusLabel =
          row.status === 'completed'  ? t('completed')  :
          row.status === 'inProgress' ? t('inProgress') :
          t('pending');

        return (
          <div key={i} style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr',
            padding: '16px 0',
            borderBottom: i < analyses.length - 1 ? '1px solid #f8f8f8' : 'none',
            alignItems: 'center',
          }}>
            <span style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>
              {row.name}
            </span>
            <span style={{ color: '#555', fontSize: 13 }}>
              {typeLabel}
            </span>
            <span style={{ color: '#555', fontSize: 13 }}>
              {row.date}
            </span>
            <span style={{
              background: s.bg, color: s.color,
              padding: '4px 12px', borderRadius: 20,
              fontSize: 12, fontWeight: 600,
              display: 'inline-block',
            }}>
              {statusLabel}
            </span>
          </div>
        );
      })}
    </div>
  );
}
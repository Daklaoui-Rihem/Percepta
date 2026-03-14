import { useState, useEffect } from 'react';
import { analysisApi, type AnalysisRecord } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';

const statusStyle: Record<string, { bg: string; color: string }> = {
  done: { bg: '#dcfce7', color: '#16a34a' },
  processing: { bg: '#fef9c3', color: '#ca8a04' },
  pending: { bg: '#f3f4f6', color: '#6b7280' },
  error: { bg: '#fee2e2', color: '#dc2626' },
};

export default function RecentAnalysesTable() {
  const { t, isRTL } = useTranslation();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    analysisApi.getMyAnalyses()
      .then(data => setAnalyses(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // ── Loading state ──────────────────────────────────────────
  if (loading) return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '40px', textAlign: 'center',
      color: '#888', fontSize: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      ⏳ Chargement des analyses...
    </div>
  );

  // ── Error state ────────────────────────────────────────────
  if (error) return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '40px', textAlign: 'center',
      color: '#dc2626', fontSize: 14,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      ❌ {error}
    </div>
  );

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>

      {/* Title */}
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
        {[t('name'), t('type'), t('date'), t('status')].map(header => (
          <span key={header} style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>
            {header}
          </span>
        ))}
      </div>

      {/* Empty state */}
      {analyses.length === 0 ? (
        <div style={{
          padding: '48px 0', textAlign: 'center',
          color: '#aaa', fontSize: 14,
        }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
          Aucune analyse pour le moment.<br />
          Uploadez votre premier fichier !
        </div>
      ) : (
        // Rows
        analyses.map((row, i) => {
          const s = statusStyle[row.status] || statusStyle.pending;

          const typeLabel =
            row.type === 'audio'
              ? t('transcription')
              : t('videoAnalysisType');

          const statusLabel =
            row.status === 'done' ? t('completed') :
              row.status === 'processing' ? t('inProgress') :
                row.status === 'error' ? t('failed') :
                  t('pending');

          // Format file size
          const sizeMB = (row.size / (1024 * 1024)).toFixed(2);

          return (
            <div
              key={row._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.2fr 1fr',
                padding: '16px 0',
                borderBottom: i < analyses.length - 1 ? '1px solid #f8f8f8' : 'none',
                alignItems: 'center',
              }}
            >
              {/* File name + size */}
              <div>
                <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>
                  {row.originalName}
                </div>
                <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>
                  {sizeMB} MB
                </div>
              </div>

              {/* Type */}
              <span style={{ color: '#555', fontSize: 13 }}>
                {typeLabel}
              </span>

              {/* Date */}
              <span style={{ color: '#555', fontSize: 13 }}>
                {new Date(row.createdAt).toLocaleDateString()}
              </span>

              {/* Status badge */}
              <div style={{ display: 'flex' }}>
                <span style={{
                  background: s.bg, color: s.color,
                  padding: '4px 12px', borderRadius: 20,
                  fontSize: 12, fontWeight: 600,
                  display: 'inline-block',
                }}>
                  {statusLabel}
                </span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
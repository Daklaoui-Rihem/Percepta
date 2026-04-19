import { useState, useEffect } from 'react';
import { analysisApi, type AnalysisRecord } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';
import { Search, Loader2, AlertTriangle, FolderOpen } from 'lucide-react';

const statusStyle: Record<string, { bg: string; color: string }> = {
  done: { bg: '#dcfce7', color: '#16a34a' },
  processing: { bg: '#fef9c3', color: '#ca8a04' },
  pending: { bg: '#f3f4f6', color: '#6b7280' },
  error: { bg: '#fee2e2', color: '#dc2626' },
};

// ── Main Table ─────────────────────────────────────────────────
export default function RecentAnalysesTable({ limit }: { limit?: number }) {
  const { t, isRTL } = useTranslation();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    analysisApi.getMyAnalyses()
      .then(data => setAnalyses(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  let filtered = analyses.filter((a: AnalysisRecord) => {
    return a.originalName.toLowerCase().includes(search.toLowerCase());
  });

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  if (loading) return (
    <div style={{ background: 'white', borderRadius: 16, padding: '60px', textAlign: 'center', color: '#888', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <Loader2 size={32} color="#94a3b8" style={{ animation: 'spin 0.8s linear infinite', margin: '0 auto 12px', display: 'block' }} />
      {t('loading') || 'Loading...'}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (error) return (
    <div style={{ background: 'white', borderRadius: 16, padding: '60px', textAlign: 'center', color: '#dc2626', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <AlertTriangle size={32} color="#dc2626" style={{ margin: '0 auto 12px', display: 'block' }} />
      {error}
    </div>
  );

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      direction: isRTL ? 'rtl' : 'ltr',
    }}>
      {/* Header row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 18, fontWeight: 700 }}>
          {t('recentAnalyses') || 'Recent Analyses'}
        </h3>

        <div style={{ display: 'flex', gap: 12 }}>
          {/* Search */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
            <input
              type="text"
              placeholder={t('searchReports') || 'Search...'}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ padding: '8px 12px 8px 36px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', width: 220, color: '#1e293b' }}
            />
          </div>
        </div>
      </div>

      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr', padding: '10px 16px', borderBottom: '2px solid #f0f4f8', marginBottom: 4, alignItems: 'center' }}>
        {[t('name'), t('date'), t('status')].map(header => (
          <span key={header} style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>{header}</span>
        ))}
      </div>

      {/* Rows */}
      {filtered.length === 0 ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
          <FolderOpen size={48} strokeWidth={1.5} style={{ opacity: 0.3, margin: '0 auto 16px', display: 'block', color: '#94a3b8' }} />
          {search
            ? (t('noResults') || 'No results found')
            : (t('noAnalysesYet') || 'No analyses yet')}
        </div>
      ) : (
        filtered.map((row: AnalysisRecord, i: number) => {
          const s = statusStyle[row.status] || statusStyle.pending;
          const statusLabel =
            row.status === 'done' ? t('completed') :
              row.status === 'processing' ? t('inProgress') :
                row.status === 'error' ? t('failed') : t('pending');
          const sizeMB = (row.size / (1024 * 1024)).toFixed(2);

          return (
            <div
              key={row._id}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1fr',
                padding: '14px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid #f8f8f8' : 'none',
                alignItems: 'center',
                transition: 'background 0.15s',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{row.originalName}</div>
                <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{sizeMB} MB</div>
              </div>
              <span style={{ color: '#555', fontSize: 13 }}>{new Date(row.createdAt).toLocaleDateString()}</span>
              <div style={{ display: 'flex' }}>
                <span style={{ background: s.bg, color: s.color, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, display: 'inline-block' }}>
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
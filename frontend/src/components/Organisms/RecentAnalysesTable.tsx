import { useState, useEffect } from 'react';
import { analysisApi, type AnalysisRecord } from '../../services/api';
import { useTranslation } from '../../context/TranslationContext';
import { Search, Filter, Trash2, AlertTriangle } from 'lucide-react';

const statusStyle: Record<string, { bg: string; color: string }> = {
  done: { bg: '#dcfce7', color: '#16a34a' },
  processing: { bg: '#fef9c3', color: '#ca8a04' },
  pending: { bg: '#f3f4f6', color: '#6b7280' },
  error: { bg: '#fee2e2', color: '#dc2626' },
};

// ── Confirmation Modal ─────────────────────────────────────────
function ConfirmModal({
  count,
  onConfirm,
  onCancel,
  deleting,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  deleting: boolean;
}) {
  const { t } = useTranslation();
  const message =
    count === 1
      ? (t('confirmDeleteAnalysis') || 'Are you sure you want to delete this analysis?')
      : `${t('confirmDeleteSelected') || 'Are you sure you want to delete'} ${count} ${t('analyses') || 'analyses'}?`;

  return (
    // Backdrop
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24,
      }}
      onClick={onCancel}
    >
      {/* Modal card */}
      <div
        style={{
          background: 'white',
          borderRadius: 16,
          padding: '32px 28px',
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          animation: 'fadeSlideIn 0.18s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div style={{
          width: 52, height: 52, borderRadius: '50%',
          background: '#fee2e2',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          margin: '0 auto 20px',
        }}>
          <AlertTriangle size={26} color="#dc2626" />
        </div>

        {/* Title */}
        <h3 style={{
          textAlign: 'center', color: '#1a3a6b',
          fontSize: 20, fontWeight: 700, margin: '0 0 12px',
        }}>
          {count === 1
            ? (t('deleteUser') || 'Delete analysis')
            : `${t('delete') || 'Delete'} ${count} ${t('analyses') || 'analyses'}`}
        </h3>

        {/* Body */}
        <p style={{
          textAlign: 'center', color: '#64748b',
          fontSize: 15, lineHeight: 1.6, margin: '0 0 28px',
        }}>
          {message}<br />
          <span style={{ color: '#94a3b8', fontSize: 13 }}>
            {t('deleteCannotUndo') || 'This action cannot be undone.'}
          </span>
        </p>

        {/* Buttons */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1, padding: '12px',
              background: '#f1f5f9', color: '#475569',
              border: '1.5px solid #e2e8f0',
              borderRadius: 10, fontSize: 15, fontWeight: 600,
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
            }}
            onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            {t('cancel') || 'Cancel'}
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, padding: '12px',
              background: deleting ? '#fca5a5' : '#dc2626',
              color: 'white', border: 'none',
              borderRadius: 10, fontSize: 15, fontWeight: 700,
              cursor: deleting ? 'not-allowed' : 'pointer',
              transition: 'background 0.15s',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            }}
            onMouseEnter={(e) => { if (!deleting) e.currentTarget.style.background = '#b91c1c'; }}
            onMouseLeave={(e) => { if (!deleting) e.currentTarget.style.background = '#dc2626'; }}
          >
            <Trash2 size={16} />
            {deleting ? (t('deleting') || 'Deleting…') : (t('delete') || 'Delete')}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(-12px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </div>
  );
}

// ── Main Table ─────────────────────────────────────────────────
export default function RecentAnalysesTable({ limit }: { limit?: number }) {
  const { t, isRTL } = useTranslation();
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    analysisApi.getMyAnalyses()
      .then(data => setAnalyses(data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  let filtered = analyses.filter((a: AnalysisRecord) => {
    const matchesSearch = a.originalName.toLowerCase().includes(search.toLowerCase());
    const matchesType = typeFilter === 'all' || a.type === typeFilter;
    return matchesSearch && matchesType;
  });

  if (limit) {
    filtered = filtered.slice(0, limit);
  }

  const allFilteredSelected = filtered.length > 0 && filtered.every(a => selected.has(a._id));
  const someSelected = selected.size > 0;

  const toggleAll = () => {
    setSelected(prev => {
      const next = new Set(prev);
      allFilteredSelected
        ? filtered.forEach(a => next.delete(a._id))
        : filtered.forEach(a => next.add(a._id));
      return next;
    });
  };

  const toggleOne = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleConfirmedDelete = async () => {
    setDeleting(true);
    try {
      await Promise.all([...selected].map(id => analysisApi.deleteAnalysis(id)));
      setAnalyses(prev => prev.filter(a => !selected.has(a._id)));
      setSelected(new Set());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Delete failed');
    } finally {
      setDeleting(false);
      setShowConfirm(false);
    }
  };

  if (loading) return (
    <div style={{ background: 'white', borderRadius: 16, padding: '40px', textAlign: 'center', color: '#888', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      ⏳ {t('loading')}
    </div>
  );

  if (error) return (
    <div style={{ background: 'white', borderRadius: 16, padding: '40px', textAlign: 'center', color: '#dc2626', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      ❌ {error}
    </div>
  );

  return (
    <>
      {/* Confirmation Modal */}
      {showConfirm && (
        <ConfirmModal
          count={selected.size}
          onConfirm={handleConfirmedDelete}
          onCancel={() => setShowConfirm(false)}
          deleting={deleting}
        />
      )}

      <div style={{
        background: 'white', borderRadius: 16,
        padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
        direction: isRTL ? 'rtl' : 'ltr',
      }}>

        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 18, fontWeight: 700 }}>
              {t('recentAnalyses')}
            </h3>
            {someSelected && (
              <button
                onClick={() => setShowConfirm(true)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: '#dc2626', color: 'white',
                  border: 'none', borderRadius: 8,
                  padding: '6px 14px', fontSize: 13, fontWeight: 600,
                  cursor: 'pointer', transition: 'background 0.2s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#b91c1c'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#dc2626'; }}
              >
                <Trash2 size={14} />
                {t('delete')} ({selected.size})
              </button>
            )}
          </div>

          <div style={{ display: 'flex', gap: 12 }}>
            {/* Search */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Search size={16} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
              <input
                type="text"
                placeholder={t('searchReports') || 'Search...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ padding: '8px 12px 8px 36px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', width: 200, color: '#1e293b' }}
              />
            </div>

            {/* Type filter */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Filter size={14} color="#94a3b8" style={{ position: 'absolute', left: 12 }} />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                style={{ padding: '8px 12px 8px 32px', borderRadius: 8, border: '1.5px solid #e2e8f0', fontSize: 13, outline: 'none', background: 'white', cursor: 'pointer', color: '#1e293b' }}
              >
                <option value="all">{t('allTypes')}</option>
                <option value="audio">{t('transcription')}</option>
                <option value="video">{t('videoAnalysisType')}</option>
              </select>
            </div>
          </div>
        </div>

        {/* Column headers */}
        <div style={{ display: 'grid', gridTemplateColumns: '40px 2fr 1.5fr 1.2fr 1fr', padding: '10px 0', borderBottom: '2px solid #f0f4f8', marginBottom: 4, alignItems: 'center' }}>
          <input
            type="checkbox"
            checked={allFilteredSelected}
            onChange={toggleAll}
            style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1a3a6b' }}
          />
          {[t('name'), t('type'), t('date'), t('status')].map(header => (
            <span key={header} style={{ fontSize: 13, fontWeight: 700, color: '#888' }}>{header}</span>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 0', textAlign: 'center', color: '#aaa', fontSize: 14 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📂</div>
            {search || typeFilter !== 'all'
              ? (t('noResults') || 'No results found')
              : (t('noAnalysesYet') || 'No analyses yet')}
          </div>
        ) : (
          filtered.map((row: AnalysisRecord, i: number) => {
            const s = statusStyle[row.status] || statusStyle.pending;
            const isSelected = selected.has(row._id);
            const typeLabel = row.type === 'audio' ? t('transcription') : t('videoAnalysisType');
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
                  gridTemplateColumns: '40px 2fr 1.5fr 1.2fr 1fr',
                  padding: '14px 8px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f8f8f8' : 'none',
                  alignItems: 'center',
                  background: isSelected ? '#eff6ff' : 'transparent',
                  borderRadius: isSelected ? 8 : 0,
                  transition: 'background 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleOne(row._id)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: '#1a3a6b' }}
                />
                <div>
                  <div style={{ fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{row.originalName}</div>
                  <div style={{ color: '#aaa', fontSize: 12, marginTop: 2 }}>{sizeMB} MB</div>
                </div>
                <span style={{ color: '#555', fontSize: 13 }}>{typeLabel}</span>
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
    </>
  );
}
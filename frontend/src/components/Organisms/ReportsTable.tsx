import { useState, useEffect } from 'react';
import { Eye, Download, Trash2, Filter, AlertOctagon, AlertTriangle, Activity, ShieldCheck, ShieldAlert } from 'lucide-react';
import StatusBadge from '../Atoms/StatusBadge';
import SizeBadge from '../Atoms/SizeBadge';
import TypeBadge from '../Atoms/TypeBadge';
import ReportFilters from '../Molecules/ReportFilters';
import { useTranslation } from '../../context/TranslationContext';
import type { AnalysisRecord } from '../../services/api';
import { analysisApi } from '../../services/api';
import { t } from 'i18next';

interface ReportsTableProps {
  initialReports: AnalysisRecord[];
}

export default function ReportsTable({ initialReports }: ReportsTableProps) {
const [search, setSearch]     = useState('');
const [user, setUser]         = useState('');
const [type, setType]         = useState('');
const [status, setStatus]     = useState('');
const [severity, setSeverity] = useState('');
const [reports, setReports]   = useState<AnalysisRecord[]>(initialReports);

  useEffect(() => {
    setReports(initialReports);
  }, [initialReports]);

  const mapStatus = (s: string) => {
    if (s === 'done') return 'Completed';
    if (s === 'error') return 'Failed';
    return 'Processing';
  };

  const mapType = (t: string) => {
    if (t === 'audio') return 'Audio Transcription';
    if (t === 'video') return 'Video Analysis';
    if (t === 'groupActivity') return 'Video Analysis';
    return 'PDF Report';
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 MB';
    const mb = bytes / (1024 * 1024);
    return mb.toFixed(1) + ' MB';
  };

  const formatDate = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const filtered = reports.filter(r => {
    const mappedUser = r.userId?.name || 'User';
    const matchesSearch = (search === '' || 
      r._id.includes(search) || 
      mappedUser.toLowerCase().includes(search.toLowerCase()) || 
      r.originalName.toLowerCase().includes(search.toLowerCase())
    );
    const matchesUser = (user === '' || mappedUser === user);
    const matchesType = (type === '' || mapType(r.type) === type);
    const matchesStatus = (status === '' || mapStatus(r.status) === status);
    const matchesSeverity = (severity === '' || 
        (r.type === 'audio' && r.extractedEntities?.severity === severity)
    );
    
    return matchesSearch && matchesUser && matchesType && matchesStatus && matchesSeverity;
});

  const handleDelete = async (id: string) => {
    if (!window.confirm(t('confirmDelete'))) return;
    try {
      await analysisApi.deleteAnalysis(id);
      setReports(prev => prev.filter(r => r._id !== id));
    } catch (err) {
      console.error('Delete failed', err);
    }
  };

  const handleDownload = async (id: string, name: string) => {
    try {
      await analysisApi.downloadReport(id, name);
    } catch (err) {
      alert(t('downloadFailed'));
    }
  };

  const columns = [
    'ID ↕', t('user') + ' ↕', t('type') + ' ↕',
    t('filename') + ' ↕', t('date') + ' ↕',
    t('size') + ' ↕', t('status') + ' ↕', 'Severity', t('actions'),
];

  return (
    <>
      <ReportFilters
    search={search} onSearch={setSearch}
    user={user}     onUser={setUser}
    type={type}     onType={setType}
    status={status} onStatus={setStatus}
    total={filtered.length}
/>

{/* Severity Filter Bar */}
<div style={{
    background: 'white', borderRadius: 12,
    padding: '14px 20px', marginBottom: 16,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', alignItems: 'center', gap: 12,
}}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap' }}>
        <ShieldAlert size={15} /> Incident Severity:
    </div>
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        <select
            value={severity}
            onChange={e => setSeverity(e.target.value)}
            style={{
                padding: '9px 36px 9px 14px',
                border: `1.5px solid ${
                    severity === 'critical' ? '#fecaca' :
                    severity === 'high'     ? '#fed7aa' :
                    severity === 'medium'   ? '#fde68a' :
                    severity === 'low'      ? '#bbf7d0' : '#e2e8f0'
                }`,
                borderRadius: 8,
                fontSize: 13,
                outline: 'none',
                appearance: 'none' as any,
                WebkitAppearance: 'none' as any,
                background: severity === 'critical' ? '#fff1f2' :
                            severity === 'high'     ? '#fff7ed' :
                            severity === 'medium'   ? '#fefce8' :
                            severity === 'low'      ? '#f0fdf4' : 'white',
                color: severity === 'critical' ? '#dc2626' :
                       severity === 'high'     ? '#c2410c' :
                       severity === 'medium'   ? '#ca8a04' :
                       severity === 'low'      ? '#16a34a' : '#1e293b',
                fontWeight: severity !== '' ? 700 : 400,
                cursor: 'pointer',
                minWidth: 200,
            }}
        >
            <option value="">All Severities</option>
            <option value="critical">Critical — {reports.filter(r => r.type === 'audio' && r.extractedEntities?.severity === 'critical').length} audio(s)</option>
            <option value="high">High — {reports.filter(r => r.type === 'audio' && r.extractedEntities?.severity === 'high').length} audio(s)</option>
            <option value="medium">Medium — {reports.filter(r => r.type === 'audio' && r.extractedEntities?.severity === 'medium').length} audio(s)</option>
            <option value="low">Low — {reports.filter(r => r.type === 'audio' && r.extractedEntities?.severity === 'low').length} audio(s)</option>
        </select>
        <Filter size={14} color={
            severity === 'critical' ? '#dc2626' :
            severity === 'high'     ? '#c2410c' :
            severity === 'medium'   ? '#ca8a04' :
            severity === 'low'      ? '#16a34a' : '#94a3b8'
        } style={{ position: 'absolute', right: 12, pointerEvents: 'none' }} />
    </div>
    {severity !== '' && (
        <button
            onClick={() => setSeverity('')}
            style={{
                background: '#f1f5f9', border: '1px solid #e2e8f0',
                color: '#64748b', borderRadius: 6,
                padding: '6px 12px', fontSize: 12,
                cursor: 'pointer', fontWeight: 500,
            }}
        >
            Clear
        </button>
    )}
</div>

      <div style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: '#dbeafe' }}>
              {columns.map(col => (
                <th key={col} style={{ padding: '14px 16px', textAlign: 'left', color: '#1a3a6b', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r._id}
                style={{ borderBottom: '1px solid #f0f4f8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{r._id.substring(r._id.length - 8).toUpperCase()}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#444' }}>{r.userId?.name || 'User'}</td>
                <td style={{ padding: '14px 16px' }}><TypeBadge type={mapType(r.type)} /></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#555' }}>{r.originalName}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>{formatDate(r.createdAt)}</td>
                <td style={{ padding: '14px 16px' }}><SizeBadge size={formatSize(r.size)} /></td>
                <td style={{ padding: '14px 16px' }}><StatusBadge status={mapStatus(r.status)} /></td>
<td style={{ padding: '14px 16px' }}>
    {r.type === 'audio' && r.extractedEntities?.severity ? (() => {
    const sev = r.extractedEntities!.severity!;
    const cfg: Record<string, { bg: string; color: string; border: string; icon: React.ReactNode }> = {
        critical: { bg: '#fff1f2', color: '#dc2626', border: '#fecaca', icon: <AlertOctagon size={13} /> },
        high:     { bg: '#fff7ed', color: '#c2410c', border: '#fed7aa', icon: <AlertTriangle size={13} /> },
        medium:   { bg: '#fefce8', color: '#ca8a04', border: '#fde68a', icon: <Activity size={13} /> },
        low:      { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', icon: <ShieldCheck size={13} /> },
    };
    const s = cfg[sev];
    return s ? (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            background: s.bg, color: s.color,
            border: `1px solid ${s.border}`,
            padding: '4px 10px', borderRadius: 20,
            fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
        }}>
            {s.icon} {sev.toUpperCase()}
        </span>
    ) : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>;
})() : <span style={{ color: '#94a3b8', fontSize: 12 }}>—</span>}
</td>
<td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span title="View" style={{ display: 'flex' }}>
                      <Eye 
                        size={18} 
                        style={{ cursor: 'pointer', color: '#1a3a6b' }} 
                        onClick={() => window.open(`/analysis/${r._id}`, '_blank')}
                      />
                    </span>
                    <span title="Download" style={{ display: 'flex' }}>
                      <Download 
                        size={18} 
                        style={{ cursor: 'pointer', color: '#1a3a6b' }} 
                        onClick={() => handleDownload(r._id, r.originalName)}
                      />
                    </span>
                    <span title="Delete" style={{ display: 'flex' }}>
                      <Trash2 
                        size={18} 
                        style={{ cursor: 'pointer', color: '#dc2626' }} 
                        onClick={() => handleDelete(r._id)}
                      />
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
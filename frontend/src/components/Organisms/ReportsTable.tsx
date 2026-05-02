import { useState, useEffect } from 'react';
import { Eye, Download, Trash2 } from 'lucide-react';
import StatusBadge from '../Atoms/StatusBadge';
import SizeBadge from '../Atoms/SizeBadge';
import TypeBadge from '../Atoms/TypeBadge';
import ReportFilters from '../Molecules/ReportFilters';
import { useTranslation } from '../../context/TranslationContext';
import type { AnalysisRecord } from '../../services/api';
import { analysisApi } from '../../services/api';

interface ReportsTableProps {
  initialReports: AnalysisRecord[];
}

export default function ReportsTable({ initialReports }: ReportsTableProps) {
  const { t } = useTranslation();
  const [search, setSearch]   = useState('');
  const [user, setUser]       = useState('');
  const [type, setType]       = useState('');
  const [status, setStatus]   = useState('');
  const [reports, setReports] = useState<AnalysisRecord[]>(initialReports);

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
    
    return matchesSearch && matchesUser && matchesType && matchesStatus;
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
    t('size') + ' ↕', t('status') + ' ↕', t('actions'),
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
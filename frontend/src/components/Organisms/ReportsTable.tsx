import { useState } from 'react';
import StatusBadge from '../Atoms/StatusBadge';
import SizeBadge from '../Atoms/SizeBadge';
import TypeBadge from '../Atoms/TypeBadge';
import ReportFilters from '../Molecules/ReportFilters';

type Report = {
  id: string; user: string; type: string;
  filename: string; date: string; size: string; status: string;
}

const allReports: Report[] = [
  { id: 'RPT-2026-001456', user: 'Jean Dupont',    type: 'Audio Transcription', filename: 'Client_Meeting_Q4_2025.pdf',  date: '2026-02-22 14:32', size: '0.8 MB', status: 'Completed' },
  { id: 'RPT-2026-001455', user: 'Marie Claire',   type: 'Video Analysis',      filename: 'Product_Demo_Analysis.pdf',   date: '2026-02-22 13:15', size: '2.3 MB', status: 'Completed' },
  { id: 'RPT-2026-001454', user: 'Pierre Martin',  type: 'PDF Report',          filename: 'Q4_Financial_Summary.pdf',    date: '2026-02-22 12:00', size: '1.1 MB', status: 'Processing' },
  { id: 'RPT-2026-001453', user: 'Sophie Bernard', type: 'Live Transcription',  filename: 'Board_Meeting_Feb.pdf',       date: '2026-02-21 17:45', size: '0.5 MB', status: 'Completed' },
  { id: 'RPT-2026-001452', user: 'Luc Moreau',     type: 'Video Analysis',      filename: 'large_file_analysis.pdf',     date: '2026-02-21 16:20', size: '3.1 MB', status: 'Failed' },
  { id: 'RPT-2026-001451', user: 'Jean Dupont',    type: 'Audio Transcription', filename: 'Sales_Call_Recording.pdf',    date: '2026-02-21 14:10', size: '0.9 MB', status: 'Completed' },
  { id: 'RPT-2026-001450', user: 'Marie Claire',   type: 'PDF Report',          filename: 'Marketing_Report_Feb.pdf',    date: '2026-02-20 11:30', size: '1.4 MB', status: 'Completed' },
  { id: 'RPT-2026-001449', user: 'Pierre Martin',  type: 'Live Transcription',  filename: 'Team_Standup_Notes.pdf',      date: '2026-02-20 09:00', size: '0.3 MB', status: 'Completed' },
  { id: 'RPT-2026-001448', user: 'Sophie Bernard', type: 'Audio Transcription', filename: 'Client_Onboarding.pdf',       date: '2026-02-19 16:00', size: '0.7 MB', status: 'Completed' },
  { id: 'RPT-2026-001447', user: 'Luc Moreau',     type: 'Video Analysis',      filename: 'Product_Launch_Video.pdf',    date: '2026-02-19 14:00', size: '2.8 MB', status: 'Completed' },
  { id: 'RPT-2026-001446', user: 'Jean Dupont',    type: 'PDF Report',          filename: 'Annual_Summary_2025.pdf',     date: '2026-02-18 10:00', size: '1.9 MB', status: 'Completed' },
  { id: 'RPT-2026-001445', user: 'Marie Claire',   type: 'Audio Transcription', filename: 'Investor_Call_Q1.pdf',        date: '2026-02-17 09:30', size: '0.6 MB', status: 'Completed' },
];

export default function ReportsTable() {
  const [search, setSearch]   = useState('');
  const [user, setUser]       = useState('');
  const [type, setType]       = useState('');
  const [status, setStatus]   = useState('');
  const [reports, setReports] = useState<Report[]>(allReports);

  // ── Filtering ──────────────────────────────────
  const filtered = reports.filter(r =>
    (search === '' || r.id.includes(search) || r.user.toLowerCase().includes(search.toLowerCase()) || r.filename.toLowerCase().includes(search.toLowerCase())) &&
    (user   === '' || r.user   === user) &&
    (type   === '' || r.type   === type) &&
    (status === '' || r.status === status)
  );

  const handleDelete = (id: string) => {
    setReports(prev => prev.filter(r => r.id !== id));
  };

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
              {['ID ↕', 'User ↕', 'Type ↕', 'Filename ↕', 'Date ↕', 'Size ↕', 'Status ↕', 'Actions'].map(col => (
                <th key={col} style={{ padding: '14px 16px', textAlign: 'left', color: '#1a3a6b', fontSize: 13, fontWeight: 700, whiteSpace: 'nowrap' }}>
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((r, i) => (
              <tr key={i}
                style={{ borderBottom: '1px solid #f0f4f8' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
                onMouseLeave={e => (e.currentTarget.style.background = 'white')}
              >
                <td style={{ padding: '14px 16px', fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>{r.id}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#444' }}>{r.user}</td>
                <td style={{ padding: '14px 16px' }}><TypeBadge type={r.type} /></td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#555' }}>{r.filename}</td>
                <td style={{ padding: '14px 16px', fontSize: 13, color: '#555', whiteSpace: 'nowrap' }}>{r.date}</td>
                <td style={{ padding: '14px 16px' }}><SizeBadge size={r.size} /></td>
                <td style={{ padding: '14px 16px' }}><StatusBadge status={r.status} /></td>
                <td style={{ padding: '14px 16px' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    {/* View */}
                    <span title="View" style={{ cursor: 'pointer', fontSize: 16, color: '#1a3a6b' }}>👁️</span>
                    {/* Download */}
                    <span title="Download" style={{ cursor: 'pointer', fontSize: 16, color: '#1a3a6b' }}>⬇️</span>
                    {/* Delete */}
                    <span title="Delete" onClick={() => handleDelete(r.id)} style={{ cursor: 'pointer', fontSize: 16, color: '#dc2626' }}>🗑️</span>
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
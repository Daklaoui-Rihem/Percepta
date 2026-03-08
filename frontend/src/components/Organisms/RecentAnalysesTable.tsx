const analyses = [
  { name: 'Client Meeting Q4',  type: 'Transcription',  date: '2026-02-20', status: 'Completed'   },
  { name: 'Product Demo Video', type: 'Video Analysis', date: '2026-02-20', status: 'In Progress'  },
  { name: 'Training Session',   type: 'Transcription',  date: '2026-02-19', status: 'Completed'   },
  { name: 'Marketing Campaign', type: 'Video Analysis', date: '2026-02-19', status: 'Completed'   },
  { name: 'Team Standup',       type: 'Transcription',  date: '2026-02-18', status: 'Error'       },
];

const statusStyle: Record<string, { bg: string; color: string }> = {
  'Completed':   { bg: '#dcfce7', color: '#16a34a' },
  'In Progress': { bg: '#fef9c3', color: '#ca8a04' },
  'Error':       { bg: '#fee2e2', color: '#dc2626' },
};

export default function RecentAnalysesTable() {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      overflow: 'hidden',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f4f8',
    }}>
      {/* Table header */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid #f0f4f8' }}>
        <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 18 }}>Analyses Récentes</h3>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #f0f4f8' }}>
            {['Nom', 'Type', 'Date', 'Statut'].map(col => (
              <th key={col} style={{
                padding: '12px 24px',
                textAlign: 'left',
                color: '#888',
                fontSize: 13,
                fontWeight: 600,
              }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {analyses.map((a, i) => (
            <tr
              key={i}
              style={{ borderBottom: '1px solid #f0f4f8', cursor: 'pointer' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f8fbff')}
              onMouseLeave={e => (e.currentTarget.style.background = 'white')}
            >
              {/* Name — clickable blue link style */}
              <td style={{ padding: '16px 24px', color: '#1a3a6b', fontWeight: 600, fontSize: 14 }}>
                {a.name}
              </td>
              <td style={{ padding: '16px 24px', color: '#666', fontSize: 14 }}>
                {a.type}
              </td>
              <td style={{ padding: '16px 24px', color: '#666', fontSize: 14 }}>
                {a.date}
              </td>
              <td style={{ padding: '16px 24px' }}>
                <span style={{
                  background: statusStyle[a.status]?.bg,
                  color: statusStyle[a.status]?.color,
                  padding: '4px 14px',
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 600,
                }}>
                  {a.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
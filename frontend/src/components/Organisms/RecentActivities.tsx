
import ActivityTypeBadge from '../Molecules/ActivityTypeBadge';

const activities = [
  { time: '2026-02-22 14:32', user: 'Jean Dupont',    action: 'Uploaded audio file "Client Meeting Q4.mp3"',   type: 'upload' },
  { time: '2026-02-22 14:28', user: 'Marie Claire',   action: 'Generated PDF report for "Product Demo Video"', type: 'report' },
  { time: '2026-02-22 14:15', user: 'Pierre Martin',  action: 'Started video analysis',                        type: 'analysis' },
  { time: '2026-02-22 14:05', user: 'Sophie Bernard', action: 'Completed transcription',                       type: 'transcription' },
  { time: '2026-02-22 13:58', user: 'Luc Moreau',     action: 'Error: Failed to process "large_file.mp4"',     type: 'error' },
];

export default function RecentActivities() {

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginTop: 28 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ color: '#1a3a6b', margin: 0, fontWeight: 700 }}>{('recentActivities')}</h3>
        <span style={{ color: '#1a3a6b', fontSize: 14, cursor: 'pointer' }}>{('viewAll')}</span>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ background: '#dbeafe' }}>
            {[('timestamp'), ('user'), ('action'),('type')].map(col => (
              <th key={col} style={{ padding: '12px 16px', textAlign: 'left', color: '#1a3a6b', fontSize: 14, fontWeight: 700 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {activities.map((a, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #f0f4f8' }}>
              <td style={{ padding: '16px', fontSize: 14, color: '#555' }}>🕐 {a.time}</td>
              <td style={{ padding: '16px', fontSize: 14, fontWeight: 600, color: '#1a3a6b' }}>{a.user}</td>
              <td style={{ padding: '16px', fontSize: 14, color: '#555' }}>{a.action}</td>
              <td style={{ padding: '16px' }}><ActivityTypeBadge type={a.type} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
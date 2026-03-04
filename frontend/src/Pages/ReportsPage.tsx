import { useState } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import StatsRow from '../components/Organisms/StatsRow';
import ReportsTable from '../components/Organisms/ReportsTable';

const reportStats = [
  { icon: '📊', value: '12',  label: 'Total Reports', change: '+2',     borderColor: '#60a5fa' },
  { icon: '📄', value: '10',  label: 'Completed',     change: '+2',     borderColor: '#22c55e' },
  { icon: '🔄', value: '1',   label: 'Processing',    change: '0',      borderColor: '#2563eb' },
  { icon: '🗑️', value: '1',   label: 'Failed',        change: '-0.5%',  borderColor: '#dc2626' },
];

export default function ReportsPage() {
  const [activePage, setActivePage] = useState('Reports');

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ color: '#1a3a6b', margin: 0 }}>Reports — Global View</h2>
        <button style={{
          background: '#1a3a6b', color: 'white',
          border: 'none', borderRadius: 8,
          padding: '12px 20px', fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          📋 Export to CSV
        </button>
      </div>

      {/* Stats row reused with report-specific data */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
        {reportStats.map(s => (
          <div key={s.label} style={{
            background: 'white', borderRadius: 12,
            padding: '20px 24px', flex: 1,
            borderLeft: `4px solid ${s.borderColor}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
              <span style={{ fontSize: 24 }}>{s.icon}</span>
            </div>
            <div style={{ fontSize: 28, fontWeight: 700, color: '#1a3a6b' }}>{s.value}</div>
            <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>

      <ReportsTable />
    </DashboardTemplate>
  );
}
import { useState } from 'react';
import { BarChart3, FileText, RefreshCw, Trash2, Download } from 'lucide-react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import ReportsTable from '../components/Organisms/ReportsTable';
import { useTranslation } from '../context/TranslationContext';

export default function ReportsPage() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState('Reports');

  const reportStats = [
    { icon: BarChart3,  value: '12', label: t('totalReports'), borderColor: '#60a5fa' },
    { icon: FileText,   value: '10', label: t('completed'),    borderColor: '#22c55e' },
    { icon: RefreshCw,  value: '1',  label: t('processing'),   borderColor: '#2563eb' },
    { icon: Trash2,     value: '1',  label: t('failed'),       borderColor: '#dc2626' },
  ];

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <h2 style={{ color: '#1a3a6b', margin: 0 }}>{t('reportsGlobalView')}</h2>
        <button style={{
          background: '#1a3a6b', color: 'white',
          border: 'none', borderRadius: 8,
          padding: '12px 20px', fontSize: 14,
          fontWeight: 600, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <Download size={18} /> {t('exportCsv')}
        </button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28 }}>
        {reportStats.map(s => (
          <div key={s.label} style={{
            background: 'white', borderRadius: 12,
            padding: '20px 24px', flex: 1,
            borderLeft: `4px solid ${s.borderColor}`,
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          }}>
            <div style={{ color: s.borderColor, marginBottom: 10 }}>
              <s.icon size={24} strokeWidth={2} />
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
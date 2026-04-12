import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ClientTemplate from '../components/Templates/ClientTemplate';
import ClientStatsRow from '../components/Organisms/ClientStatsRow';
import RecentAnalysesTable from '../components/Organisms/RecentAnalysesTable';
import { useTranslation } from '../context/TranslationContext';

export default function ClientDashboardPage() {
  const [activePage, setActivePage] = useState('Home');
  const navigate = useNavigate();
  const { t, isRTL } = useTranslation();

  return (
    <ClientTemplate activePage={activePage} onNavigate={setActivePage}>
      <div style={{ direction: isRTL ? 'rtl' : 'ltr' }}>

        {/* Page title — translated */}
        <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
          {t('dashboard')}
        </h2>

        {/* Stat cards */}
        <ClientStatsRow />

        {/* Action buttons */}
        <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
          <button
            onClick={() => navigate('/client/transcriptions/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#1a3a6b', color: 'white',
              border: 'none', borderRadius: 8,
              padding: '14px 24px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            ⊕ {t('newTranscription')}
          </button>

          <button
            onClick={() => navigate('/client/video-analysis/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 8,
              background: '#2563eb', color: 'white',
              border: 'none', borderRadius: 8,
              padding: '14px 24px', fontSize: 15,
              fontWeight: 600, cursor: 'pointer',
            }}
          >
            ▷ {t('analyzeVideo')}
          </button>
        </div>

        {/* Recent analyses table */}
        <RecentAnalysesTable limit={5} />

      </div>
    </ClientTemplate>
  );
}
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';  // ← add this
import ClientTemplate from '../components/Templates/ClientTemplate';
import ClientStatsRow from '../components/Organisms/ClientStatsRow';
import RecentAnalysesTable from '../components/Organisms/RecentAnalysesTable';

export default function ClientDashboardPage() {
  const [activePage, setActivePage] = useState('Home');
  const navigate = useNavigate();  // ← add this

  return (
    <ClientTemplate activePage={activePage} onNavigate={setActivePage}>

      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        Tableau de bord
      </h2>

      <ClientStatsRow />

      <div style={{ display: 'flex', gap: 16, marginBottom: 32 }}>
        {/* Button 1 — navigates to transcription page */}
        <button
          onClick={() => navigate('/client/transcriptions/new')}  // ← add onClick
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#1a3a6b', color: 'white',
            border: 'none', borderRadius: 8,
            padding: '14px 24px', fontSize: 15,
            fontWeight: 600, cursor: 'pointer',
          }}>
          ⊕ Nouvelle Transcription
        </button>

        {/* Button 2 — navigates to video analysis page */}
        <button
          onClick={() => navigate('/client/video-analysis/new')}  // ← add onClick
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: '#2563eb', color: 'white',
            border: 'none', borderRadius: 8,
            padding: '14px 24px', fontSize: 15,
            fontWeight: 600, cursor: 'pointer',
          }}>
          ▷ Analyser une Vidéo
        </button>
      </div>

      <RecentAnalysesTable />

    </ClientTemplate>
  );
}
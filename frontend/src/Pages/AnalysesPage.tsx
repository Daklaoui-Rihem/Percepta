import { useState } from 'react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import { useTranslation } from '../context/TranslationContext';

export default function AnalysesPage() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState('Analyses');

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <h2 style={{ color: '#1a3a6b', marginBottom: 24 }}>{t('analyses')}</h2>
      <div style={{
        background: 'white',
        borderRadius: 12,
        padding: '60px',
        textAlign: 'center',
        color: '#aaa',
        fontSize: 15,
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {t('analysesComing')}
      </div>
    </DashboardTemplate>
  );
}
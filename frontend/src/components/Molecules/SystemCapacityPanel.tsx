import { useTranslation } from '../../context/TranslationContext';

export default function SystemCapacityPanel() {
  const { t } = useTranslation();
  const utilization = 83.3;
  const isCritical = utilization > 80;

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f4f8', minWidth: 280,
    }}>
      <h4 style={{ color: '#1a3a6b', marginBottom: 16, fontSize: 16 }}>{t('systemCapacity')}</h4>

      {/* Warning box — only shows when critical */}
      {isCritical && (
        <div style={{
          background: '#fff7ed', border: '1px solid #fed7aa',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
        }}>
          <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#c2410c', fontSize: 14 }}>
            {t('criticalCapacity')}
          </p>
          <p style={{ margin: 0, color: '#c2410c', fontSize: 13 }}>
            {t('systemRunningAt')} {utilization}% {t('considerUpgrade')}
          </p>
        </div>
      )}

      {/* Current Usage */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ color: '#888', fontSize: 13 }}>{t('currentUsage')}</span>
        <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 13 }}>5 / 6</span>
      </div>

      {/* Orange usage bar */}
      <div style={{ background: '#e5e7eb', borderRadius: 4, height: 8, marginBottom: 12 }}>
        <div style={{
          width: `${utilization}%`,
          background: '#f97316',
          height: '100%', borderRadius: 4,
        }} />
      </div>

      {/* Utilization % */}
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ color: '#888', fontSize: 13 }}>{t('utilization')}</span>
        <span style={{ fontWeight: 700, color: '#f97316', fontSize: 13 }}>{utilization}%</span>
      </div>
    </div>
  );
}
import { useTranslation } from '../../context/TranslationContext';

type Props = {
  search: string;
  onSearch: (v: string) => void;
  user: string;
  onUser: (v: string) => void;
  type: string;
  onType: (v: string) => void;
  status: string;
  onStatus: (v: string) => void;
  total: number;
}

export default function ReportFilters({ search, onSearch, user, onUser, type, onType, status, onStatus, total }: Props) {
  const { t } = useTranslation();

  const selectStyle: React.CSSProperties = {
    padding: '10px 14px', borderRadius: 8,
    border: '1.5px solid #d0e4f0', fontSize: 14,
    color: '#444', background: 'white', cursor: 'pointer', outline: 'none',
    flex: 1,
  };

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '24px', marginBottom: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <h4 style={{ color: '#1a3a6b', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        {t('advancedFilters')}
      </h4>
      <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
        {/* Search */}
        <div style={{ flex: 2, display: 'flex', alignItems: 'center', border: '1.5px solid #d0e4f0', borderRadius: 8, padding: '10px 14px', gap: 8 }}>
          <span style={{ color: '#aaa' }}>🔍</span>
          <input
            placeholder={t('searchReports')}
            value={search}
            onChange={e => onSearch(e.target.value)}
            style={{ border: 'none', outline: 'none', fontSize: 14, width: '100%', color: '#444' }}
          />
        </div>

        <select value={user} onChange={e => onUser(e.target.value)} style={selectStyle}>
          <option value="">{t('allUsers')}</option>
          <option>Jean Dupont</option>
          <option>Marie Claire</option>
          <option>Pierre Martin</option>
          <option>Sophie Bernard</option>
          <option>Luc Moreau</option>
        </select>

        <select value={type} onChange={e => onType(e.target.value)} style={selectStyle}>
          <option value="">{t('allTypes')}</option>
          <option>Audio Transcription</option>
          <option>Video Analysis</option>
          <option>PDF Report</option>
          <option>Live Transcription</option>
        </select>

        <select value={status} onChange={e => onStatus(e.target.value)} style={selectStyle}>
          <option value="">{t('allStatus')}</option>
          <option>Completed</option>
          <option>Processing</option>
          <option>Failed</option>
        </select>
      </div>
      <p style={{ color: '#888', fontSize: 13 }}>{t('showing')} {total} {t('reportsSuffix')}</p>
    </div>
  );
}
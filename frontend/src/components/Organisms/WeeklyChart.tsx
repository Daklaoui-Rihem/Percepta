import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer ,Legend } from 'recharts';
import { useTranslation } from '../../context/TranslationContext';

const data = [
  { day: 'Mon', transcriptions: 85, analyses: 60, reports: 50 },
  { day: 'Tue', transcriptions: 92, analyses: 75, reports: 58 },
  { day: 'Wed', transcriptions: 90, analyses: 68, reports: 105 },
  { day: 'Thu', transcriptions: 78, analyses: 80, reports: 70 },
  { day: 'Fri', transcriptions: 120, analyses: 92, reports: 88 },
  { day: 'Sat', transcriptions: 65, analyses: 55, reports: 60 },
  { day: 'Sun', transcriptions: 60, analyses: 45, reports: 30 },
];

export default function WeeklyChart() {
  const { t } = useTranslation();

  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
        <h3 style={{ color: '#1a3a6b', margin: 0 }}>{t('weeklyActivityOverview')}</h3>
        <span style={{ color: '#22c55e', fontSize: 14 }}>↗ +15.3% {t('vsLastWeek')}</span>
      </div>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="day" tick={{ fontSize: 13 }} />
          <YAxis tick={{ fontSize: 13 }} />
          <Tooltip />
          <Legend />
          <Line name={t('transcriptions')} type="monotone" dataKey="transcriptions" stroke="#93c5fd" strokeWidth={2} dot={false} />
          <Line name={t('analyses')} type="monotone" dataKey="analyses"       stroke="#1a3a9f" strokeWidth={2} dot={false} />
          <Line name={t('reportsGlobalView')} type="monotone" dataKey="reports"        stroke="#60a5fa" strokeWidth={2} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
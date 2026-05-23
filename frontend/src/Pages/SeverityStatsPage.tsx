import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Loader2, TrendingUp } from 'lucide-react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import { dashboardApi } from '../services/api';
import type { SeverityStats } from '../services/api';
import { useTranslation } from '../context/TranslationContext';

const SEV_COLORS: Record<string, string> = {
  critical: '#dc2626',
  high: '#f97316',
  medium: '#eab308',
  low: '#22c55e',
  unknown: '#94a3b8',
};

const SEV_BG: Record<string, string> = {
  critical: 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
  high: 'linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%)',
  medium: 'linear-gradient(135deg, #fefce8 0%, #fef9c3 100%)',
  low: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
};

const SEV_ICONS: Record<string, typeof ShieldAlert> = {
  critical: ShieldAlert,
  high: AlertTriangle,
  medium: AlertCircle,
  low: Info,
};

export default function SeverityStatsPage() {
  const { t } = useTranslation();
  const [activePage, setActivePage] = useState(t('severityStats'));
  const [stats, setStats] = useState<SeverityStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dashboardApi.getSeverityStats()
      .then(data => { setStats(data); setLoading(false); })
      .catch(err => { console.error('Failed to fetch severity stats', err); setLoading(false); });
  }, []);

  if (loading) {
    return (
      <DashboardTemplate active={activePage} onNavigate={setActivePage}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
          <Loader2 size={48} color="#3b82f6" className="spin-animation" />
        </div>
        <style>{`
          .spin-animation { animation: spin 1s linear infinite; }
          @keyframes spin { 100% { transform: rotate(360deg); } }
        `}</style>
      </DashboardTemplate>
    );
  }

  const bd = stats?.severityBreakdown || { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  const total = bd.critical + bd.high + bd.medium + bd.low + bd.unknown;

  const pieData = [
    { name: t('critical'), value: bd.critical, color: SEV_COLORS.critical },
    { name: t('high'), value: bd.high, color: SEV_COLORS.high },
    { name: t('medium'), value: bd.medium, color: SEV_COLORS.medium },
    { name: t('low'), value: bd.low, color: SEV_COLORS.low },
    { name: t('unknownSeverity'), value: bd.unknown, color: SEV_COLORS.unknown },
  ].filter(d => d.value > 0);

  const incidentData = stats?.incidentTypes || [];

  // Build analysis type bar chart data
  const typeData = Object.entries(stats?.severityByType || {}).map(([type, sevs]) => ({
    type: type.charAt(0).toUpperCase() + type.slice(1),
    critical: sevs.critical,
    high: sevs.high,
    medium: sevs.medium,
    low: sevs.low,
    unknown: sevs.unknown,
  }));

  const timeline = stats?.timeline || [];
  const recentSevere = stats?.recentSevere || [];

  const cardStyle = (key: string): React.CSSProperties => ({
    background: SEV_BG[key] || '#f8fafc',
    borderRadius: 16,
    padding: '24px 28px',
    flex: 1,
    minWidth: 180,
    position: 'relative',
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
    borderBottom: `4px solid ${SEV_COLORS[key]}`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  });

  const sevKeys = ['critical', 'high', 'medium', 'low'] as const;
  const sevLabels: Record<string, string> = {
    critical: t('critical'),
    high: t('high'),
    medium: t('medium'),
    low: t('low'),
  };

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h2 style={{ color: '#1a3a6b', margin: 0, fontSize: 26, fontWeight: 700 }}>{t('severityStatsTitle')}</h2>
        <p style={{ color: '#64748b', margin: '6px 0 0', fontSize: 15 }}>{t('severityStatsDesc')}</p>
      </div>

      {/* Severity Stat Cards */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        {sevKeys.map(key => {
          const Icon = SEV_ICONS[key];
          const count = bd[key];
          const pct = total > 0 ? ((count / total) * 100).toFixed(1) : '0';
          return (
            <div key={key} style={cardStyle(key)}
              onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <Icon size={28} color={SEV_COLORS[key]} strokeWidth={2.2} />
                <span style={{
                  background: SEV_COLORS[key] + '18',
                  color: SEV_COLORS[key],
                  padding: '4px 12px',
                  borderRadius: 20,
                  fontSize: 13,
                  fontWeight: 600,
                }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: SEV_COLORS[key], lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 14, color: '#475569', marginTop: 6, fontWeight: 600 }}>{sevLabels[key]}</div>
            </div>
          );
        })}
        {/* Total card */}
        <div style={{
          background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
          borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 180,
          boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
          borderBottom: '4px solid #3b82f6',
          transition: 'transform 0.2s, box-shadow 0.2s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TrendingUp size={28} color="#3b82f6" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#1e40af', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 14, color: '#475569', marginTop: 6, fontWeight: 600 }}>{t('totalAnalyzed')}</div>
        </div>
      </div>

      {total === 0 ? (
        <div style={{
          background: 'white', borderRadius: 16, padding: '60px 40px',
          textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        }}>
          <ShieldAlert size={64} color="#94a3b8" strokeWidth={1.5} />
          <p style={{ color: '#64748b', fontSize: 18, marginTop: 16 }}>{t('noSeverityData')}</p>
        </div>
      ) : (
        <>
          {/* Row: Pie + Bar */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            {/* Severity Pie */}
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, flex: 1, minWidth: 360,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('severityBreakdown')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3}
                    dataKey="value" nameKey="name" strokeWidth={2} stroke="#fff">
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }}
                    formatter={(value: any, name: any) => {
                      const valNum = Number(value || 0);
                      return [`${valNum} (${total > 0 ? ((valNum / total) * 100).toFixed(1) : 0}%)`, name];
                    }}
                  />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Incident Type Bar */}
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, flex: 1, minWidth: 360,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('incidentTypeBreakdown')}</h3>
              {incidentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={incidentData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="type" type="category" width={120} tick={{ fontSize: 12, fill: '#334155' }} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }}
                    />
                    <Bar dataKey="count" name={t('incidentCount')} fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8' }}>
                  {t('noSeverityData')}
                </div>
              )}
            </div>
          </div>

          {/* Severity by Type */}
          {typeData.length > 0 && (
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, marginBottom: 28,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('severityByAnalysisType')}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" tick={{ fontSize: 13, fill: '#334155' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="critical" name={t('critical')} fill={SEV_COLORS.critical} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="high" name={t('high')} fill={SEV_COLORS.high} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="medium" name={t('medium')} fill={SEV_COLORS.medium} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="low" name={t('low')} fill={SEV_COLORS.low} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Timeline */}
          {timeline.length > 0 && (
            <div style={{
              background: 'white', borderRadius: 16, padding: 24, marginBottom: 28,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('severityTimeline')}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timeline}>
                  <defs>
                    <linearGradient id="gradCritical" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEV_COLORS.critical} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={SEV_COLORS.critical} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradHigh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEV_COLORS.high} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={SEV_COLORS.high} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradMedium" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEV_COLORS.medium} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={SEV_COLORS.medium} stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradLow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={SEV_COLORS.low} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={SEV_COLORS.low} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="critical" name={t('critical')} stroke={SEV_COLORS.critical} fill="url(#gradCritical)" strokeWidth={2} />
                  <Area type="monotone" dataKey="high" name={t('high')} stroke={SEV_COLORS.high} fill="url(#gradHigh)" strokeWidth={2} />
                  <Area type="monotone" dataKey="medium" name={t('medium')} stroke={SEV_COLORS.medium} fill="url(#gradMedium)" strokeWidth={2} />
                  <Area type="monotone" dataKey="low" name={t('low')} stroke={SEV_COLORS.low} fill="url(#gradLow)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Severe Incidents Table */}
          {recentSevere.length > 0 && (
            <div style={{
              background: 'white', borderRadius: 16, padding: 24,
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
            }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('recentSevereIncidents')}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('filename')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('type')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('severityLevel')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('incidentTypeBreakdown')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('user')}</th>
                      <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSevere.map((item, i) => {
                      const sev = item.extractedEntities?.severity || 'unknown';
                      const sevColor = SEV_COLORS[sev] || '#94a3b8';
                      return (
                        <tr key={item._id} style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: i % 2 === 0 ? '#fafbfc' : 'white',
                          transition: 'background 0.15s',
                        }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f0f7ff'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#fafbfc' : 'white'}>
                          <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {item.originalName}
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              background: item.type === 'audio' ? '#dbeafe' : item.type === 'video' ? '#fae8ff' : '#e0e7ff',
                              color: item.type === 'audio' ? '#1d4ed8' : item.type === 'video' ? '#a21caf' : '#4338ca',
                              padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            }}>
                              {item.type}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{
                              background: sevColor + '18',
                              color: sevColor,
                              padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase',
                            }}>
                              {sev}
                            </span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {item.extractedEntities?.incident_type || '—'}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>
                            {(item.userId as any)?.name || '—'}
                          </td>
                          <td style={{ padding: '14px 16px', color: '#64748b', fontSize: 13 }}>
                            {new Date(item.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardTemplate>
  );
}

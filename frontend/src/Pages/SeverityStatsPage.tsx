import { useState, useEffect } from 'react';
import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, AreaChart, Area, LineChart, Line,
} from 'recharts';
import { ShieldAlert, AlertTriangle, AlertCircle, Info, Loader2, TrendingUp, Calendar, CalendarRange } from 'lucide-react';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import { dashboardApi } from '../services/api';
import type { SeverityStats, AnalysisRecord } from '../services/api';
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

// ── Normalize incident type labels to English ──────────────────
const INCIDENT_TYPE_MAP: Record<string, string> = {
  'Agression': 'Assault', 'Violence': 'Violence', 'Accident': 'Road Accident',
  'Incendie': 'Arson', 'Vol': 'Robbery', 'Cambriolage': 'Burglary',
  'Bagarre': 'Fighting', 'Explosion': 'Explosion', 'Tir': 'Shooting',
  'Normal': 'Normal', 'Vandalisme': 'Vandalism', 'Arrestation': 'Arrest', 'Abus': 'Abuse',
  'اعتداء': 'Assault', 'عنف': 'Violence', 'حادث': 'Road Accident',
  'حريق': 'Arson', 'سرقة': 'Robbery', 'شجار': 'Fighting',
  'انفجار': 'Explosion', 'إطلاق نار': 'Shooting', 'تخريب': 'Vandalism',
  'Assault': 'Assault', 'RoadAccident': 'Road Accident', 'Road Accident': 'Road Accident',
  'Fighting': 'Fighting', 'Shooting': 'Shooting', 'Robbery': 'Robbery',
  'Burglary': 'Burglary', 'Arson': 'Arson', 'Vandalism': 'Vandalism',
  'Abuse': 'Abuse', 'Arrest': 'Arrest', 'Shoplifting': 'Shoplifting',
  'Stealing': 'Stealing', 'Anomaly': 'Anomaly',
};

function normalizeIncidentType(type: string): string {
  return INCIDENT_TYPE_MAP[type] || type;
}

// ── Build monthly data from timeline (real API data) ──────────
// timeline entries look like { date: "2025-01-15", critical: 2, high: 5, ... }
function buildMonthlyData(
  timeline: SeverityStats['timeline'],
  recentSevere: AnalysisRecord[],
  year: number
) {
  const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                        'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Initialise 12 buckets
  const buckets: Record<number, { critical: number; high: number; medium: number; low: number }> = {};
  for (let m = 0; m < 12; m++) {
    buckets[m] = { critical: 0, high: 0, medium: 0, low: 0 };
  }

  // Aggregate from timeline (admin endpoint provides aggregated data)
  timeline.forEach(entry => {
    const d = new Date(entry.date);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    buckets[m].critical += entry.critical || 0;
    buckets[m].high     += entry.high     || 0;
    buckets[m].medium   += entry.medium   || 0;
    buckets[m].low      += entry.low      || 0;
  });

  // Also aggregate from recentSevere records (in case timeline is sparse)
  recentSevere.forEach(record => {
    const sev = record.extractedEntities?.severity;
    if (!sev) return;
    const d = new Date(record.createdAt);
    if (d.getFullYear() !== year) return;
    const m = d.getMonth();
    if (buckets[m] && sev in buckets[m]) {
      // Only add if not already counted via timeline
      // We check by seeing if timeline already had entries for that month
      const alreadyInTimeline = timeline.some(e => {
        const td = new Date(e.date);
        return td.getFullYear() === year && td.getMonth() === m;
      });
      if (!alreadyInTimeline) {
        (buckets[m] as any)[sev] += 1;
      }
    }
  });

  const currentMonth = new Date().getMonth();
  return MONTH_LABELS.slice(0, currentMonth + 1).map((label, i) => ({
    month: label,
    ...buckets[i],
    total: buckets[i].critical + buckets[i].high + buckets[i].medium + buckets[i].low,
  }));
}

// ── Build annual data from timeline (real API data) ───────────
function buildAnnualData(
  timeline: SeverityStats['timeline'],
  recentSevere: AnalysisRecord[]
) {
  const currentYear = new Date().getFullYear();
  const startYear = currentYear - 9;

  // Initialise 10 year buckets
  const buckets: Record<number, { critical: number; high: number; medium: number; low: number }> = {};
  for (let y = startYear; y <= currentYear; y++) {
    buckets[y] = { critical: 0, high: 0, medium: 0, low: 0 };
  }

  // From timeline
  timeline.forEach(entry => {
    const y = new Date(entry.date).getFullYear();
    if (!buckets[y]) return;
    buckets[y].critical += entry.critical || 0;
    buckets[y].high     += entry.high     || 0;
    buckets[y].medium   += entry.medium   || 0;
    buckets[y].low      += entry.low      || 0;
  });

  // From recentSevere (for years not covered by timeline)
  recentSevere.forEach(record => {
    const sev = record.extractedEntities?.severity;
    if (!sev) return;
    const y = new Date(record.createdAt).getFullYear();
    if (!buckets[y]) return;
    const alreadyInTimeline = timeline.some(e => new Date(e.date).getFullYear() === y);
    if (!alreadyInTimeline && sev in buckets[y]) {
      (buckets[y] as any)[sev] += 1;
    }
  });

  return Object.entries(buckets).map(([year, counts]) => ({
    year,
    ...counts,
    total: counts.critical + counts.high + counts.medium + counts.low,
  }));
}

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
        <style>{`.spin-animation{animation:spin 1s linear infinite}@keyframes spin{100%{transform:rotate(360deg)}}`}</style>
      </DashboardTemplate>
    );
  }

  const bd = stats?.severityBreakdown || { critical: 0, high: 0, medium: 0, low: 0, unknown: 0 };
  const total = bd.critical + bd.high + bd.medium + bd.low + bd.unknown;
  const timeline = stats?.timeline || [];
  const recentSevere = stats?.recentSevere || [];
  const currentYear = new Date().getFullYear();

  // ── Derived dynamic data from real API ────────────────────────
  const monthlyData = buildMonthlyData(timeline, recentSevere, currentYear);
  const annualData  = buildAnnualData(timeline, recentSevere);

  const pieData = [
    { name: t('critical'), value: bd.critical, color: SEV_COLORS.critical },
    { name: t('high'),     value: bd.high,     color: SEV_COLORS.high     },
    { name: t('medium'),   value: bd.medium,   color: SEV_COLORS.medium   },
    { name: t('low'),      value: bd.low,       color: SEV_COLORS.low     },
    { name: t('unknownSeverity'), value: bd.unknown, color: SEV_COLORS.unknown },
  ].filter(d => d.value > 0);

  // Normalize & merge incident types
  const normalizedIncidentData = (stats?.incidentTypes || [])
    .reduce<Array<{ type: string; count: number }>>((acc, item) => {
      const normalized = normalizeIncidentType(item.type);
      const existing = acc.find(a => a.type === normalized);
      if (existing) { existing.count += item.count; }
      else { acc.push({ type: normalized, count: item.count }); }
      return acc;
    }, [])
    .sort((a, b) => b.count - a.count);

  const typeData = Object.entries(stats?.severityByType || {}).map(([type, sevs]) => ({
    type: normalizeIncidentType(type.charAt(0).toUpperCase() + type.slice(1)),
    critical: sevs.critical, high: sevs.high,
    medium: sevs.medium, low: sevs.low, unknown: sevs.unknown,
  }));

  const cardStyle = (key: string): React.CSSProperties => ({
    background: SEV_BG[key] || '#f8fafc', borderRadius: 16, padding: '24px 28px',
    flex: 1, minWidth: 180, position: 'relative', overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderBottom: `4px solid ${SEV_COLORS[key]}`,
    transition: 'transform 0.2s, box-shadow 0.2s',
  });

  const chartCard: React.CSSProperties = {
    background: 'white', borderRadius: 16, padding: 24,
    boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
  };

  const sevKeys = ['critical', 'high', 'medium', 'low'] as const;
  const sevLabels: Record<string, string> = {
    critical: t('critical'), high: t('high'), medium: t('medium'), low: t('low'),
  };

  const hasMonthlyData = monthlyData.some(m => m.total > 0);
  const hasAnnualData  = annualData.some(a => a.total > 0);

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
                <span style={{ background: SEV_COLORS[key] + '18', color: SEV_COLORS[key], padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{pct}%</span>
              </div>
              <div style={{ fontSize: 36, fontWeight: 800, color: SEV_COLORS[key], lineHeight: 1 }}>{count}</div>
              <div style={{ fontSize: 14, color: '#475569', marginTop: 6, fontWeight: 600 }}>{sevLabels[key]}</div>
            </div>
          );
        })}
        {/* Total card */}
        <div style={{ background: 'linear-gradient(135deg,#eff6ff 0%,#dbeafe 100%)', borderRadius: 16, padding: '24px 28px', flex: 1, minWidth: 180, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', borderBottom: '4px solid #3b82f6', transition: 'transform 0.2s,box-shadow 0.2s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-3px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = ''; (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <TrendingUp size={28} color="#3b82f6" strokeWidth={2.2} />
          </div>
          <div style={{ fontSize: 36, fontWeight: 800, color: '#1e40af', lineHeight: 1 }}>{total}</div>
          <div style={{ fontSize: 14, color: '#475569', marginTop: 6, fontWeight: 600 }}>{t('totalAnalyzed')}</div>
        </div>
      </div>

      {/* ── MONTHLY CHART — real data from API timeline ── */}
      <div style={{ ...chartCard, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Calendar size={18} color="#2563eb" />
          </div>
          <div>
            <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 17, fontWeight: 700 }}>
              Monthly Incident Overview — {currentYear}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
              Severity breakdown per month · sourced from analysis records
            </p>
          </div>
        </div>
        {!hasMonthlyData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8', flexDirection: 'column', gap: 8 }}>
            <Calendar size={40} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: 14 }}>No data for {currentYear} yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={monthlyData}>
              <defs>
                {(['critical','high','medium','low'] as const).map(sev => (
                  <linearGradient key={sev} id={`mg-${sev}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={SEV_COLORS[sev]} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={SEV_COLORS[sev]} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
              <Legend iconType="circle" />
              <Area type="monotone" dataKey="critical" name={t('critical')} stroke={SEV_COLORS.critical} fill="url(#mg-critical)" strokeWidth={2.5} />
              <Area type="monotone" dataKey="high"     name={t('high')}     stroke={SEV_COLORS.high}     fill="url(#mg-high)"     strokeWidth={2.5} />
              <Area type="monotone" dataKey="medium"   name={t('medium')}   stroke={SEV_COLORS.medium}   fill="url(#mg-medium)"   strokeWidth={2.5} />
              <Area type="monotone" dataKey="low"      name={t('low')}      stroke={SEV_COLORS.low}      fill="url(#mg-low)"      strokeWidth={2.5} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {total === 0 ? (
        <div style={{ background: 'white', borderRadius: 16, padding: '60px 40px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <ShieldAlert size={64} color="#94a3b8" strokeWidth={1.5} />
          <p style={{ color: '#64748b', fontSize: 18, marginTop: 16 }}>{t('noSeverityData')}</p>
        </div>
      ) : (
        <>
          {/* Pie + Incident bar */}
          <div style={{ display: 'flex', gap: 24, marginBottom: 28, flexWrap: 'wrap' }}>
            <div style={{ ...chartCard, flex: 1, minWidth: 360 }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('severityBreakdown')}</h3>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={120} paddingAngle={3} dataKey="value" nameKey="name" strokeWidth={2} stroke="#fff">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }}
                    formatter={(value: any, name: any) => { const v = Number(value || 0); return [`${v} (${total > 0 ? ((v / total) * 100).toFixed(1) : 0}%)`, name]; }} />
                  <Legend verticalAlign="bottom" iconType="circle" wrapperStyle={{ paddingTop: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div style={{ ...chartCard, flex: 1, minWidth: 360 }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('incidentTypeBreakdown')}</h3>
              {normalizedIncidentData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={normalizedIncidentData} layout="vertical" margin={{ left: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                    <YAxis dataKey="type" type="category" width={120} tick={{ fontSize: 12, fill: '#334155' }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                    <Bar dataKey="count" name={t('incidentCount')} fill="#3b82f6" radius={[0, 6, 6, 0]} barSize={22} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 300, color: '#94a3b8' }}>{t('noSeverityData')}</div>
              )}
            </div>
          </div>

          {/* Severity by analysis type */}
          {typeData.length > 0 && (
            <div style={{ ...chartCard, marginBottom: 28 }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('severityByAnalysisType')}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={typeData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="type" tick={{ fontSize: 13, fill: '#334155' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="critical" name={t('critical')} fill={SEV_COLORS.critical} radius={[4,4,0,0]} />
                  <Bar dataKey="high"     name={t('high')}     fill={SEV_COLORS.high}     radius={[4,4,0,0]} />
                  <Bar dataKey="medium"   name={t('medium')}   fill={SEV_COLORS.medium}   radius={[4,4,0,0]} />
                  <Bar dataKey="low"      name={t('low')}      fill={SEV_COLORS.low}       radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* API timeline */}
          {timeline.length > 0 && (
            <div style={{ ...chartCard, marginBottom: 28 }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('severityTimeline')}</h3>
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={timeline}>
                  <defs>
                    {(['critical','high','medium','low'] as const).map(sev => (
                      <linearGradient key={sev} id={`tl-${sev}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={SEV_COLORS[sev]} stopOpacity={0.3} />
                        <stop offset="95%" stopColor={SEV_COLORS[sev]} stopOpacity={0} />
                      </linearGradient>
                    ))}
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                  <Legend iconType="circle" />
                  <Area type="monotone" dataKey="critical" name={t('critical')} stroke={SEV_COLORS.critical} fill="url(#tl-critical)" strokeWidth={2} />
                  <Area type="monotone" dataKey="high"     name={t('high')}     stroke={SEV_COLORS.high}     fill="url(#tl-high)"     strokeWidth={2} />
                  <Area type="monotone" dataKey="medium"   name={t('medium')}   stroke={SEV_COLORS.medium}   fill="url(#tl-medium)"   strokeWidth={2} />
                  <Area type="monotone" dataKey="low"      name={t('low')}      stroke={SEV_COLORS.low}      fill="url(#tl-low)"      strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Recent Severe Table */}
          {recentSevere.length > 0 && (
            <div style={{ ...chartCard, marginBottom: 28 }}>
              <h3 style={{ color: '#1a3a6b', margin: '0 0 20px', fontSize: 17, fontWeight: 700 }}>{t('recentSevereIncidents')}</h3>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                  <thead>
                    <tr style={{ borderBottom: '2px solid #e2e8f0' }}>
                      {[t('filename'), t('type'), t('severityLevel'), t('incidentTypeBreakdown'), t('user'), t('date')].map(h => (
                        <th key={h} style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {recentSevere.map((item, i) => {
                      const sev = item.extractedEntities?.severity || 'unknown';
                      const sevColor = SEV_COLORS[sev] || '#94a3b8';
                      const incidentType = item.extractedEntities?.incident_type
                        ? normalizeIncidentType(item.extractedEntities.incident_type)
                        : '—';
                      return (
                        <tr key={item._id} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fafbfc' : 'white', transition: 'background 0.15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = '#f0f7ff'}
                          onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = i % 2 === 0 ? '#fafbfc' : 'white'}>
                          <td style={{ padding: '14px 16px', fontWeight: 500, color: '#1e293b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.originalName}</td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: item.type === 'audio' ? '#dbeafe' : '#fae8ff', color: item.type === 'audio' ? '#1d4ed8' : '#a21caf', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>{item.type}</span>
                          </td>
                          <td style={{ padding: '14px 16px' }}>
                            <span style={{ background: sevColor + '18', color: sevColor, padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700, textTransform: 'uppercase' }}>{sev}</span>
                          </td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>{incidentType}</td>
                          <td style={{ padding: '14px 16px', color: '#475569' }}>{(item.userId as any)?.name || '—'}</td>
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

      {/* ── ANNUAL CHART — real data from API ── */}
      <div style={{ ...chartCard, marginBottom: 28 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fef3c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CalendarRange size={18} color="#d97706" />
          </div>
          <div>
            <h3 style={{ color: '#1a3a6b', margin: 0, fontSize: 17, fontWeight: 700 }}>
              Annual Incident Trend — {currentYear - 9}–{currentYear}
            </h3>
            <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>
              Total incidents per year with severity breakdown · sourced from analysis records
            </p>
          </div>
        </div>

        {!hasAnnualData ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#94a3b8', flexDirection: 'column', gap: 8 }}>
            <CalendarRange size={40} strokeWidth={1.5} />
            <p style={{ margin: 0, fontSize: 14 }}>No historical data available yet</p>
            <p style={{ margin: 0, fontSize: 12 }}>Data will appear here as analyses accumulate over time</p>
          </div>
        ) : (
          <>
            {/* Total trend line */}
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={annualData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                <Line type="monotone" dataKey="total" name="Total Incidents" stroke="#3b82f6" strokeWidth={3}
                  dot={{ fill: '#3b82f6', r: 5 }} activeDot={{ r: 7 }} />
              </LineChart>
            </ResponsiveContainer>

            {/* Stacked bar by severity */}
            <div style={{ marginTop: 24 }}>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 12, fontWeight: 600 }}>Severity breakdown per year</p>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={annualData} barSize={28}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="year" tick={{ fontSize: 12, fill: '#64748b' }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '12px 16px' }} />
                  <Legend iconType="circle" />
                  <Bar dataKey="critical" name={t('critical')} stackId="a" fill={SEV_COLORS.critical} />
                  <Bar dataKey="high"     name={t('high')}     stackId="a" fill={SEV_COLORS.high} />
                  <Bar dataKey="medium"   name={t('medium')}   stackId="a" fill={SEV_COLORS.medium} />
                  <Bar dataKey="low"      name={t('low')}      stackId="a" fill={SEV_COLORS.low} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </div>
    </DashboardTemplate>
  );
}
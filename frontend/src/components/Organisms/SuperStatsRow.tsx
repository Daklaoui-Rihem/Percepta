import SuperStatCard from '../Molecules/SuperStatCard';

export default function SuperStatsRow() {
  const stats = [
    { icon: '🏢', label: 'Total Tenants',      value: '5',     change: '+2 this month',    changeColor: '#22c55e' },
    { icon: '👥', label: 'Total Users',         value: '534',   change: '+47 this week',    changeColor: '#22c55e' },
    { icon: '🖥️', label: 'System Load',         value: '72%',   change: 'CPU/RAM average',  changeColor: '#f97316' },
    { icon: '⚠️', label: 'Error Rate',           value: '0.12%', change: '-0.03% vs yesterday', changeColor: '#22c55e' },
    { icon: '📊', label: 'Reports Generated',   value: '1,247', change: '+89 this week',    changeColor: '#22c55e' },
  ];

  return (
    <div style={{ display: 'flex', gap: 16, marginBottom: 28 }}>
      {stats.map(s => <SuperStatCard key={s.label} {...s} />)}
    </div>
  );
}
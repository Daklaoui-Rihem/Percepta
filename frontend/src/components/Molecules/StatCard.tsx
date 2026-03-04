import Badge from '../Atoms/Badge';

type Props = {
  icon: string;
  value: string;
  label: string;
  change: string;
  borderColor: string;
}

export default function StatCard({ icon, value, label, change, borderColor }: Props) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 12,
      padding: '20px 24px',
      flex: 1,
      borderLeft: `4px solid ${borderColor}`,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <Badge value={change} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#1a3a6b' }}>{value}</div>
      <div style={{ fontSize: 14, color: '#888', marginTop: 4 }}>{label}</div>
    </div>
  );
}
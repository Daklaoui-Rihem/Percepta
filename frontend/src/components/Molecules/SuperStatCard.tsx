type Props = {
  icon: string;
  value: string;
  label: string;
  change: string;
  changeColor?: string;
}

export default function SuperStatCard({ icon, value, label, change, changeColor = '#22c55e' }: Props) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '20px 24px',
      flex: 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f4f8',
    }}>
      {/* Top row: label + icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <span style={{ color: '#888', fontSize: 13 }}>{label}</span>
        <div style={{
          background: '#eff6ff', borderRadius: 10,
          padding: 8, fontSize: 20,
        }}>
          {icon}
        </div>
      </div>

      {/* Big number */}
      <div style={{ fontSize: 30, fontWeight: 800, color: '#1a3a6b', marginBottom: 6 }}>
        {value}
      </div>

      {/* Change indicator */}
      <div style={{ fontSize: 13, color: changeColor, fontWeight: 600 }}>
        {change}
      </div>
    </div>
  );
}
import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  value: string;
  label: string;
  change: string;
}

export default function ClientStatCard({ icon: Icon, value, label, change }: Props) {
  const isPositive = !change.startsWith('-');

  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '24px',
      flex: 1,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      border: '1px solid #f0f4f8',
    }}>
      {/* Top row: icon + change badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
        <div style={{ color: '#1a3a6b' }}>
          <Icon size={28} strokeWidth={2} />
        </div>
        <span style={{ color: isPositive ? '#22c55e' : '#ef4444', fontSize: 13, fontWeight: 600 }}>
          {change}
        </span>
      </div>

      {/* Big number */}
      <div style={{ fontSize: 32, fontWeight: 800, color: '#1a3a6b', marginBottom: 4 }}>
        {value}
      </div>

      {/* Label */}
      <div style={{ fontSize: 14, color: '#888' }}>{label}</div>
    </div>
  );
}
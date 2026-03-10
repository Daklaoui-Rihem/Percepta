import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  value: string;
  label: string;
  change: string;
  changeColor?: string;
}

export default function SuperStatCard({ icon: Icon, value, label, change, changeColor = '#22c55e' }: Props) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '24px',
      flex: 1,
      boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)',
      border: '1px solid rgba(198, 234, 255, 0.4)',
      overflow: 'hidden',
      position: 'relative'
    }}>
      {/* Top row: icon + change */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{
          background: '#dff5ff', borderRadius: 12,
          padding: 10, color: '#1a3f5f',
          display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <div style={{ fontSize: 13, color: changeColor, fontWeight: 700, padding: '4px 8px', background: `${changeColor}15`, borderRadius: 6 }}>
          {change}
        </div>
      </div>

      {/* Big number */}
      <div style={{ fontSize: 32, fontWeight: 800, color: '#1a3f5f', marginBottom: 2, letterSpacing: '-1px' }}>
        {value}
      </div>

      <div style={{ fontSize: 13, color: '#4a7090', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        {label}
      </div>
    </div>
  );
}
import type { LucideIcon } from 'lucide-react';
import Badge from '../Atoms/Badge';

type Props = {
  icon: LucideIcon;
  value: string;
  label: string;
  change: string;
  borderColor: string;
}

export default function StatCard({ icon: Icon, value, label, change, borderColor }: Props) {
  return (
    <div style={{
      background: 'white',
      borderRadius: 16,
      padding: '24px',
      flex: 1,
      border: '1px solid rgba(198, 234, 255, 0.4)',
      boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Accent bar */}
      <div style={{
        position: 'absolute', top: 0, left: 0, bottom: 0, width: 4,
        background: borderColor
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{
          width: 44, height: 44, borderRadius: 12,
          background: `${borderColor}15`, // Add opacity to hex
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: borderColor
        }}>
          <Icon size={22} strokeWidth={2.5} />
        </div>
        <Badge value={change} />
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#1a3f5f', letterSpacing: '-1px' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#4a7090', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  );
}
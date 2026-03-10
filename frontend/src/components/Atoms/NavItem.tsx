import type { LucideIcon } from 'lucide-react';

type Props = {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function NavItem({ icon: Icon, label, active, onClick }: Props) {
  return (
    <div onClick={onClick} style={{
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      padding: '12px 20px',
      borderRadius: 8,
      cursor: 'pointer',
      background: active ? '#1a3a9f' : 'transparent',
      color: 'white',
      fontSize: 15,
      fontWeight: active ? 600 : 400,
    }}>
      <Icon size={18} strokeWidth={2} />
      {label}
    </div>
  );
}
type Props = {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function NavItem({ icon, label, active, onClick }: Props) {
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
      <span style={{ fontSize: 18 }}>{icon}</span>
      {label}
    </div>
  );
}
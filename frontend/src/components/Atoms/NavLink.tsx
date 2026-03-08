type Props = {
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export default function NavLink({ icon, label, active, onClick }: Props) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        borderRadius: 8,
        cursor: 'pointer',
        // Active = dark blue background, inactive = transparent
        background: active ? 'rgba(255,255,255,0.15)' : 'transparent',
        color: 'white',
        fontSize: 15,
        fontWeight: active ? 600 : 400,
        transition: 'background 0.2s',
      }}
      onMouseEnter={e => {
        if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.08)';
      }}
      onMouseLeave={e => {
        if (!active) e.currentTarget.style.background = 'transparent';
      }}
    >
      <span>{icon}</span>
      {label}
    </div>
  );
}
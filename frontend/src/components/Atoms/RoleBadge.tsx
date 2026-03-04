type Props = { role: string }

export default function RoleBadge({ role }: Props) {
  const isAdmin = role === 'Admin';
  return (
    <span style={{
      background: isAdmin ? '#1a3a6b' : '#60a5fa',
      color: 'white',
      padding: '4px 14px',
      borderRadius: 20,
      fontSize: 13,
      fontWeight: 600,
    }}>
      {role}
    </span>
  );
}
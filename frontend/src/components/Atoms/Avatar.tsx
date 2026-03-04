type Props = { initials: string }

export default function Avatar({ initials }: Props) {
  return (
    <div style={{
      width: 40, height: 40,
      borderRadius: '50%',
      background: '#60a5fa',
      color: 'white',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: 14,
    }}>
      {initials}
    </div>
  );
}
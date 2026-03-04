type Props = {
  label: string;
  onClick: () => void;
}

export default function Button({ label, onClick }: Props) {
  return (
    <button onClick={onClick} style={{
      width: '100%',
      padding: 16,
      background: '#1a3a6b',
      color: 'white',
      border: 'none',
      borderRadius: 8,
      fontSize: 16,
      fontWeight: 'bold',
      cursor: 'pointer',
    }}>
      {label}
    </button>
  );
}
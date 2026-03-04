type Props = { value: string }

export default function Badge({ value }: Props) {
  const positive = !value.startsWith('-');
  return (
    <span style={{
      color: positive ? '#22c55e' : '#ef4444',
      fontSize: 13,
      fontWeight: 600,
    }}>
      {value}
    </span>
  );
}
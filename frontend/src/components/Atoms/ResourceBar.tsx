type Props = { percent: number }

export default function ResourceBar({ percent }: Props) {
  // Color changes based on usage level
  const color =
    percent >= 80 ? '#ef4444' :   // red — critical
    percent >= 60 ? '#f97316' :   // orange — warning
    '#0d9488';                     // teal — good

  return (
    <div style={{ width: 100, background: '#e5e7eb', borderRadius: 4, height: 6 }}>
      <div style={{
        width: `${percent}%`,
        background: color,
        height: '100%',
        borderRadius: 4,
        transition: 'width 0.3s',
      }} />
    </div>
  );
}
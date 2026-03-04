type Props = { size: string }

const color = (size: string) => {
  const mb = parseFloat(size);
  if (mb >= 2) return { bg: '#fef9c3', color: '#ca8a04' };
  return { bg: '#dcfce7', color: '#16a34a' };
};

export default function SizeBadge({ size }: Props) {
  const s = color(size);
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '4px 10px', borderRadius: 8,
      fontSize: 12, fontWeight: 700,
    }}>
      {size}
    </span>
  );
}
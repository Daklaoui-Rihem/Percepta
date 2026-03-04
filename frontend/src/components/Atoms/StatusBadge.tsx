type Props = { status: string }

const styles: Record<string, { bg: string; color: string }> = {
  Completed:  { bg: '#dcfce7', color: '#16a34a' },
  Processing: { bg: '#dbeafe', color: '#2563eb' },
  Failed:     { bg: '#fee2e2', color: '#dc2626' },
};

export default function StatusBadge({ status }: Props) {
  const s = styles[status] || { bg: '#f3f4f6', color: '#555' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 700,
    }}>
      {status}
    </span>
  );
}
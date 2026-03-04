type Props = { type: string }

const colors: Record<string, { bg: string; color: string }> = {
  upload:        { bg: '#e0f0ff', color: '#3b82f6' },
  report:        { bg: '#dcfce7', color: '#16a34a' },
  analysis:      { bg: '#ede9fe', color: '#7c3aed' },
  transcription: { bg: '#dbeafe', color: '#1d4ed8' },
  error:         { bg: '#fee2e2', color: '#dc2626' },
};

export default function ActivityTypeBadge({ type }: Props) {
  const style = colors[type] || { bg: '#f3f4f6', color: '#555' };
  return (
    <span style={{
      background: style.bg,
      color: style.color,
      padding: '4px 12px',
      borderRadius: 20,
      fontSize: 12,
      fontWeight: 600,
    }}>
      {type}
    </span>
  );
}
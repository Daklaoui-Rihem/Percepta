type Props = { type: string }

const colors: Record<string, { bg: string; color: string }> = {
  'Audio Transcription': { bg: '#ede9fe', color: '#7c3aed' },
  'Video Analysis':      { bg: '#dbeafe', color: '#2563eb' },
  'PDF Report':          { bg: '#fef3c7', color: '#d97706' },
  'Live Transcription':  { bg: '#dcfce7', color: '#16a34a' },
};

export default function TypeBadge({ type }: Props) {
  const s = colors[type] || { bg: '#f3f4f6', color: '#555' };
  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '4px 12px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
    }}>
      {type}
    </span>
  );
}
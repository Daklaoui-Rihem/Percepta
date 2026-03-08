type Props = {
  icon: string;
  title: string;
  tenant: string;
  time: string;
}

export default function ActivityItem({ icon, title, tenant, time }: Props) {
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start',
      gap: 16, padding: '16px 0',
      borderBottom: '1px solid #f0f4f8',
    }}>
      {/* Icon circle */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%',
        background: '#eff6ff', flexShrink: 0,
        display: 'flex', alignItems: 'center',
        justifyContent: 'center', fontSize: 18,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{title}</p>
        <p style={{ margin: '2px 0', color: '#555', fontSize: 13 }}>Tenant: {tenant}</p>
        <p style={{ margin: 0, color: '#60a5fa', fontSize: 12 }}>{time}</p>
      </div>
    </div>
  );
}
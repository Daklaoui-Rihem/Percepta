import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
  icon: LucideIcon;
  title: string;
  tenant: string;
  time: string;
}

export default function ActivityItem({ icon: Icon, title, tenant, time }: Props) {
  const { t } = useTranslation();
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
        justifyContent: 'center', color: '#1a3a6b'
      }}>
        <Icon size={18} strokeWidth={2} />
      </div>

      {/* Text */}
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: '#1a3a6b', fontSize: 14 }}>{title}</p>
        <p style={{ margin: '2px 0', color: '#555', fontSize: 13 }}>{t('tenantLabel')} {tenant}</p>
        <p style={{ margin: 0, color: '#60a5fa', fontSize: 12 }}>{time}</p>
      </div>
    </div>
  );
}
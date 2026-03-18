import { UserPlus, Building2, Clock } from 'lucide-react';
import ActivityItem from '../Molecules/ActivityItem';
import { useTranslation } from '../../context/TranslationContext';

// activities moved inside component to use translations

export default function RecentActivityList() {
  const { t } = useTranslation();

  const activities = [
    { icon: UserPlus,   title: t('newTenantOnboarded'),          tenant: 'Digital Ventures',      time: t('hoursAgo', { count: 2 }) },
    { icon: Building2,  title: t('licenseUpgraded'),           tenant: 'Global Services Ltd.',  time: t('hoursAgo', { count: 5 }) },
    { icon: UserPlus,   title: t('newTenantOnboarded'),          tenant: 'Innovate Solutions',    time: t('dayAgo')   },
    { icon: Building2,  title: t('licenseActivated'),          tenant: 'TechStart Inc.',        time: t('daysAgo', { count: 2 })  },
    { icon: UserPlus,   title: t('newTenantOnboarded'),          tenant: 'Acme Corporation',      time: t('daysAgo', { count: 3 })  },
  ];

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 4, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Clock size={16} /> {t('recentActivity')}
      </h3>

      {activities.map((a, i) => <ActivityItem key={i} {...a} />)}
    </div>
  );
}
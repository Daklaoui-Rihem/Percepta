import ActivityItem from '../Molecules/ActivityItem';

const activities = [
  { icon: '👥', title: 'New tenant onboarded',      tenant: 'Digital Ventures',    time: '2 hours ago' },
  { icon: '🏢', title: 'Enterprise license upgraded', tenant: 'Global Services Ltd.', time: '5 hours ago' },
  { icon: '👥', title: 'New tenant onboarded',      tenant: 'Innovate Solutions',   time: '1 day ago'   },
  { icon: '🏢', title: 'Professional license activated', tenant: 'TechStart Inc.',   time: '2 days ago'  },
  { icon: '👥', title: 'New tenant onboarded',      tenant: 'Acme Corporation',     time: '3 days ago'  },
];

export default function RecentActivityList() {
  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ color: '#1a3a6b', marginBottom: 4, fontSize: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
        🕐 Recent Activity
      </h3>

      {activities.map((a, i) => <ActivityItem key={i} {...a} />)}
    </div>
  );
}
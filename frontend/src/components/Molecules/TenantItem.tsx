import PlanBadge from '../Atoms/PlanBadge';
import ResourceBar from '../Atoms/ResourceBar';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
  name: string;
  plan: string;
  users: number;
  resource: number;
}

export default function TenantItem({ name, plan, users, resource }: Props) {
  const { t } = useTranslation();
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      alignItems: 'center', padding: '16px 0',
      borderBottom: '1px solid #f0f4f8',
    }}>
      {/* Left: name + plan + users */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 4 }}>
          <span style={{ fontWeight: 700, color: '#1a3a6b', fontSize: 15 }}>{name}</span>
          <PlanBadge plan={plan} />
        </div>
        <span style={{ color: '#888', fontSize: 13 }}>
          {users} {t('users')} &nbsp;·&nbsp; {t('resource')}: {resource}%
        </span>
      </div>

      {/* Right: resource bar */}
      <ResourceBar percent={resource} />
    </div>
  );
}
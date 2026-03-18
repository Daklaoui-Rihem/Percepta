import { useTranslation } from '../../context/TranslationContext';

type Props = { plan: string }

const styles: Record<string, { bg: string; color: string }> = {
  Enterprise:   { bg: '#dbeafe', color: '#1d4ed8' },
  Professional: { bg: '#ede9fe', color: '#7c3aed' },
  Starter:      { bg: '#f0fdf4', color: '#16a34a' },
};

export default function PlanBadge({ plan }: Props) {
  const { t } = useTranslation();
  const s = styles[plan] || { bg: '#f3f4f6', color: '#555' };
  
  // Map hardcoded plans to translation keys
  const planKey = plan.toLowerCase() as 'enterprise' | 'professional' | 'starter';

  return (
    <span style={{
      background: s.bg, color: s.color,
      padding: '3px 10px', borderRadius: 20,
      fontSize: 12, fontWeight: 600,
      marginLeft: 8,
    }}>
      {t(planKey) || plan}
    </span>
  );
}
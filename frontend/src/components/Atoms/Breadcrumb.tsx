import { useNavigate } from 'react-router-dom';

// Each item has a label and optional path (last item has no path = not clickable)
type BreadcrumbItem = {
  label: string;
  path?: string;
  icon?: string;
}

type Props = {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: Props) {
  const navigate = useNavigate();

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
      {items.map((item, index) => (
        <div key={index} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>

          {/* Clickable item (has a path) */}
          {item.path ? (
            <span
              onClick={() => navigate(item.path!)}
              style={{
                color: '#1a3a6b',
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
              }}
              onMouseEnter={e => (e.currentTarget.style.textDecoration = 'underline')}
              onMouseLeave={e => (e.currentTarget.style.textDecoration = 'none')}
            >
              {item.icon && <span>{item.icon}</span>}
              {item.label}
            </span>
          ) : (
            // Last item — bold, not clickable
            <span style={{ color: '#1a3a6b', fontSize: 14, fontWeight: 700 }}>
              {item.label}
            </span>
          )}

          {/* Arrow separator — don't show after last item */}
          {index < items.length - 1 && (
            <span style={{ color: '#aaa', fontSize: 12 }}>›</span>
          )}
        </div>
      ))}
    </div>
  );
}
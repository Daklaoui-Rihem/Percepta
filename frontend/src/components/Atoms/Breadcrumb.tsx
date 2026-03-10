import { useNavigate } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Each item has a label and optional path (last item has no path = not clickable)
type BreadcrumbItem = {
  label: string;
  path?: string;
  icon?: LucideIcon;
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
              {item.icon && <item.icon size={14} strokeWidth={2.5} />}
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
            <ChevronRight size={14} style={{ color: '#aaa' }} />
          )}
        </div>
      ))}
    </div>
  );
}
import Sidebar from '../Organisms/Sidebar';
import TopBar from '../Organisms/TopBar';

type Props = {
  children: React.ReactNode;
  active: string;
  onNavigate: (page: string) => void;
}

export default function DashboardTemplate({ children, active, onNavigate }: Props) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#f0f4f8' }}>
      <Sidebar active={active} onNavigate={onNavigate} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <TopBar />
        <main style={{ padding: '28px', flex: 1 }}>
          {children}
        </main>
      </div>
    </div>
  );
}
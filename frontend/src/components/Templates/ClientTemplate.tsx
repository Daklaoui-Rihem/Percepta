import ClientNavbar from '../Organisms/ClientNavbar';

type Props = {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
}

export default function ClientTemplate({ children, activePage, onNavigate }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>

      {/* Top navbar */}
      <ClientNavbar activePage={activePage} onNavigate={onNavigate} />

      {/* Page content */}
      <main style={{ flex: 1, padding: '32px 40px' }}>
        {children}
      </main>

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: '16px', color: '#888', fontSize: 13, background: 'white', borderTop: '1px solid #eee' }}>
        © 2026 IFBW AI Platform. Tous droits réservés.
      </footer>

    </div>
  );
}
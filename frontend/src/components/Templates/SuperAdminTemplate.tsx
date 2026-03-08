import SuperNavbar from '../Organisms/SuperNavbar';

type Props = { children: React.ReactNode }

export default function SuperAdminTemplate({ children }: Props) {
  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', flexDirection: 'column' }}>
      <SuperNavbar />
      <main style={{ flex: 1, padding: '28px 32px' }}>
        {children}
      </main>
    </div>
  );
}
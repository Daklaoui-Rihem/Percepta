import Logo from '../Atoms/Logo';


type Props = { children: React.ReactNode }

export default function AuthTemplate({ children }: Props) {

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #dff5ff 0%, #c6eaff 100%)',
      flexDirection: 'column',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Decorative background elements */}
      <div style={{ position: 'absolute', top: '-10%', right: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, #6ab7e4 0%, transparent 70%)', opacity: 0.1, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '-10%', left: '-5%', width: '40%', height: '40%', background: 'radial-gradient(circle, #3c4a9d 0%, transparent 70%)', opacity: 0.05, pointerEvents: 'none' }} />
      {/* Language switcher on login page too */}

      <div style={{ position: 'absolute', top: 20, right: 20 }}>

      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 420, zIndex: 1 }}>
        <div style={{ marginBottom: 32 }}>
          <Logo size="large" />
        </div>
        {children}
        <p style={{ textAlign: 'center', padding: '16px', color: '#666', fontSize: 13 }}>
          {('copyright')}
        </p>
      </div>
    </div>
  );
}
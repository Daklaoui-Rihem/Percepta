import logo from '../../assets/logo.png';


type Props = { children: React.ReactNode }

export default function AuthTemplate({ children }: Props) {

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: '#e8f4fb', flexDirection: 'column',
    }}>
      {/* Language switcher on login page too */}
      
      <div style={{ position: 'absolute', top: 20, right: 20 }}>
     
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', maxWidth: 420 }}>
        <img src={logo} alt="IFBW Logo" style={{ width: 120, marginBottom: 20 }} />
        {children}
        <p style={{ textAlign: 'center', padding: '16px', color: '#666', fontSize: 13 }}>
          {('copyright')}
        </p>
      </div>
    </div>
  );
}
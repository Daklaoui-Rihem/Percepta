import { useState, useEffect } from 'react';
import { Save, Send, Server, Settings, CheckCircle, XCircle, FlaskConical } from 'lucide-react';
import SuperAdminTemplate from '../components/Templates/SuperAdminTemplate';
import { settingsApi, type SmtpSettings } from '../services/api';
import { useTranslation } from '../context/TranslationContext';

export default function SettingsPage() {
    const { t } = useTranslation();

    const TABS = [
        { id: 'general', label: t('tabGeneral') },
        { id: 'smtp', label: t('tabSmtp') },
        { id: 'security', label: t('tabSecurity') }
    ];

    const [activeTab, setActiveTab] = useState('smtp');
    const [form, setForm] = useState<SmtpSettings>({
        smtpHost: '', smtpPort: 587, smtpUser: '',
        smtpPass: '', smtpFrom: '', smtpSecure: 'STARTTLS',
    });
    const [testEmail, setTestEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [testing, setTesting] = useState(false);
    const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

    useEffect(() => {
        settingsApi.getSmtp().then(setForm).catch(console.error);
    }, []);

    const handleSave = async () => {
        setLoading(true); setMessage(null);
        try {
            const res = await settingsApi.saveSmtp(form);
            setMessage({ text: res.message, ok: true });
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'Error', ok: false });
        } finally { setLoading(false); }
    };

    const handleTest = async () => {
        if (!testEmail) return;
        setTesting(true); setMessage(null);
        try {
            const res = await settingsApi.testSmtp(testEmail);
            setMessage({ text: res.message, ok: true });
        } catch (err: unknown) {
            setMessage({ text: err instanceof Error ? err.message : 'SMTP error', ok: false });
        } finally { setTesting(false); }
    };

    const field = (key: keyof SmtpSettings) => ({
        value: String(form[key]),
        onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
            setForm(prev => ({ ...prev, [key]: key === 'smtpPort' ? Number(e.target.value) : e.target.value })),
    });

    return (
        <SuperAdminTemplate>
            <div style={{ maxWidth: 760, margin: '0 auto' }}>
                <h2 style={{ color: '#1a3f5f', margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: '-0.5px', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Settings color="#60a5fa" size={28} strokeWidth={2.5} /> {t('settingsTitle')}
                </h2>
                <p style={{ color: '#888', marginBottom: 24, fontSize: 15 }}>{t('platformConfig')}</p>

                {/* Tabs */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e0eaf4', marginBottom: 28 }}>
                    {TABS.map(tab => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                            padding: '12px 28px', border: 'none', background: 'none',
                            cursor: 'pointer', fontSize: 15, fontWeight: 600,
                            color: activeTab === tab.id ? '#1a3a6b' : '#888',
                            borderBottom: activeTab === tab.id ? '2px solid #1a3a6b' : '2px solid transparent',
                            marginBottom: -2,
                            transition: 'all 0.2s',
                        }}>
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* SMTP Tab */}
                {activeTab === 'smtp' && (
                    <>
                        {/* SMTP Server Card */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '32px', marginBottom: 20, boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)', border: '1px solid rgba(198, 234, 255, 0.4)' }}>
                            <h3 style={{ color: '#1a3f5f', marginBottom: 24, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a3a6b' }}>
                                    <Server size={18} /> 
                                </div>
                                {t('smtpServer')}
                            </h3>

                            <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
                                <div style={{ flex: 2 }}>
                                    <label style={labelStyle}>{t('smtpHost')}</label>
                                    <input {...field('smtpHost')} placeholder="pro3.mail.ovh.net" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>{t('portLabel')}</label>
                                    <input {...field('smtpPort')} type="number" placeholder="587" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 20, marginBottom: 18 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>{t('smtpUser')}</label>
                                    <input {...field('smtpUser')} placeholder="user@example.com" style={inputStyle} />
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>{t('smtpPassLabel')}</label>
                                    <input {...field('smtpPass')} type="password" placeholder="••••••••" style={inputStyle} />
                                </div>
                            </div>

                            <div style={{ display: 'flex', gap: 20, marginBottom: 24 }}>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>{t('senderEmail')}</label>
                                    <input {...field('smtpFrom')} placeholder="noreply@example.com" style={inputStyle} />
                                    <span style={{ color: '#aaa', fontSize: 12 }}>{t('emptyUseSmtpUser')}</span>
                                </div>
                                <div style={{ flex: 1 }}>
                                    <label style={labelStyle}>{t('securityLabel')}</label>
                                    <select {...field('smtpSecure')} style={{ ...inputStyle, cursor: 'pointer' }}>
                                        <option value="STARTTLS">STARTTLS (port 587)</option>
                                        <option value="SSL">SSL/TLS (port 465)</option>
                                        <option value="NONE">{t('noneOption')}</option>
                                    </select>
                                </div>
                            </div>

                            {message && (
                                <div style={{
                                    padding: '12px 18px', borderRadius: 10, marginBottom: 20, fontSize: 14,
                                    background: message.ok ? '#F0FDF4' : '#FEF2F2',
                                    color: message.ok ? '#166534' : '#991B1B',
                                    border: `1px solid ${message.ok ? '#BBF7D0' : '#FECACA'}`,
                                    display: 'flex', alignItems: 'center', gap: 10, fontWeight: 500
                                }}>
                                    {message.ok ? <CheckCircle size={18} /> : <XCircle size={18} />} {message.text}
                                </div>
                            )}

                            <div style={{ display: 'flex', gap: 12 }}>
                                <button onClick={handleSave} disabled={loading} style={saveBtnStyle}>
                                    <Save size={16} /> {loading ? t('saving') : t('saveBtn')}
                                </button>
                            </div>
                        </div>

                        {/* Test Email Card */}
                        <div style={{ background: 'white', borderRadius: 16, padding: '32px', boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)', border: '1px solid rgba(198, 234, 255, 0.4)' }}>
                            <h3 style={{ color: '#1a3f5f', marginBottom: 20, fontSize: 18, display: 'flex', alignItems: 'center', gap: 10, fontWeight: 700 }}>
                                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#f8fafc', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                    <FlaskConical size={18} />
                                </div>    
                                {t('testEmailCard')}
                            </h3>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <input
                                    value={testEmail}
                                    onChange={e => setTestEmail(e.target.value)}
                                    placeholder={t('yourEmailPlaceholder')}
                                    style={{ ...inputStyle, flex: 1 }}
                                />
                                <button onClick={handleTest} disabled={testing || !testEmail} style={testBtnStyle}>
                                    <Send size={16} /> {testing ? t('sendingBtn') : t('sendBtn')}
                                </button>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === 'general' && (
                    <div style={{ background: 'white', borderRadius: 16, padding: '40px', textAlign: 'center', color: '#888', boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)', border: '1px solid rgba(198, 234, 255, 0.4)' }}>
                        {t('comingSoonGeneral')}
                    </div>
                )}
                {activeTab === 'security' && (
                    <div style={{ background: 'white', borderRadius: 16, padding: '40px', textAlign: 'center', color: '#888', boxShadow: '0 4px 15px rgba(26, 63, 95, 0.05)', border: '1px solid rgba(198, 234, 255, 0.4)' }}>
                        {t('comingSoonSecurity')}
                    </div>
                )}
            </div>
        </SuperAdminTemplate>
    );
}

const labelStyle: React.CSSProperties = {
    display: 'block', color: '#1a3a6b', fontSize: 13, fontWeight: 600, marginBottom: 8,
};
const inputStyle: React.CSSProperties = {
    width: '100%', padding: '11px 14px', border: '1.5px solid #d0e4f0',
    borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', color: '#333',
};
const saveBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#1a3a6b', color: 'white', border: 'none',
    borderRadius: 8, padding: '11px 24px', fontSize: 14,
    fontWeight: 700, cursor: 'pointer',
};
const testBtnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 8,
    background: '#f0f4f8', color: '#1a3a6b',
    border: '1.5px solid #d0e4f0', borderRadius: 8,
    padding: '11px 20px', fontSize: 14,
    fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
};
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, CheckCircle, ShieldCheck, AlertTriangle } from 'lucide-react';
import Logo from '../components/Atoms/Logo';
import { useTranslation } from '../context/TranslationContext';
import { validatePassword } from '../utils/validatePassword';
import { userApi, getSession, saveSession } from '../services/api';

export default function ForcePasswordChangePage() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const session = getSession();

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState(false);

    // Password strength logic
    const getStrength = () => {
        if (!newPassword) return 0;
        let score = 0;
        if (newPassword.length >= 8) score++;
        if (/[A-Z]/.test(newPassword)) score++;
        if (/[a-z]/.test(newPassword)) score++;
        if (/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) score++;
        return score;
    };

    const handleSave = async () => {
        if (!currentPassword || !newPassword || !confirmPassword) {
            setError(t('fillAllFields'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (!validatePassword(newPassword)) {
            setError(t('passwordPolicyError'));
            return;
        }

        setLoading(true);
        setError('');

        try {
            await userApi.changeMyPassword(currentPassword, newPassword);
            
            // Update session locally to mark as activated
            if (session) {
                const updatedUser = { ...session, hasFirstLogin: true };
                saveSession(localStorage.getItem('token') || '', updatedUser);
            }

            setSuccess(true);
            setTimeout(() => {
                // Redirect based on role
                if (session?.role === 'SuperAdmin') navigate('/superadmin/dashboard');
                else if (session?.role === 'Admin') navigate('/dashboard');
                else navigate('/client/dashboard');
            }, 2000);
        } catch (err: any) {
            setError(err.message || 'Failed to update password');
        } finally {
            setLoading(false);
        }
    };

    if (success) {
        return (
            <div style={pageWrapperStyle}>
                <div style={cardStyle}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ background: '#dcfce7', width: 64, height: 64, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                            <CheckCircle size={32} color="#16a34a" />
                        </div>
                        <h2 style={{ color: '#1a3f5f', marginBottom: 12 }}>{t('passwordChanged')}</h2>
                        <p style={{ color: '#64748b' }}>Account activated successfully. Redirecting...</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div style={pageWrapperStyle}>
            <div style={{ position: 'absolute', top: 40, left: 40 }}>
                <Logo />
            </div>

            <div style={cardStyle}>
                <div style={{ textAlign: 'center', marginBottom: 32 }}>
                    <div style={{ background: '#eff6ff', width: 56, height: 56, borderRadius: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <ShieldCheck size={28} color="#1a3a6b" />
                    </div>
                    <h2 style={{ color: '#1a3f5f', fontSize: 24, fontWeight: 800, margin: '0 0 8px' }}>Security Setup</h2>
                    <p style={{ color: '#64748b', fontSize: 14 }}>
                        This is your first login. For security reasons, you must change your temporary password to continue.
                    </p>
                </div>

                {error && (
                    <div style={{ 
                        background: '#fef2f2', border: '1px solid #fee2e2', 
                        padding: '12px 16px', borderRadius: 10, display: 'flex', 
                        gap: 12, marginBottom: 24, alignItems: 'center' 
                    }}>
                        <AlertTriangle size={18} color="#dc2626" />
                        <span style={{ color: '#dc2626', fontSize: 13, fontWeight: 500 }}>{error}</span>
                    </div>
                )}

                <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>Temporary Password</label>
                    <div style={inputContainerStyle}>
                        <Lock size={18} color="#94a3b8" />
                        <input
                            type="password"
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            placeholder="Enter the password from your email"
                            style={inputStyle}
                        />
                    </div>
                </div>

                <div style={{ marginBottom: 20 }}>
                    <label style={labelStyle}>New Secure Password</label>
                    <div style={inputContainerStyle}>
                        <ShieldCheck size={18} color="#94a3b8" />
                        <input
                            type="password"
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            placeholder={t('newPasswordPlaceholder')}
                            style={inputStyle}
                        />
                    </div>
                    
                    {/* Strength visual */}
                    <div style={{ display: 'flex', gap: 4, marginTop: 10 }}>
                        {[1, 2, 3, 4].map(idx => (
                            <div key={idx} style={{
                                flex: 1, height: 4, borderRadius: 2,
                                background: idx <= getStrength() 
                                    ? (getStrength() <= 2 ? '#f97316' : '#22c55e') 
                                    : '#e2e8f0'
                            }} />
                        ))}
                    </div>
                    <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>
                        Min. 8 characters, uppercase, lowercase & symbol.
                    </p>
                </div>

                <div style={{ marginBottom: 32 }}>
                    <label style={labelStyle}>Confirm New Password</label>
                    <div style={inputContainerStyle}>
                        <ShieldCheck size={18} color="#94a3b8" />
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            placeholder="Confirm your new password"
                            style={inputStyle}
                        />
                    </div>
                </div>

                <button
                    onClick={handleSave}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '14px',
                        background: loading ? '#94a3b8' : '#1a3a6b',
                        color: 'white',
                        border: 'none',
                        borderRadius: 12,
                        fontSize: 16,
                        fontWeight: 700,
                        cursor: loading ? 'not-allowed' : 'pointer',
                        boxShadow: '0 4px 12px rgba(26, 58, 107, 0.2)',
                        transition: 'transform 0.2s',
                    }}
                >
                    {loading ? t('saving') : 'Activate Account & Continue'}
                </button>
            </div>
        </div>
    );
}

const pageWrapperStyle: React.CSSProperties = {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#f8fbff',
    padding: '20px',
    position: 'relative'
};

const cardStyle: React.CSSProperties = {
    background: 'white',
    borderRadius: 24,
    padding: '48px 40px',
    width: '100%',
    maxWidth: 480,
    boxShadow: '0 20px 50px rgba(26, 63, 95, 0.12)',
    border: '1px solid rgba(198, 234, 255, 0.5)'
};

const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    fontWeight: 700,
    color: '#1a3f5f',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: '0.5px'
};

const inputContainerStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    background: '#f8fbff',
    border: '1.5px solid #e0eaf4',
    borderRadius: 12,
    padding: '0 16px',
    gap: 12,
    transition: 'border-color 0.2s'
};

const inputStyle: React.CSSProperties = {
    flex: 1,
    height: 48,
    border: 'none',
    background: 'transparent',
    outline: 'none',
    fontSize: 14,
    color: '#1a3f5f',
    fontWeight: 500
};

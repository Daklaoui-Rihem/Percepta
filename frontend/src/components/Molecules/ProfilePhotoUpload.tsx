import { useState, useRef, useEffect } from 'react';
import { User, Camera, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';
import { userApi, getSession } from '../../services/api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const SERVER_URL = API_URL.replace('/api', '');

export default function ProfilePhotoUpload() {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const session = getSession();
    if (session?.photoUrl) {
      setPhoto(session.photoUrl.startsWith('http') ? session.photoUrl : `${SERVER_URL}/${session.photoUrl}`);
    }
  }, []);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploading(true);
      try {
        const res = await userApi.uploadAvatar(file);
        const fullUrl = res.photoUrl.startsWith('http') ? res.photoUrl : `${SERVER_URL}/${res.photoUrl}`;
        setPhoto(fullUrl);
        
        // Update local session
        const session = getSession();
        if (session) {
          session.photoUrl = res.photoUrl;
          localStorage.setItem('user', JSON.stringify(session));
        }
      } catch (err) {
        console.error('Upload failed:', err);
        alert(t('failed'));
      } finally {
        setUploading(false);
      }
    }
  };

  return (
    <div style={{
      background: 'white', borderRadius: 16,
      padding: '40px', textAlign: 'center',
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      marginBottom: 24,
    }}>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        style={{ display: 'none' }}
      />

      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>

        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: '#60a5fa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden', border: '3px solid #f0f9ff'
        }}>
          {uploading ? (
            <RefreshCw size={32} className="animate-spin" color="white" />
          ) : photo ? (
            <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={60} color="white" strokeWidth={1.5} />
          )}
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 32, height: 32, borderRadius: '50%',
            background: uploading ? '#94a3b8' : '#1a3a6b', border: '2px solid white',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}
          title="Change photo"
        >
          <Camera size={16} />
        </button>
      </div>

      <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
        {uploading ? t('uploading') : t('clickToChangePhoto') || 'Click the camera icon to change your photo'}
      </p>
    </div>
  );
}
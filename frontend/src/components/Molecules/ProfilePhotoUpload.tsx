import { useState, useRef } from 'react';
import { User, Camera } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

export default function ProfilePhotoUpload() {
  const { t } = useTranslation();
  const [photo, setPhoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      setPhoto(url);
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
          overflow: 'hidden',
        }}>
          {photo ? (
            <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <User size={60} color="white" strokeWidth={1.5} />
          )}
        </div>

        <button
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 32, height: 32, borderRadius: '50%',
            background: '#1a3a6b', border: '2px solid white',
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}
          title="Change photo"
        >
          <Camera size={16} />
        </button>
      </div>

      <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
        {t('clickToChangePhoto') || 'Click the camera icon to change your photo'}
      </p>
    </div>
  );
}
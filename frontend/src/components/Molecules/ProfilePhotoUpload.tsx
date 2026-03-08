import { useState, useRef } from 'react';

export default function ProfilePhotoUpload() {
  const [photo, setPhoto] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // When user picks a photo → convert it to a URL we can display
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file); // creates a temporary URL for preview
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
      {/* Hidden file input — only accepts images */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handlePhotoChange}
        style={{ display: 'none' }}
      />

      {/* Avatar circle + camera button */}
      <div style={{ position: 'relative', display: 'inline-block', marginBottom: 16 }}>

        {/* The avatar — shows photo if selected, otherwise default icon */}
        <div style={{
          width: 100, height: 100, borderRadius: '50%',
          background: '#60a5fa',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}>
          {photo ? (
            // Show selected photo
            <img src={photo} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            // Show default person icon
            <span style={{ fontSize: 48, color: 'white' }}>👤</span>
          )}
        </div>

        {/* Camera icon button — positioned bottom right of avatar */}
        <button
          onClick={() => inputRef.current?.click()}
          style={{
            position: 'absolute', bottom: 0, right: 0,
            width: 32, height: 32, borderRadius: '50%',
            background: '#1a3a6b', border: '2px solid white',
            cursor: 'pointer', fontSize: 14,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white',
          }}
          title="Change photo"
        >
          📷
        </button>
      </div>

      <p style={{ color: '#888', fontSize: 14, margin: 0 }}>
        Click the camera icon to change your photo
      </p>
    </div>
  );
}
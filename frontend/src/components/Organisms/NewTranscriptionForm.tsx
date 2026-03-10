import { useState } from 'react';
import { Home, Music, AudioLines } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';

export default function NewTranscriptionForm() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      {/* Breadcrumb: Home > Transcriptions > New */}
      <Breadcrumb items={[
        { label: 'Home', path: '/client/dashboard', icon: Home },
        { label: 'Transcriptions', path: '/client/transcriptions' },
        { label: 'New' }, // last item — no path, not clickable
      ]} />

      {/* Page title */}
      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        New Audio Transcription
      </h2>

      {/* White card wrapper */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {/* Audio file drop zone */}
        <FileDropZone
          accept=".wav,.mp3,.m4a,.ogg"
          maxSizeMB={100}
          formatLabel="WAV, MP3, M4A, OGG"
          icon={Music}
          onFileSelected={(f) => setFile(f)}
        />

        {/* Submit button — only show when file is selected */}
        {file && (
          <button style={{
            marginTop: 24,
            width: '100%',
            padding: '14px',
            background: '#1a3a6b',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <AudioLines size={20} /> Start Transcription
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Home, Video, PlayCircle } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';

export default function NewVideoAnalysisForm() {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div>
      {/* Breadcrumb: Home > Video Analysis > New */}
      <Breadcrumb items={[
        { label: 'Home', path: '/client/dashboard', icon: Home },
        { label: 'Video Analysis', path: '/client/video-analysis' },
        { label: 'New' },
      ]} />

      {/* Page title */}
      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        New Video Analysis
      </h2>

      {/* White card wrapper */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>
        {/* Video file drop zone */}
        <FileDropZone
          accept=".mp4,.avi,.mov,.mkv,.webm"
          maxSizeMB={500}
          formatLabel="MP4, AVI, MOV, MKV, WEBM"
          icon={Video}
          onFileSelected={(f) => setFile(f)}
        />

        {/* Submit button — only show when file is selected */}
        {file && (
          <button style={{
            marginTop: 24,
            width: '100%',
            padding: '14px',
            background: '#2563eb',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            fontSize: 16,
            fontWeight: 700,
            cursor: 'pointer',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <PlayCircle size={20} /> Start Video Analysis
            </div>
          </button>
        )}
      </div>
    </div>
  );
}
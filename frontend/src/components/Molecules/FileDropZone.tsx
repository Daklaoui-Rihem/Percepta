import { useState, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Upload, CheckCircle } from 'lucide-react';

type Props = {
  accept: string;        // e.g. ".wav,.mp3,.mp4"
  maxSizeMB: number;     // e.g. 100
  formatLabel: string;   // e.g. "WAV, MP3, M4A, OGG"
  icon: LucideIcon;      // e.g. Music for audio, Film for video
  onFileSelected: (file: File) => void;
}

export default function FileDropZone({ accept, maxSizeMB, formatLabel, icon: Icon, onFileSelected }: Props) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  // This ref connects to the hidden <input type="file">
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    // Check file size
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`File too large. Max size is ${maxSizeMB}MB`);
      return;
    }
    setError('');
    setSelectedFile(file);
    onFileSelected(file);
  };

  // When user clicks the box → open file explorer
  const handleClick = () => {
    inputRef.current?.click();
  };

  // When user selects a file from file explorer
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // When user drags file over the box
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault(); // needed to allow drop
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  // When user drops file on the box
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      {/* Hidden file input — triggered by clicking the box */}
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }} // invisible but functional
      />

      {/* The visible drop zone box */}
      <div
        onClick={handleClick}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: `2px dashed ${isDragging ? '#1a3a6b' : '#93c5fd'}`,
          borderRadius: 12,
          padding: '60px 40px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? '#eff6ff' : '#f8fbff',
          transition: 'all 0.2s',
        }}
      >
        {/* Show selected file OR upload prompt */}
        {selectedFile ? (
          // File selected — show its name
          <div>
            <div style={{ color: '#1a3a6b', marginBottom: 12, display: 'flex', justifyContent: 'center' }}>
              <Icon size={48} strokeWidth={1.5} />
            </div>
            <p style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 16, marginBottom: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <CheckCircle size={18} color="#22c55e" /> {selectedFile.name}
            </p>
            <p style={{ color: '#888', fontSize: 13 }}>
              {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
            </p>
            <p style={{ color: '#60a5fa', fontSize: 13, marginTop: 8 }}>
              Click to change file
            </p>
          </div>
        ) : (
          // No file yet — show upload prompt
          <div>
            {/* Upload arrow icon */}
            <div style={{ color: '#1a3a6b', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Upload size={48} strokeWidth={1.5} />
            </div>
            <p style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              Drag your file here or click to browse
            </p>
            <p style={{ color: '#888', fontSize: 14 }}>
              Accepted formats: {formatLabel} (max {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}

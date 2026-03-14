import { useState, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Upload, CheckCircle } from 'lucide-react';
import { useTranslation } from '../../context/TranslationContext';

type Props = {
  accept: string;
  maxSizeMB: number;
  formatLabel: string;
  icon: LucideIcon;
  onFileSelected: (file: File) => void;
}

export default function FileDropZone({ accept, maxSizeMB, formatLabel, icon: Icon, onFileSelected }: Props) {
  const { t } = useTranslation();
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > maxSizeMB) {
      setError(`${t('fileTooLarge')} ${maxSizeMB}MB`);
      return;
    }
    setError('');
    setSelectedFile(file);
    onFileSelected(file);
  };

  const handleClick = () => { inputRef.current?.click(); };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />

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
        {selectedFile ? (
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
              {t('clickToChange')}
            </p>
          </div>
        ) : (
          <div>
            <div style={{ color: '#1a3a6b', marginBottom: 16, display: 'flex', justifyContent: 'center' }}>
              <Upload size={48} strokeWidth={1.5} />
            </div>
            <p style={{ color: '#1a3a6b', fontWeight: 700, fontSize: 16, marginBottom: 8 }}>
              {t('dragFileHere')}
            </p>
            <p style={{ color: '#888', fontSize: 14 }}>
              {t('acceptedFormats')} {formatLabel} ({t('maxSize')} {maxSizeMB}MB)
            </p>
          </div>
        )}
      </div>

      {error && (
        <p style={{ color: '#dc2626', fontSize: 13, marginTop: 8 }}>{error}</p>
      )}
    </div>
  );
}

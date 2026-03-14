import { useState } from 'react';
import { Home, Music, AudioLines, CheckCircle, XCircle } from 'lucide-react';
import Breadcrumb from '../Atoms/Breadcrumb';
import FileDropZone from '../Molecules/FileDropZone';
import { useTranslation } from '../../context/TranslationContext';
import { analysisApi } from '../../services/api';

export default function NewTranscriptionForm() {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async () => {
    if (!file) return;

    setUploading(true);
    setError('');
    setSuccess('');

    try {
      await analysisApi.uploadAudio(file);
      setSuccess(t('uploadAudioSuccess'));
      setFile(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {/* Breadcrumb */}
      <Breadcrumb items={[
        { label: t('home'), path: '/client/dashboard', icon: Home },
        { label: t('transcriptions'), path: '/client/transcriptions' },
        { label: t('breadcrumbNew') },
      ]} />

      {/* Page title */}
      <h2 style={{ color: '#1a3a6b', marginBottom: 28, fontSize: 26, fontWeight: 700 }}>
        {t('newAudioTranscription')}
      </h2>

      {/* Card */}
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '32px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}>

        {/* Drop zone */}
        <FileDropZone
          accept=".wav,.mp3,.m4a,.ogg"
          maxSizeMB={100}
          formatLabel="WAV, MP3, M4A, OGG"
          icon={Music}
          onFileSelected={(f) => {
            setFile(f);
            setError('');
            setSuccess('');
          }}
        />

        {/* Error message */}
        {error && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#fff1f1',
            border: '1px solid #ad1b1b',
            borderRadius: 8,
            color: '#ad1b1b',
            fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <XCircle size={18} /> {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div style={{
            marginTop: 16,
            padding: '12px 16px',
            background: '#eef8f8',
            border: '1px solid #16757a',
            borderRadius: 8,
            color: '#16757a',
            fontSize: 14,
            display: 'flex', alignItems: 'center', gap: 8
          }}>
            <CheckCircle size={18} /> {success}
          </div>
        )}

        {/* Submit button — only show when file selected and not yet succeeded */}
        {file && !success && (
          <button
            onClick={handleSubmit}
            disabled={uploading}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '14px',
              background: uploading ? '#93c5fd' : '#1a3a6b',
              color: 'white',
              border: 'none',
              borderRadius: 8,
              fontSize: 16,
              fontWeight: 700,
              cursor: uploading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              {uploading ? (
                <>⏳ Uploading...</>
              ) : (
                <><AudioLines size={20} /> {t('startTranscription')}</>
              )}
            </div>
          </button>
        )}

        {/* Upload another button — shows after success */}
        {success && (
          <button
            onClick={() => {
              setSuccess('');
              setFile(null);
              setError('');
            }}
            style={{
              marginTop: 24,
              width: '100%',
              padding: '14px',
              background: '#f0f4f8',
              color: '#1a3a6b',
              border: '1.5px solid #d0e4f0',
              borderRadius: 8,
              fontSize: 15,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {t('uploadAnotherAudio')}
          </button>
        )}
      </div>
    </div>
  );
}
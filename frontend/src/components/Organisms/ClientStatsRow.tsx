import { FileText, Video, BarChart3, Briefcase } from 'lucide-react';
import { useState, useEffect } from 'react';
import ClientStatCard from '../Molecules/ClientStatCard';
import { useTranslation } from '../../context/TranslationContext';
import { analysisApi, type AnalysisRecord } from '../../services/api';

export default function ClientStatsRow() {
  const { t } = useTranslation();

  // ── State ─────────────────────────────────────────────────────
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading]   = useState(true);

  // ── Fetch on mount ────────────────────────────────────────────
  useEffect(() => {
    analysisApi.getMyAnalyses()
      .then(data => setAnalyses(data))
      .catch(err => console.error('Failed to load analyses:', err))
      .finally(() => setLoading(false));
  }, []);

  // ── Computed counts from real data ────────────────────────────
  // Audio files = transcriptions
  const totalTranscriptions = analyses.filter(a => a.type === 'audio').length;

  // Video files = video analyses
  const videosAnalyzed = analyses.filter(a => a.type === 'video').length;

  // Reports = analyses that have a PDF generated
  const reportsGenerated = analyses.filter(a => a.hasPdf === true).length;

  // Active = currently processing or pending
  const activeProjects = analyses.filter(
    a => a.status === 'pending' || a.status === 'processing'
  ).length;

  // ── Show placeholder while loading ───────────────────────────
  const display = (value: number) => loading ? '...' : String(value);

  const stats = [
    { icon: FileText,  value: display(totalTranscriptions), label: t('totalTranscriptions'), change: '' },
    { icon: Video,     value: display(videosAnalyzed),       label: t('videosAnalyzed'),       change: '' },
    { icon: BarChart3, value: display(reportsGenerated),     label: t('reportsGenerated'),     change: '' },
    { icon: Briefcase, value: display(activeProjects),       label: t('activeProjects'),       change: '' },
  ];

  return (
    <div style={{ display: 'flex', gap: 20, marginBottom: 32 }}>
      {stats.map((s, index) => (
        <ClientStatCard key={index} {...s} />
      ))}
    </div>
  );
}
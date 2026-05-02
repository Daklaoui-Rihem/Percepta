import { useState, useEffect } from 'react';
import { useTranslation } from '../context/TranslationContext';
import { useNotification } from '../context/NotificationContext';
import DashboardTemplate from '../components/Templates/DashboardTemplate';
import { dashboardApi } from '../services/api';
import type { AnalysisRecord } from '../services/api';
import { FileAudio, FileVideo, Filter, Search, Loader2 } from 'lucide-react';
import ActivityTypeBadge from '../components/Molecules/ActivityTypeBadge';

export default function AnalysesPage() {
  const { t } = useTranslation();
  const { showNotification } = useNotification();
  const [activePage, setActivePage] = useState('Analyses');
  const [analyses, setAnalyses] = useState<AnalysisRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const data = await dashboardApi.getHistory({
        type: typeFilter || undefined,
        status: statusFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      // the api currently might not fully populate userId if missing in schema
      setAnalyses(data);
    } catch (err) {
      showNotification('error', t('failedToLoadAnalyses') || 'Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [typeFilter, statusFilter, dateFrom, dateTo]);

  return (
    <DashboardTemplate active={activePage} onNavigate={setActivePage}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h2 style={{ color: '#1a3a6b', margin: 0 }}>{t('analysesHistory') || 'Historique des Analyses'}</h2>
      </div>

      {/* Filters Section */}
      <div style={{ 
        background: 'white', padding: '20px', borderRadius: '12px', 
        marginBottom: '24px', display: 'flex', gap: '16px', flexWrap: 'wrap',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Filter size={18} color="#64748b" />
          <span style={{ fontWeight: 500, color: '#334155' }}>Filtres:</span>
        </div>
        
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} 
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}>
          <option value="">Tous les types</option>
          <option value="audio">Audio</option>
          <option value="video">Vidéo</option>
        </select>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}>
          <option value="">Tous les statuts</option>
          <option value="pending">En attente</option>
          <option value="processing">En cours</option>
          <option value="done">Terminé</option>
          <option value="error">Erreur</option>
        </select>

        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
        <span style={{ alignSelf: 'center', color: '#64748b' }}>à</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }} />
      </div>

      {/* Table Section */}
      <div style={{ background: 'white', borderRadius: 12, padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        {loading ? (
           <div style={{ display: 'flex', justifyContent: 'center', padding: '40px 0' }}>
             <Loader2 size={32} color="#3b82f6" className="spin-animation" />
           </div>
        ) : analyses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
            Aucune analyse trouvée avec ces filtres.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Fichier</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Type</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Statut</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Date</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', color: '#64748b', fontWeight: 600 }}>Utilisateur</th>
              </tr>
            </thead>
            <tbody>
              {analyses.map(analysis => (
                <tr key={analysis._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '16px', fontWeight: 500, color: '#1e293b' }}>
                    {analysis.originalName}
                  </td>
                  <td style={{ padding: '16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {analysis.type === 'audio' ? <FileAudio size={18} color="#8b5cf6" /> : <FileVideo size={18} color="#ef4444" />}
                      <span style={{ color: '#475569', textTransform: 'capitalize' }}>{analysis.type}</span>
                    </div>
                  </td>
                  <td style={{ padding: '16px' }}>
                    <ActivityTypeBadge type={
                      analysis.status === 'done' ? 'analysis' :
                      analysis.status === 'error' ? 'error' :
                      analysis.status === 'processing' ? 'report' : 'upload'
                    } overrideLabel={analysis.status} />
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>
                    {new Date(analysis.createdAt).toLocaleString()}
                  </td>
                  <td style={{ padding: '16px', color: '#475569' }}>
                    {/* @ts-ignore */}
                    {analysis.userId?.name || 'Inconnu'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <style>{`
        .spin-animation {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </DashboardTemplate>
  );
}
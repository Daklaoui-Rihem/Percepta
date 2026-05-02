import React, { createContext, useContext, useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info';

interface Notification {
  id: string;
  message: string;
  type: NotificationType;
}

interface NotificationContextType {
  addNotification: (message: string, type: NotificationType) => void;
  removeNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  const addNotification = (message: string, type: NotificationType) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 5);
    setNotifications(prev => [...prev, { id, message, type }]);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      removeNotification(id);
    }, 5000);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  useEffect(() => {
    // Setup SSE connection using dynamic base URL
    const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    const eventSource = new EventSource(`${baseUrl}/notifications/stream`);

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'JOB_COMPLETED') {
          addNotification(data.message || 'Le traitement est terminé avec succès !', 'success');
          // Dispatch a custom event so other components (like tables) can refresh
          window.dispatchEvent(new CustomEvent('percepta:job_completed', { detail: data }));
        } else if (data.type === 'JOB_FAILED') {
          addNotification(data.message || 'Une erreur est survenue lors du traitement.', 'error');
          window.dispatchEvent(new CustomEvent('percepta:job_failed', { detail: data }));
        }
      } catch (err) {
        console.error('Failed to parse SSE message', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      // It will auto-reconnect
    };

    return () => {
      eventSource.close();
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ addNotification, removeNotification }}>
      {children}
      {/* Toast Container */}
      <div style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px'
      }}>
        {notifications.map(n => (
          <div key={n.id} style={{
            background: 'white',
            borderLeft: `4px solid ${n.type === 'success' ? '#10b981' : n.type === 'error' ? '#ef4444' : '#3b82f6'}`,
            padding: '12px 16px',
            borderRadius: '6px',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            minWidth: '300px',
            animation: 'slideIn 0.3s ease-out'
          }}>
            {n.type === 'success' && <CheckCircle size={20} color="#10b981" />}
            {n.type === 'error' && <AlertCircle size={20} color="#ef4444" />}
            {n.type === 'info' && <Info size={20} color="#3b82f6" />}
            
            <span style={{ flex: 1, fontSize: '14px', color: '#374151' }}>{n.message}</span>
            
            <button 
              onClick={() => removeNotification(n.id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0 }}
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      `}</style>
    </NotificationContext.Provider>
  );
};

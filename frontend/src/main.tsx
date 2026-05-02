import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { TranslationProvider } from './context/TranslationContext'
import { NotificationProvider } from './context/NotificationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TranslationProvider> 
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </TranslationProvider>
  </StrictMode>,
)
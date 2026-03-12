import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'
import { TranslationProvider } from './context/TranslationContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>  <TranslationProvider> 
    <App /> </TranslationProvider>
  </StrictMode>,
)
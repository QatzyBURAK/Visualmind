import React from 'react'
import ReactDOM from 'react-dom/client'
import { Toaster } from 'react-hot-toast'
import App from './App.tsx'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="bottom-right"
      toastOptions={{
        duration: 3500,
        style: {
          background: '#1a1a24',
          color: '#f1f5f9',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '12px',
          fontSize: '13px',
          fontFamily: 'Inter, -apple-system, sans-serif',
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          padding: '12px 16px',
        },
        success: {
          iconTheme: { primary: '#10b981', secondary: '#1a1a24' },
        },
        error: {
          iconTheme: { primary: '#dc2626', secondary: '#1a1a24' },
          duration: 5000,
        },
      }}
    />
  </React.StrictMode>,
)
